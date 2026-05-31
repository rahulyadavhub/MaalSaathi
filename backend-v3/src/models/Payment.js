// ============================================================
// src/models/Payment.js
// Full payment history log — Razorpay transactions
// ============================================================

'use strict';

const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
        index:    true,
    },

    phone: { type: String, required: true },

    razorpayOrderId:   { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },

    amount: { type: Number, required: true },  // in paise (29900 = ₹299)
    plan:   { type: String, required: true },  // free/pro/fleet

    status: {
        type:    String,
        enum:    ['created', 'paid', 'failed', 'refunded'],
        default: 'created',
    },

    otpVerified: { type: Boolean, default: false },
    activatedAt: { type: Date, default: null },

}, { timestamps: true });

PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ razorpayPaymentId: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);
