// ============================================================
// src/models/Conversation.js
// AI memory layer — persistent conversation state
//
// Pichla bot "bot ko context yaad nahi rehta" — root cause ye tha:
// session in-memory thi, server restart pe gayab.
//
// Ab MongoDB mein persist hoti hai, TTL index se auto-cleanup (7 din).
// ============================================================

'use strict';

const mongoose = require('mongoose');

// ──────────────────────────────────────────────────────────
// Single message entry in history
// ──────────────────────────────────────────────────────────
const historyEntrySchema = new mongoose.Schema({
    role:   { type: String, enum: ['user', 'bot'], required: true },
    text:   { type: String, required: true, maxlength: 500 },
    intent: { type: String, default: null },     // parsed intent (for analytics)
    ts:     { type: Date,   default: Date.now },
}, { _id: false });

// ──────────────────────────────────────────────────────────
// Conversation schema
// ──────────────────────────────────────────────────────────
const conversationSchema = new mongoose.Schema({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
        unique:   true,
        index:    true,
    },
    phone: { type: String, required: true, index: true },

    // Multi-step flow state
    // 'idle' | 'awaiting_name' | 'awaiting_truck' |
    // 'awaiting_freight' | 'awaiting_trip_confirmation' |
    // 'clarifying_expense' | etc.
    state: {
        type:    String,
        default: 'idle',
        index:   true,
    },

    // Temp data between steps (e.g. trip draft before confirmation)
    context: {
        type:    mongoose.Schema.Types.Mixed,
        default: {},
    },

    // Last 10 messages for AI context building
    history: {
        type:    [historyEntrySchema],
        default: [],
    },

    // Pointer to current active trip (denormalized for speed)
    activeTripId: {
        type:    mongoose.Schema.Types.ObjectId,
        ref:     'Trip',
        default: null,
    },

    // Stats
    messageCount:  { type: Number, default: 0 },
    lastMessageAt: { type: Date,   default: Date.now },

    // TTL — auto-delete inactive conversations after 7 days
    expiresAt: {
        type:    Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },

}, {
    timestamps: true,
});

// ──────────────────────────────────────────────────────────
// TTL index — MongoDB auto-deletes expired docs
// ──────────────────────────────────────────────────────────
conversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ──────────────────────────────────────────────────────────
// Instance methods
// ──────────────────────────────────────────────────────────

// Add message + auto-trim history to 10
conversationSchema.methods.addMessage = function (role, text, intent = null) {
    this.history.push({ role, text: text.substring(0, 500), intent, ts: new Date() });
    if (this.history.length > 10) {
        this.history = this.history.slice(-10);
    }
    this.messageCount++;
    this.lastMessageAt = new Date();
    // Refresh TTL on activity
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return this;
};

// Reset to clean idle state
conversationSchema.methods.reset = function () {
    this.state = 'idle';
    this.context = {};
    return this;
};

// Transition to a new state with context
conversationSchema.methods.setState = function (newState, context = {}) {
    this.state = newState;
    this.context = context;
    return this;
};

// Get last N messages for AI prompt
conversationSchema.methods.getRecentHistory = function (n = 5) {
    return this.history.slice(-n);
};

// ──────────────────────────────────────────────────────────
// Statics
// ──────────────────────────────────────────────────────────
conversationSchema.statics.findOrCreate = async function (userId, phone) {
    let conv = await this.findOne({ userId });
    if (!conv) {
        conv = await this.create({ userId, phone });
    }
    return conv;
};

module.exports = mongoose.model('Conversation', conversationSchema);
