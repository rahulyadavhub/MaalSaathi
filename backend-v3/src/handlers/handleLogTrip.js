'use strict';

const tripService = require('../services/trip/tripService');
const convManager = require('../services/conversation/conversationManager');
const MESSAGES    = require('../constants/messages');
const { formatAmount } = require('../services/parser/amountParser');

async function handle(parsedTrip, user, conv, phone, sendMessage) {
    const ctx = { user, conv, intent: 'log_trip' };

    if (!parsedTrip || !parsedTrip.origin || !parsedTrip.destination) {
        await sendMessage(phone, MESSAGES.TRIP_FORMAT_HELP(),
            { ...ctx, action: 'parse_failed' });
        return;
    }

    const active = await tripService.getActiveTrip(user._id);
    if (active) {
        await sendMessage(phone,
            MESSAGES.ALREADY_ACTIVE_TRIP(
                active.origin, active.destination,
                (active.freightAmount || 0).toLocaleString('en-IN')
            ),
            { ...ctx, action: 'blocked_active_trip', tripId: active._id }
        );
        return;
    }

    if (!parsedTrip.freight || parsedTrip.freight <= 0) {
        const draft = await tripService.createDraft(user._id, parsedTrip);
        await convManager.setState(conv, convManager.STATES.AWAITING_FREIGHT,
            { tripId: draft._id.toString() });
        await sendMessage(phone,
            MESSAGES.ASK_FREIGHT(
                parsedTrip.origin, parsedTrip.destination,
                parsedTrip.cargoWeightTons, parsedTrip.cargoType
            ),
            { ...ctx, action: 'draft_created', tripId: draft._id }
        );
        return;
    }

    const truckReg = user.trucks?.[0]?.registration || null;
    const pending  = await tripService.createPending(user._id, parsedTrip, truckReg);
    await convManager.setState(conv, convManager.STATES.AWAITING_TRIP_CONFIRMATION,
        { tripId: pending._id.toString() });

    const lines = [
        `Trip record karna hai? ✅\n`,
        `📍 *Route:* ${parsedTrip.origin} → ${parsedTrip.destination}`,
        parsedTrip.cargoWeightTons ? `⚖️ *Wajan:* ${parsedTrip.cargoWeightTons} ton` : null,
        parsedTrip.cargoType       ? `📦 *Maal:* ${parsedTrip.cargoType}` : null,
        `💰 *Freight:* ${formatAmount(parsedTrip.freight)}`,
        parsedTrip.advance         ? `💵 *Advance:* ${formatAmount(parsedTrip.advance)}` : null,
        `\n*"Haan"* — save ✅   *"Nahi"* — cancel ❌`,
    ].filter(Boolean).join('\n');

    await sendMessage(phone, lines, { ...ctx, action: 'pending_created', tripId: pending._id });
}

// AWAITING_FREIGHT state mein freight input handle
async function handleFreightInput(message, user, conv, phone, sendMessage) {
    const { parseAmount, isValidAmount } = require('../services/parser/amountParser');
    const ctx = { user, conv, intent: 'log_trip' };
    const amount = parseAmount(message);

    if (!isValidAmount(amount, { min: 100 })) {
        await sendMessage(phone, MESSAGES.FREIGHT_INVALID(),
            { ...ctx, action: 'freight_invalid' });
        return;
    }

    const tripId = conv.context?.tripId;
    if (!tripId) { await convManager.reset(conv); return; }

    const trip = await tripService.setFreightAndPromote(tripId, amount);
    await convManager.setState(conv, convManager.STATES.AWAITING_TRIP_CONFIRMATION, { tripId });

    await sendMessage(phone,
        `Trip record karna hai? ✅\n\n` +
        `📍 *${trip.origin} → ${trip.destination}*\n` +
        `${trip.cargoWeightTons ? `⚖️ ${trip.cargoWeightTons} ton\n` : ''}` +
        `💰 *Freight:* ${formatAmount(amount)}\n\n` +
        `*"Haan"* — save ✅   *"Nahi"* — cancel ❌`,
        { ...ctx, action: 'pending_promoted', tripId: trip._id }
    );
}

// AWAITING_TRIP_CONFIRMATION mein haan/nahi handle
async function handleConfirmation(message, user, conv, phone, sendMessage) {
    const msg = message.trim().toLowerCase();
    const YES = /^(haan|han|haa|ha|yes|y|ok|okay|sahi|bilkul|confirm|save|done|kar\s*do)$/i;
    const NO  = /^(nahi|no|n|cancel|mat|na|galat|wrong|chod\s*do)$/i;
    const ctx = { user, conv, intent: 'log_trip' };

    const tripId = conv.context?.tripId;
    if (!tripId) { await convManager.reset(conv); return; }

    if (YES.test(msg)) {
        const trip = await tripService.confirmTrip(tripId);
        await convManager.setActiveTrip(conv, trip._id);
        await convManager.reset(conv);
        await sendMessage(phone,
            `✅ *Trip save ho gaya!* 🚛\n\n` +
            `📍 ${trip.origin} → ${trip.destination}\n` +
            `💰 Freight: ${formatAmount(trip.freightAmount)}\n\n` +
            `Kharcha hote hi batao 💸\n*"trip complete"* likhna mat bhoolna 🏁`,
            { ...ctx, action: 'confirmed', tripId: trip._id }
        );
    } else if (NO.test(msg)) {
        await tripService.cancelTrip(tripId);
        await convManager.reset(conv);
        await sendMessage(phone, MESSAGES.TRIP_CANCELLED(),
            { ...ctx, action: 'cancelled', tripId });
    } else {
        await sendMessage(phone, MESSAGES.CONFIRM_PROMPT(),
            { ...ctx, action: 'confirm_reprompt' });
    }
}

module.exports = { handle, handleFreightInput, handleConfirmation };
