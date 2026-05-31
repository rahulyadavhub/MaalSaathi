// ============================================================
// src/models/Message.js
// Audit log — every incoming/outgoing message
//
// Production gold: jab bug aaye user ka, exact message + intent +
// response dekh sakte ho. Saath mein analytics — which features used.
// ============================================================

'use strict';

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    userId: {
        type:  mongoose.Schema.Types.ObjectId,
        ref:   'User',
        index: true,
    },
    phone: { type: String, required: true, index: true },

    direction: {
        type:     String,
        enum:     ['incoming', 'outgoing'],
        required: true,
        index:    true,
    },

    text: {
        type:      String,
        required:  true,
        maxlength: 5000,
    },

    // Type of WhatsApp message
    type: {
        type:    String,
        enum:    ['text', 'audio', 'image', 'document', 'video', 'sticker', 'button', 'interactive', 'system'],
        default: 'text',
    },

    // Meta WhatsApp message ID (for dedup + tracking)
    whatsappMessageId: { type: String, index: true, sparse: true },

    // Parsed intent (for incoming only)
    intent: { type: String, default: null, index: true },

    // Action taken (for incoming) — e.g. "log_expense", "complete_trip"
    action: { type: String, default: null },

    // Reference to created/updated resources
    tripId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Trip',    default: null },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },

    // Success / failure
    success:      { type: Boolean, default: true },
    errorMessage: { type: String, default: null },

    // Processing time in ms (perf monitoring)
    processingMs: { type: Number, default: 0 },

    // Timestamp (no inline index — TTL index below handles it)
    timestamp: { type: Date, default: Date.now },
}, {
    timestamps: true,
});

// ──────────────────────────────────────────────────────────
// Compound indexes for common queries
// ──────────────────────────────────────────────────────────
messageSchema.index({ phone: 1, timestamp: -1 });
messageSchema.index({ userId: 1, intent: 1 });
messageSchema.index({ success: 1, timestamp: -1 });

// ──────────────────────────────────────────────────────────
// TTL — auto-delete messages older than 90 days (compliance + cost)
// This also covers the timestamp index, so no inline index needed
// ──────────────────────────────────────────────────────────
messageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ──────────────────────────────────────────────────────────
// Statics
// ──────────────────────────────────────────────────────────

// Log incoming message
messageSchema.statics.logIncoming = function ({
    userId, phone, text, type = 'text', whatsappMessageId
}) {
    return this.create({
        userId, phone, text, type, whatsappMessageId,
        direction: 'incoming',
    });
};

// Log outgoing message
messageSchema.statics.logOutgoing = function ({
    userId, phone, text, success = true, errorMessage = null,
    intent = null, action = null, tripId = null, expenseId = null,
    processingMs = 0,
}) {
    return this.create({
        userId, phone, text,
        direction: 'outgoing',
        success, errorMessage,
        intent, action, tripId, expenseId, processingMs,
    });
};

// Check if a WhatsApp message was already processed (dedup)
messageSchema.statics.wasProcessed = async function (whatsappMessageId) {
    if (!whatsappMessageId) return false;
    const count = await this.countDocuments({ whatsappMessageId, direction: 'incoming' });
    return count > 0;
};

module.exports = mongoose.model('Message', messageSchema);
