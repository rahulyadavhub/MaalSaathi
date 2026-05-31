// ============================================================
// src/models/Subscription.js
// Plan history per user — activation, expiry log
// ============================================================

'use strict';

const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
        index:    true,
    },

    phone:     { type: String, required: true },
    plan:      { type: String, enum: ['free', 'pro', 'fleet'], required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },

    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },

    isActive:   { type: Boolean, default: true },
    autoRenew:  { type: Boolean, default: false },

    expiredAt:  { type: Date, default: null },
    cancelledAt:{ type: Date, default: null },

}, { timestamps: true });

SubscriptionSchema.index({ userId: 1, isActive: 1 });
SubscriptionSchema.index({ endDate: 1 });   // for expiry cron job

module.exports = mongoose.model('Subscription', SubscriptionSchema);
