// ============================================================
// src/config/constants.js
// Centralized magic numbers — tweak yahin se, codebase mein nahi
// ============================================================

'use strict';

module.exports = Object.freeze({
    // ── Conversation memory
    CONV_TTL_DAYS:        7,       // Idle conversation auto-cleanup
    HISTORY_MAX_MESSAGES: 10,      // Last N msgs in conv.history

    // ── Message audit log
    MESSAGE_TTL_DAYS: 90,          // Compliance + cost control

    // ── Rate limiting
    RATE_LIMIT_WINDOW_MS: 60_000,  // 1 minute window

    // ── MongoDB
    MONGO_CONNECT_TIMEOUT_MS: 10_000,
    MONGO_SOCKET_TIMEOUT_MS:  45_000,
    MONGO_MAX_RETRIES:        5,
    MONGO_RETRY_DELAY_MS:     3_000,

    // ── WhatsApp
    WA_MAX_MESSAGE_LENGTH: 4000,   // Meta hard limit is 4096; safe margin
    WA_DEFAULT_RETRIES:    3,
    WA_CHUNK_DELAY_MS:     300,    // Delay between split-message chunks

    // ── Gemini AI
    GEMINI_DEFAULT_TIMEOUT_MS:    5_000,  // Reply generation
    GEMINI_CLASSIFIER_TIMEOUT_MS: 3_000,  // Intent classification (faster)

    // ── Performance
    SLOW_PROCESSING_THRESHOLD_MS: 3_000,  // Warn if request takes >3s

    // ── Reminders (future feature)
    DAILY_REMINDER_HOUR: 20,       // 8 PM IST
});
