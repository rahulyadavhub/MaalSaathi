// ============================================================
// src/constants/messages.js
// Reusable WhatsApp reply templates (Hinglish)
//
// Sab user-facing strings ek jagah — easy to edit, translate, or A/B test
// ============================================================

'use strict';

const MESSAGES = {

    // ─── Onboarding ──────────────────────────────────────
    WELCOME: () =>
        `🙏 *Namaste!* Main hun *MaalSaathi* — aapka transport business ka WhatsApp assistant!\n\n` +
        `Main help karta hun:\n` +
        `🚛 Trip log karna\n` +
        `💸 Kharcha track karna\n` +
        `📊 P&L reports\n` +
        `💡 Truck / business sawaalon ke jawab\n\n` +
        `Shuru karte hain — *aapka naam kya hai?*`,

    NAME_TOO_SHORT: () =>
        `Naam thoda clearly likho bhai 😊`,

    ASK_TRUCK: (name) =>
        `${name} ji, *welcome!* 🎉\n\n` +
        `Apne truck ka *registration number* batao\n` +
        `_(Jaise: MH04AB1234)_\n\n` +
        `Abhi nahi pata → *"skip"* likho`,

    ONBOARDING_DONE: (name) =>
        `✅ *Sab set hai ${name} ji!* 🎉\n\n` +
        `Ab kuch bhi likho:\n\n` +
        `🚛 *Trip:* "Mumbai se Pune 12 ton cement 28000"\n` +
        `💸 *Kharcha:* "diesel 4500" ya "diesel 5k, toll 2k"\n` +
        `📊 *Hisaab:* "aaj kitna kamaya"\n` +
        `💡 *Sawaal:* "GST kitna lagta"\n\n` +
        `Main hamesha yahan hun! 💪`,

    // ─── Errors ──────────────────────────────────────────
    GENERIC_ERROR: () =>
        `Thodi technical gadbad ho gayi bhai. 1-2 min mein dobara try karo 🙏`,

    RATE_LIMITED: (limit) =>
        `⏳ Bhai thoda slow karo! Ek minute mein max ${limit} messages process ho sakte hain.`,

    VOICE_NOT_SUPPORTED: () =>
        `🎤 Voice message mila! Abhi voice support nahi hai bhai.\n\n` +
        `Text mein likh do:\n*"diesel 4500"* ya *"Mumbai se Pune 12 ton 28000"*`,

    MEDIA_NOT_SUPPORTED: () =>
        `📎 Sirf text messages process ho sakte hain abhi. 🚛`,

    // ─── Trip messages ───────────────────────────────────
    TRIP_FORMAT_HELP: () =>
        `Bhai trip ka format thoda aur clear bhejo 🚛\n\n` +
        `*"Mumbai se Pune 12 ton cement 28000"*\n\n` +
        `📍 Kahan se → Kahan\n` +
        `⚖️ Kitna maal (ton)\n` +
        `📦 Kya maal (optional)\n` +
        `💰 Freight kitna mila`,

    ASK_FREIGHT: (origin, destination, weight, cargo) =>
        `Route mil gayi ✅\n\n` +
        `📍 *${origin} → ${destination}*\n` +
        `${weight ? `⚖️ ${weight} ton\n` : ''}` +
        `${cargo ? `📦 ${cargo}\n` : ''}\n` +
        `💰 *Freight kitna mila? Sirf amount bhejo*\n` +
        `_(Jaise: 28000 ya 30k)_`,

    FREIGHT_INVALID: () =>
        `Bhai sirf freight amount bhejo — jaise *28000* ya *30k* 💰`,

    ALREADY_ACTIVE_TRIP: (origin, destination, freight) =>
        `⚠️ Ek trip already active hai bhai:\n\n` +
        `📍 *${origin} → ${destination}*\n` +
        `💰 Freight: ₹${freight}\n\n` +
        `Pehle *"trip complete"* bhejo, phir nayi trip log karo. 🚛`,

    TRIP_CANCELLED: () =>
        `Theek hai, cancel kar diya 👍\nJab ready ho tab dobara batao!`,

    CONFIRM_PROMPT: () =>
        `*"Haan"* — save ✅   *"Nahi"* — cancel ❌\n\nYa koi aur kaam ho to seedha likh do, main switch kar lunga.`,

    NO_ACTIVE_TRIP: () =>
        `Koi active trip nahi mili bhai. 🚛\n\n` +
        `Pehle trip shuru karo:\n*"Mumbai se Pune 12 ton cement 28000"*`,
};

module.exports = MESSAGES;
