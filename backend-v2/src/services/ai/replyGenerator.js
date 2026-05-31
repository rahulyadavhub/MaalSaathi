// ============================================================
// src/services/ai/replyGenerator.js
// Generate conversational replies (OpenAI + smart fallback)
// ============================================================

'use strict';

const ai = require('./openaiClient');          // ← CHANGED: was geminiClient
const { buildReplyPrompt } = require('./prompts');
const { createLogger } = require('../../utils/logger');
const log = createLogger('replyGen');

async function generate(ctx) {
    if (!ai.isConfigured()) return fallback(ctx);

    try {
        const prompt = buildReplyPrompt({
            userName:    ctx.userName,
            userTruck:   ctx.userTruck,
            activeTrip:  ctx.activeTrip,
            userMessage: ctx.userMessage,
        });
        const text = await ai.generate(prompt, { temperature: 0.7, maxTokens: 400 });
        if (!text) throw new Error('Empty reply');
        return text;
    } catch (err) {
        log.warn(`OpenAI failed: ${err.message?.substring(0, 80)} — using fallback`);
        return fallback(ctx);
    }
}

// ──────────────────────────────────────────────────────────
// Smart hardcoded fallback (when OpenAI quota/error)
// ──────────────────────────────────────────────────────────
function fallback({ userName, userMessage }) {
    const m = (userMessage || '').toLowerCase().trim();
    const b = userName || 'Bhai';

    if (/^(hi+|hello+|hey+|namaste|ram\s*ram|salaam|good\s*(morning|evening|night))\b/.test(m))
        return `Namaste ${b}! 🙏 MaalSaathi hazir hai 🚛\n\n• Trip: "Mumbai se Pune 12 ton 28000"\n• Kharcha: "diesel 4500"\n• Multi: "diesel 5k, toll 200, food 150"\n• Hisaab: "aaj kitna kamaya"`;

    if (/kaisa|kaise\s*ho|kya\s*chal|haal/.test(m))
        return `Badhiya hun ${b}! 🚛 Tum batao — trip pe ho ya hisaab dekhna hai?`;

    if (/help|madad|features|guide/.test(m))
        return `${b} bhai ye sab kar sakta hun 🚛\n\n🛣️ Trip log\n💸 Kharcha track\n📊 P&L\n💡 Sawaal\n\nSeedha likh do!`;

    if (/tyre|tayar|puncture/.test(m))
        return `Tyre 🛞 — 60-80k km ya 2-3 saal mein change ${b}. Tread 1.6mm se kam = turant badlo.`;

    if (/gst|tax/.test(m))
        return `GST on Transport 💰\n• 5% (no ITC) — most common\n• 12% (with ITC)\nCA se confirm karo ${b}.`;

    if (/rc|fitness|permit|puc|insurance/.test(m))
        return `Docs 📄\n• RC: 15 saal | Fitness: 2 saal\n• PUC: 6 mahine | Insurance: yearly\n• National permit: inter-state`;

    if (/fastag|fast\s*tag/.test(m))
        return `FASTag 💳 — mandatory ${b}. Balance ₹100 se kam = double toll! Paytm/HDFC/ICICI se recharge.`;

    if (/overload|challan|fine/.test(m))
        return `⚠️ Overloading fine: ₹20k-40k + ₹2k/extra ton. Permit limit ke andar raho ${b}.`;

    if (/accident|breakdown|kharab|engine\s*band/.test(m))
        return `⚠️ ${b} pehle safe ho!\n1. Hazard lights ON\n2. Triangle 50m peeche\n3. Insurance helpline call\n4. Photos lo`;

    const def = [
        `Haan ${b} 🚛 Bol kya kaam hai!`,
        `Sun raha hun ${b} 💪 Trip, kharcha, ya sawaal — kya chahiye?`,
        `Bata ${b} 🚛 Seedha likh do — samajh lunga!`,
    ];
    return def[Math.floor(Math.random() * def.length)];
}

module.exports = { generate, fallback };
