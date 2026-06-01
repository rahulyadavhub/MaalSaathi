// ============================================================
// src/services/support/faqResolver.js
// Auto-resolve common issues — Level 1 support
// ============================================================

'use strict';

const { createLogger } = require('../../utils/logger');
const log = createLogger('faqResolver');

const FAQS = {
    '1': {
        keywords: ['trip', 'save', 'nahi', 'log'],
        answer:
            `🛣️ Trip save karne ka sahi format:\n\n` +
            `"Mumbai se Pune 10 ton cement 28000"\n\n` +
            `Route + Weight + Freight — teeno zaroori hain ✅\n` +
            `Example: "Delhi se Jaipur 8 ton 22000"`,
    },
    '2': {
        keywords: ['expense', 'kharcha', 'category', 'galat'],
        answer:
            `💸 Expense sahi category mein log karo:\n\n` +
            `• Diesel: "diesel 4500"\n` +
            `• Toll: "toll 200 bhara"\n` +
            `• Khana: "khana 150"\n` +
            `• Repair: "mechanic 800"\n\n` +
            `Galat hua toh dobara sahi type karke bhejo ✅`,
    },
    '3': {
        keywords: ['profit', 'pl', 'hisaab', 'nahi', 'dikh'],
        answer:
            `📊 P&L dekhne ke liye likho:\n\n` +
            `• "Aaj kitna kamaya"\n` +
            `• "Is hafte ka hisaab"\n` +
            `• "Is mahine ka profit"\n\n` +
            `Trip active hona chahiye + kuch expenses logged honi chahiye ✅`,
    },
    '4': {
        keywords: ['payment', 'razorpay', 'fail', 'otp'],
        answer:
            `💳 Payment issue ke liye:\n\n` +
            `1. Transaction ID / UTR number bhejo\n` +
            `2. Screenshot bhejo support ko\n\n` +
            `Team 24 ghante mein verify karegi ✅\n` +
            `Ya "upgrade" dobara likhke try karo`,
    },
};

// Try to auto-resolve from FAQ
function resolve(issue) {
    if (!issue) return null;
    const lower = issue.toLowerCase();

    for (const [key, faq] of Object.entries(FAQS)) {
        const matches = faq.keywords.filter(k => lower.includes(k));
        if (matches.length >= 2) {
            log.info(`FAQ auto-resolved: key=${key}`);
            return faq.answer;
        }
    }

    return null; // could not auto-resolve → escalate
}

// Get FAQ by number (1-4)
function getByNumber(num) {
    return FAQS[String(num)]?.answer || null;
}

module.exports = { resolve, getByNumber, FAQS };
