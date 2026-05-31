// ============================================================
// src/controllers/webhookController.js
// AI-powered routing: regex fast path → AI classifier → handlers
// Parsers extract entities (numeric ground truth, anti-hallucination)
// ============================================================

'use strict';

const User    = require('../models/User');
const Message = require('../models/Message');

const { extractPayload } = require('../services/whatsapp/receiver');
const { sendMessage }    = require('../services/whatsapp/sender');
const convManager        = require('../services/conversation/conversationManager');
const tripService        = require('../services/trip/tripService');

const rateLimit         = require('../middleware/rateLimit');
const intentClassifier  = require('../services/ai/intentClassifier');
const { INTENT }        = require('../constants/intents');

const { parseTrip }       = require('../services/parser/tripParser');
const { parseExpenses, parseSingleExpense } = require('../services/parser/expenseParser');
const { CATEGORY } = require('../constants/expenseCategories');

const onboardingHandler   = require('../handlers/handleOnboarding');
const tripHandler         = require('../handlers/handleLogTrip');
const expenseHandler      = require('../handlers/handleLogExpense');
const completeHandler     = require('../handlers/handleTripComplete');
const showTripsHandler    = require('../handlers/handleShowTrips');
const profitHandler       = require('../handlers/handleProfit');
const smallTalkHandler    = require('../handlers/handleSmallTalk');

const MESSAGES = require('../constants/messages');
const { env }  = require('../config/env');
const { createLogger } = require('../utils/logger');
const log = createLogger('webhook');

// ──────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────
async function handleIncoming(req, res) {
    res.sendStatus(200);

    const started = Date.now();
    const payload = extractPayload(req.body);
    if (!payload) return;

    const { phone, text, name, msgId, msgType } = payload;
    if (!phone || !text) return;

    try {
        if (msgId && await Message.wasProcessed(msgId)) {
            log.debug(`Duplicate msg ignored: ${msgId}`);
            return;
        }

        if (msgType === 'audio') {
            await sendMessage(phone, MESSAGES.VOICE_NOT_SUPPORTED());
            return;
        }
        if (['image', 'document', 'video', 'sticker'].includes(msgType)) {
            await sendMessage(phone, MESSAGES.MEDIA_NOT_SUPPORTED());
            return;
        }

        if (rateLimit.check(phone).limited) {
            await sendMessage(phone, MESSAGES.RATE_LIMITED(env.RATE_LIMIT_PER_MIN));
            return;
        }

        let user = await User.findOneAndUpdate(
            { phone },
            {
                $setOnInsert: { phone, name: name || 'Friend' },
                $set:         { lastActiveAt: new Date() },
            },
            { new: true, upsert: true }
        );
        if (name && name !== 'Friend' && user.name === 'Friend') {
            user.name = name;
            await user.save();
        }

        await Message.logIncoming({ userId: user._id, phone, text, type: msgType, whatsappMessageId: msgId });

        const conv = await convManager.get(user._id, phone);
        await convManager.addUserMessage(conv, text);

        // ── Onboarding takes precedence over AI
        if (!user.onboardingComplete) {
            await onboardingHandler.handle(user, conv, text, phone);
            return;
        }

        // ── Classify (regex fast path or AI)
        const activeTrip = await tripService.getActiveTrip(user._id);
        const cls = await intentClassifier.classify(text, {
            userName:  user.name,
            activeTrip,
            history:   conv.history,
            convState: conv.state,
        });

        log.info(`[${cls.source}] ${cls.intent} (conf=${cls.confidence?.toFixed(2)})`);

        // Update incoming Message with classified intent (analytics)
        if (msgId) {
            Message.findOneAndUpdate(
                { whatsappMessageId: msgId, direction: 'incoming' },
                { intent: cls.intent }
            ).catch(() => {});
        }

        // ── Multi-step flow handling (freight input, confirmation)
        if (convManager.isAwaitingFreight(conv) || convManager.isAwaitingConfirmation(conv)) {
            const handled = await handleMultiStep(cls, text, user, conv, phone);
            if (handled) return;
        }

        // ── Main intent routing
        await routeIntent(cls, text, user, conv, phone);

    } catch (err) {
        log.error(`handleIncoming failed: ${err.message}`, {
            phone: phone?.slice(-4),
            stack: err.stack?.split('\n').slice(0, 3),
        });
    } finally {
        const ms = Date.now() - started;
        if (ms > 3000) log.warn(`Slow processing: ${ms}ms`);
    }
}

