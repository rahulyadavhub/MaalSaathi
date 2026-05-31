// ============================================================
// src/services/parser/amountParser.js
// Convert any Indian-style amount string to number
//
// Handles:
//   "4500"           → 4500
//   "4,500"          → 4500
//   "₹4500"          → 4500
//   "5k" / "5K"      → 5000
//   "5 k" / "5 K"    → 5000
//   "2.5k"           → 2500
//   "5 hazaar"       → 5000
//   "ek hazaar"      → 1000
//   "paanch hazaar"  → 5000
//   "1 lakh" / "1L"  → 100000
//   "1.5 lac"        → 150000
//   "diesel 4500"    → 4500  (extracts from text)
//   "toll=5K"        → 5000  (ignores = sign)
// ============================================================

'use strict';

// ──────────────────────────────────────────────────────────
// Written Hindi/Hinglish numbers (voice-to-text common)
// ──────────────────────────────────────────────────────────
const WRITTEN_NUMBERS = Object.freeze({
    // Basic counts × 1000 (hazaar)
    'ek hazaar':       1000,   'ek hajar':       1000,
    'do hazaar':       2000,   'do hajar':       2000,    'dho hazaar': 2000,
    'teen hazaar':     3000,   'tin hazaar':     3000,    'teen hajar': 3000,
    'char hazaar':     4000,   'chaar hazaar':   4000,    'char hajar': 4000,
    'paanch hazaar':   5000,   'panch hazaar':   5000,    'paanch hajar': 5000,
    'chhe hazaar':     6000,   'che hazaar':     6000,    'chh hazaar': 6000,
    'saat hazaar':     7000,   'sat hazaar':     7000,
    'aath hazaar':     8000,   'aat hazaar':     8000,
    'nau hazaar':      9000,   'nav hazaar':     9000,
    'das hazaar':     10000,   'duss hazaar':   10000,    'dus hazaar': 10000,

    // Tens × 1000
    'gyarah hazaar':  11000,   'barah hazaar':  12000,
    'terah hazaar':   13000,   'chaudah hazaar':14000,
    'pandrah hazaar': 15000,   'solah hazaar':  16000,
    'satrah hazaar':  17000,   'atharah hazaar':18000,
    'unnis hazaar':   19000,   'bees hazaar':   20000,
    'pachees hazaar': 25000,   'tees hazaar':   30000,
    'paiintis hazaar':35000,   'chalees hazaar':40000,
    'pachaas hazaar': 50000,   'saath hazaar':  60000,
    'sattar hazaar':  70000,   'assi hazaar':   80000,
    'nabbe hazaar':   90000,

    // Lakhs
    'ek lakh':       100000,   'ek lac':       100000,
    'sava lakh':     125000,   'dedh lakh':    150000,
    'do lakh':       200000,   'dhai lakh':    250000,
    'teen lakh':     300000,   'char lakh':    400000,
    'paanch lakh':   500000,   'das lakh':    1000000,

    // Misc
    'adha lakh':      50000,   'paune lakh':    75000,
    'sava hazaar':     1250,   'dedh hazaar':   1500,
    'dhai hazaar':     2500,   'saade teen':    3500,
    'saade chaar':     4500,   'saade paanch':  5500,
});

// ──────────────────────────────────────────────────────────
// Multiplier suffixes
// ──────────────────────────────────────────────────────────
const MULTIPLIERS = Object.freeze({
    k:        1_000,
    hazaar:   1_000,
    hajar:    1_000,
    hazar:    1_000,
    thousand: 1_000,
    lakh:    100_000,
    lac:     100_000,
    l:       100_000,
    cr:    10_000_000,
    crore: 10_000_000,
    m:     1_000_000,
    million:1_000_000,
});

// ──────────────────────────────────────────────────────────
// Main: parse any amount-like input → integer
// Returns 0 if no number found
// ──────────────────────────────────────────────────────────
function parseAmount(input) {
    if (input === null || input === undefined) return 0;
    if (typeof input === 'number') return Math.round(input);

    const raw = String(input).toLowerCase().trim();
    if (!raw) return 0;

    // 1️⃣ Check written number phrases first (highest priority)
    for (const [phrase, value] of Object.entries(WRITTEN_NUMBERS)) {
        if (raw.includes(phrase)) return value;
    }

    // 2️⃣ Clean: remove currency symbols, commas, equals, spaces around numbers
    const cleaned = raw
        .replace(/[₹$,=]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // 3️⃣ Find number + optional suffix
    const match = cleaned.match(
        /(\d+(?:\.\d+)?)\s*(k|hazaar|hajar|hazar|thousand|lakh|lac|l|cr|crore|m|million)?\b/i
    );

    if (!match) return 0;

    const num    = parseFloat(match[1]);
    const suffix = (match[2] || '').toLowerCase();

    if (Number.isNaN(num) || num < 0) return 0;

    const multiplier = MULTIPLIERS[suffix] || 1;
    return Math.round(num * multiplier);
}

// ──────────────────────────────────────────────────────────
// Extract ALL amounts from a string
// Useful for multi-expense messages: "diesel 5k toll 200 food 150"
// Returns: [5000, 200, 150]
// ──────────────────────────────────────────────────────────
function parseAllAmounts(input) {
    if (!input) return [];
    const raw = String(input).toLowerCase();

    const amounts = [];

    // First: extract written number phrases
    for (const [phrase, value] of Object.entries(WRITTEN_NUMBERS)) {
        if (raw.includes(phrase)) amounts.push(value);
    }

    // Then: extract numeric patterns
    const cleaned = raw.replace(/[₹$,=]/g, ' ');
    const matches = cleaned.matchAll(
        /(\d+(?:\.\d+)?)\s*(k|hazaar|hajar|hazar|thousand|lakh|lac|l|cr|crore|m|million)?\b/gi
    );

    for (const m of matches) {
        const num    = parseFloat(m[1]);
        const suffix = (m[2] || '').toLowerCase();
        if (Number.isNaN(num) || num < 0) continue;
        const multiplier = MULTIPLIERS[suffix] || 1;
        amounts.push(Math.round(num * multiplier));
    }

    return amounts;
}

// ──────────────────────────────────────────────────────────
// Format amount as Indian rupees: 50000 → "₹50,000"
// ──────────────────────────────────────────────────────────
function formatAmount(amount, withSymbol = true) {
    const num = Number(amount) || 0;
    const formatted = num.toLocaleString('en-IN');
    return withSymbol ? `₹${formatted}` : formatted;
}

// ──────────────────────────────────────────────────────────
// Validate: is this a reasonable amount?
// Trip freight: 100 - 10,00,000 typically
// Expense: 1 - 1,00,000 typically
// ──────────────────────────────────────────────────────────
function isValidAmount(amount, { min = 1, max = 10_000_000 } = {}) {
    const num = Number(amount);
    if (Number.isNaN(num)) return false;
    return num >= min && num <= max;
}

module.exports = {
    parseAmount,
    parseAllAmounts,
    formatAmount,
    isValidAmount,
    WRITTEN_NUMBERS,
    MULTIPLIERS,
};
