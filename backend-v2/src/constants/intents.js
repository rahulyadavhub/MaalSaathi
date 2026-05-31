// ============================================================
// src/constants/intents.js
// User message intents — parser/AI classifier returns one of these
// ============================================================

'use strict';

const INTENT = Object.freeze({
    // Trip management
    LOG_TRIP:           'log_trip',           // "Mumbai se Pune 12 ton 28000"
    COMPLETE_TRIP:      'complete_trip',      // "trip complete", "pahunch gaya"
    CANCEL_TRIP:        'cancel_trip',        // "trip cancel karo"
    SHOW_TRIPS:         'show_trips',         // "mera trip kya hai"

    // Expense
    LOG_EXPENSE:        'log_expense',        // "diesel 4500"
    LOG_MULTI_EXPENSE:  'log_multi_expense',  // "diesel 5k, toll 200, food 150"

    // Financials
    QUERY_PROFIT:       'query_profit',       // "kitna kamaya"

    // Conversational
    GREETING:           'greeting',           // "hi", "namaste"
    HELP:               'help',               // "kya kar sakte ho"
    KNOWLEDGE_QUESTION: 'knowledge_question', // "GST kitna lagta"
    SMALL_TALK:         'small_talk',         // "kaise ho", "thank you"

    // Confirmations (used in multi-step flows)
    YES:                'yes',
    NO:                 'no',

    // System
    UNKNOWN:            'unknown',            // Could not classify
});

const ALL_INTENTS = Object.values(INTENT);

module.exports = { INTENT, ALL_INTENTS };
