// ============================================================
// src/services/parser/expenseParser.js
// Multi-expense parser — handles all separator styles
//
// Input examples it handles:
//   "diesel 4500"
//   "diesel 4500, toll 200, food 150"
//   "diesel 5000\ntoll 1200\ndriver 200\nparking 150"
//   "toll 5k aur driver 1500 our khana 255 our tyre 2400"
//   "diesel=15k TOLL=2K Fine=2K"
//
// Returns array of { category, amount, rawText }
// ============================================================

'use strict';

const { parseAmount } = require('./amountParser');
const { detectCategory, isExpenseText } = require('./categoryDetector');
const { CATEGORY } = require('../../constants/expenseCategories');

// ──────────────────────────────────────────────────────────
// Split message into expense "chunks"
// Splits by: comma, semicolon, newline, "aur"/"our"/"or", "plus", "&"
// ──────────────────────────────────────────────────────────
function splitIntoChunks(message) {
    if (!message) return [];
    return String(message)
        .split(/[,;\n।]|\baur\b|\bour\b|\bor\b|\bplus\b|\btatha\b|&/i)
        .map(c => c.trim())
        .filter(c => c.length > 0);
}

// ──────────────────────────────────────────────────────────
// Parse a SINGLE chunk → expense object (or null)
// ──────────────────────────────────────────────────────────
function parseChunk(chunk) {
    if (!chunk || typeof chunk !== 'string') return null;
    const text = chunk.trim();
    if (!text) return null;

    const numMatch = text.match(/(\d+(?:\.\d+)?)\s*(k|K|hazaar|hajar|hazar|thousand|lakh|lac|l|cr|crore)?\b/);
    if (!numMatch) return null;

    const amount = parseAmount(numMatch[0]);
    if (amount <= 0) return null;

    const category = detectCategory(text);

    return {
        category,
        amount,
        rawText: text.substring(0, 200),
    };
}

// ──────────────────────────────────────────────────────────
// Main: parse message → array of expenses
// ──────────────────────────────────────────────────────────
function parseExpenses(message) {
    if (!message || typeof message !== 'string') return [];

    const chunks = splitIntoChunks(message);
    if (chunks.length === 0) return [];

    const expenses = [];
    const seen = new Set();

    for (const chunk of chunks) {
        const parsed = parseChunk(chunk);
        if (!parsed) continue;

        const key = `${parsed.category}-${parsed.amount}`;
        if (seen.has(key)) continue;
        seen.add(key);

        expenses.push(parsed);
    }

    return expenses;
}

// ──────────────────────────────────────────────────────────
// Quick decision: is this a multi-expense message?
//
// FIXED (Bug 8):
//   Pehle: parseExpenses(message).length >= 2  ← bina category bhi accept
//   Ab:    (a) message mein expense keyword ho
//          (b) kam se kam 1 chunk mein known category ho (not 'other')
//   Ye "8000 mila, 2000 baki" jaise profit-talk ko expense banne se rokta hai.
// ──────────────────────────────────────────────────────────
function isMultiExpense(message) {
    if (!message || !isExpenseText(message)) return false;

    const parsed = parseExpenses(message);
    if (parsed.length < 2) return false;

    const namedCount = parsed.filter(e => e.category !== CATEGORY.OTHER).length;
    return namedCount >= 1;
}

// ──────────────────────────────────────────────────────────
// Quick decision: is this a single expense message?
// ──────────────────────────────────────────────────────────
function isSingleExpense(message) {
    if (!message) return false;
    const text = String(message);
    if (!/\d/.test(text)) return false;
    return isExpenseText(text);
}

// ──────────────────────────────────────────────────────────
// Parse ONE expense from message (first valid one)
// ──────────────────────────────────────────────────────────
function parseSingleExpense(message) {
    if (!message) return null;

    const single = parseChunk(message);
    if (single && single.amount > 0) return single;

    const all = parseExpenses(message);
    return all[0] || null;
}

module.exports = {
    parseExpenses,
    parseSingleExpense,
    parseChunk,
    splitIntoChunks,
    isMultiExpense,
    isSingleExpense,
};