// ──────────────────────────────────────────────────────────
// Multi-step flow router
// User is awaiting_freight or awaiting_confirmation.
// Either they answer the awaited step, OR they "escape" with a new intent.
// ──────────────────────────────────────────────────────────
async function handleMultiStep(cls, text, user, conv, phone) {
    const { intent, entities } = cls;

    // Escape intents — abandon current flow
    if (intent === INTENT.COMPLETE_TRIP) {
        await convManager.reset(conv);
        await completeHandler.handle(user, conv, phone, sendMessage);
        return true;
    }
    if (intent === INTENT.QUERY_PROFIT) {
        await convManager.reset(conv);
        await profitHandler.handle(entities?.period || 'today', user, phone, sendMessage);
        return true;
    }
    if (intent === INTENT.SHOW_TRIPS) {
        await convManager.reset(conv);
        await showTripsHandler.handle(user, phone, sendMessage);
        return true;
    }

    // New trip attempt — cancel old open, start fresh
    if (intent === INTENT.LOG_TRIP) {
        const parsed = mergeTripEntities(text, entities);
        if (parsed.origin && parsed.destination) {
            await tripService.cancelAllOpen(user._id);
            await convManager.reset(conv);
            await tripHandler.handle(parsed, user, conv, phone, sendMessage);
            return true;
        }
    }

    // Explicit expense (must have named category, not just a number — protects freight flow)
    if (intent === INTENT.LOG_EXPENSE && hasNamedExpenseCategory(text, entities)) {
        await convManager.reset(conv);
        await routeIntent(cls, text, user, conv, phone);
        return true;
    }
    if (intent === INTENT.LOG_MULTI_EXPENSE && hasNamedExpenseCategory(text, entities)) {
        await convManager.reset(conv);
        await routeIntent(cls, text, user, conv, phone);
        return true;
    }

    // Otherwise treat as the awaited answer
    if (convManager.isAwaitingFreight(conv)) {
        await tripHandler.handleFreightInput(text, user, conv, phone, sendMessage);
        return true;
    }
    if (convManager.isAwaitingConfirmation(conv)) {
        await tripHandler.handleConfirmation(text, user, conv, phone, sendMessage);
        return true;
    }
    return false;
}

// ──────────────────────────────────────────────────────────
// Main intent routing
// ──────────────────────────────────────────────────────────
async function routeIntent(cls, text, user, conv, phone) {
    const { intent, entities } = cls;

    switch (intent) {
        case INTENT.COMPLETE_TRIP:
            await completeHandler.handle(user, conv, phone, sendMessage);
            return;

        case INTENT.SHOW_TRIPS:
            await showTripsHandler.handle(user, phone, sendMessage);
            return;

        case INTENT.QUERY_PROFIT:
            await profitHandler.handle(entities?.period || 'today', user, phone, sendMessage);
            return;

        case INTENT.LOG_TRIP: {
            const parsed = mergeTripEntities(text, entities);
            if (parsed.origin && parsed.destination) {
                await tripHandler.handle(parsed, user, conv, phone, sendMessage);
            } else {
                await sendMessage(phone, MESSAGES.TRIP_FORMAT_HELP(),
                    { user, conv, intent: 'log_trip', action: 'parse_failed' });
            }
            return;
        }

        case INTENT.LOG_EXPENSE: {
            const parsed = mergeSingleExpenseEntities(text, entities);
            await expenseHandler.handleSingle(parsed, user, phone, sendMessage, text);
            return;
        }

        case INTENT.LOG_MULTI_EXPENSE: {
            const expenses = mergeMultiExpenseEntities(text, entities);
            await expenseHandler.handleMulti(expenses, user, phone, sendMessage, text);
            return;
        }

        case INTENT.CANCEL_TRIP: {
            const active = await tripService.getActiveTrip(user._id);
            if (active) {
                await tripService.cancelTrip(active._id);
                await sendMessage(phone, `🚫 Trip cancel ho gayi: ${active.origin} → ${active.destination}`,
                    { user, conv, intent: 'cancel_trip', action: 'cancelled', tripId: active._id });
            } else {
                await sendMessage(phone, MESSAGES.NO_ACTIVE_TRIP(),
                    { user, conv, intent: 'cancel_trip', action: 'no_active' });
            }
            return;
        }

        case INTENT.GREETING:
        case INTENT.HELP:
        case INTENT.KNOWLEDGE_QUESTION:
        case INTENT.SMALL_TALK:
        case INTENT.YES:   // stray yes outside a flow → just chat
        case INTENT.NO:    // stray no outside a flow → just chat
        case INTENT.UNKNOWN:
        default:
            await smallTalkHandler.handle(user, conv, text, phone, sendMessage);
            return;
    }
}

// ──────────────────────────────────────────────────────────
// Entity merging: text strings → AI preferred (contextual)
//                 numbers      → parser preferred (anti-hallucination)
// ──────────────────────────────────────────────────────────
function mergeTripEntities(text, ai = {}) {
    const p = parseTrip(text) || {};
    return {
        origin:          ai.origin          || p.origin          || null,
        destination:     ai.destination     || p.destination     || null,
        cargoType:       ai.cargo_type      || p.cargoType       || null,
        cargoWeightTons: p.cargoWeightTons  ?? ai.cargo_weight_tons ?? null,
        freight:         p.freight          ?? ai.freight        ?? null,
        advance:         p.advance          || ai.advance        || 0,
    };
}

function mergeSingleExpenseEntities(text, ai = {}) {
    const p = parseSingleExpense(text) || {};
    return {
        category: ai.category || p.category || CATEGORY.OTHER,
        amount:   p.amount    ?? ai.amount  ?? 0,    // parser numeric ground truth
        note:     ai.note     || null,
    };
}

function mergeMultiExpenseEntities(text, ai = {}) {
    if (Array.isArray(ai.expenses) && ai.expenses.length > 0) {
        const parsed = ai.expenses
            .map(e => ({ category: e.category || CATEGORY.OTHER, amount: Number(e.amount) || 0 }))
            .filter(e => e.amount > 0);
        if (parsed.length > 0) return parsed;
    }
    return parseExpenses(text);
}

// Does message contain a named expense category? Protects freight flow.
function hasNamedExpenseCategory(text, ai = {}) {
    if (ai.category && ai.category !== CATEGORY.OTHER) return true;
    if (Array.isArray(ai.expenses) && ai.expenses.some(e => e.category && e.category !== CATEGORY.OTHER)) return true;
    // Last resort — re-parse
    const p = parseSingleExpense(text);
    return p?.category && p.category !== CATEGORY.OTHER;
}

module.exports = { handleIncoming };
