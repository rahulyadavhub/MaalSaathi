// ============================================================
// src/models/OTP.js
// OTP store — bcrypt hashed, auto-delete on expiry
// ============================================================

'use strict';

const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
    phone: {
        type:     String,
        required: true,
        index:    true,
    },

    otp: {
        type:     String,
        required: true,          // bcrypt hashed — NEVER plain text
    },

    paymentId: {
        type:    String,
        default: null,
    },

    purpose: {
        type:    String,
        enum:    ['subscription', 'login', 'verify'],
        default: 'subscription',
    },

    expiresAt: {
        type:     Date,
        required: true,
    },

    attempts: { type: Number, default: 0 },   // max 3
    used:     { type: Boolean, default: false },

}, { timestamps: true });

// Auto-delete expired OTPs from DB
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OTPSchema.index({ phone: 1, used: 1 });

module.exports = mongoose.model('OTP', OTPSchema);
