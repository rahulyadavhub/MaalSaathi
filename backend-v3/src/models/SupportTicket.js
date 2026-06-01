// ============================================================
// src/models/SupportTicket.js
// Customer support tickets — 3 level system
// ============================================================

'use strict';

const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema({
    ticketId: {
        type:   String,
        unique: true,          // #001, #002...
    },

    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
        index:    true,
    },

    phone:    { type: String, required: true },
    userName: { type: String, default: 'User' },
    issue:    { type: String, required: true },

    category: {
        type: String,
        enum: ['trip', 'expense', 'payment', 'technical', 'other'],
        default: 'other',
    },

    status: {
        type:    String,
        enum:    ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open',
    },

    priority: {
        type:    String,
        enum:    ['low', 'medium', 'high'],
        default: 'low',
    },

    plan: { type: String, default: 'free' },

    messages: [{
        from:      { type: String, enum: ['user', 'support'] },
        text:      { type: String },
        timestamp: { type: Date, default: Date.now },
    }],

    resolvedAt:  { type: Date, default: null },

}, { timestamps: true });

// Auto-generate ticketId before save
SupportTicketSchema.pre('save', async function (next) {
    if (!this.ticketId) {
        const count = await mongoose.model('SupportTicket').countDocuments();
        this.ticketId = `#${String(count + 1).padStart(3, '0')}`;
    }
    next();
});

SupportTicketSchema.index({ status: 1, priority: 1 });
SupportTicketSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);
