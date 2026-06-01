// ============================================================
// src/models/Notification.js
// All sent notifications log — reminders, alerts, summaries
// ============================================================

'use strict';

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
        index:    true,
    },

    phone: { type: String, required: true },

    type: {
        type: String,
        enum: [
            'daily_reminder',
            'weekly_summary',
            'monthly_report',
            'doc_expiry',
            'trip_followup',
            'plan_expiry',
            'otp',
            'payment_confirm',
            'support_reply',
        ],
        required: true,
    },

    message:   { type: String, required: true },
    status:    { type: String, enum: ['sent', 'failed'], default: 'sent' },
    sentAt:    { type: Date, default: Date.now },
    reference: { type: String, default: null },  // docId, tripId etc

}, { timestamps: true });

NotificationSchema.index({ userId: 1, type: 1 });
NotificationSchema.index({ sentAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
