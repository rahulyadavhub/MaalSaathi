// ============================================================
// src/models/User.js
// Truck owner / fleet operator profile
// ============================================================

'use strict';

const mongoose = require('mongoose');

// ──────────────────────────────────────────────────────────
// Truck sub-document — ek user ke multiple trucks ho sakte hain
// ──────────────────────────────────────────────────────────
const truckSchema = new mongoose.Schema({
    registration: {
        type:      String,
        required:  true,
        uppercase: true,
        trim:      true,
        match:     [/^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$/, 'Invalid registration format'],
    },
    vehicleType: {
        type:    String,
        enum:    ['truck', 'mini-truck', 'trailer', 'tanker', 'tipper', 'container', 'unknown'],
        default: 'truck',
    },
    make:        { type: String, trim: true },     // Tata, Ashok Leyland
    model:       { type: String, trim: true },     // 1109, 2518
    capacityTons:{ type: Number, min: 0, max: 100 },
    year:        { type: Number, min: 1980, max: 2030 },
    isActive:    { type: Boolean, default: true },
    addedAt:     { type: Date, default: Date.now },
}, { _id: false });

// ──────────────────────────────────────────────────────────
// User schema
// ──────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    phone: {
        type:     String,
        required: true,
        unique:   true,
        trim:     true,
        index:    true,
    },
    name: {
        type:    String,
        trim:    true,
        default: 'Friend',
        maxlength: 100,
    },
    language: {
        type:    String,
        enum:    ['hindi', 'hinglish', 'english'],
        default: 'hinglish',
    },
    trucks: [truckSchema],

    // Onboarding
    onboardingComplete: { type: Boolean, default: false },
    onboardingStep:     { type: String, default: null }, // null | 'name' | 'truck'

    // Activity
    isActive:     { type: Boolean, default: true },
    lastActiveAt: { type: Date,    default: Date.now },

    // Lifetime stats (denormalized for fast dashboard queries)
    stats: {
        totalTrips:      { type: Number, default: 0 },
        completedTrips:  { type: Number, default: 0 },
        cancelledTrips:  { type: Number, default: 0 },
        totalRevenue:    { type: Number, default: 0 },
        totalExpenses:   { type: Number, default: 0 },
        totalMessages:   { type: Number, default: 0 },
    },

    // Subscription (future use)
    subscription: {
        plan:      { type: String, enum: ['free', 'basic', 'pro'], default: 'free' },
        startedAt: { type: Date,   default: Date.now },
        expiresAt: { type: Date,   default: null },
    },

    // Preferences
    preferences: {
        currency:        { type: String, default: 'INR' },
        timezone:        { type: String, default: 'Asia/Kolkata' },
        dailyReminder:   { type: Boolean, default: true },
        reminderHour:    { type: Number, default: 20, min: 0, max: 23 }, // 8 PM
        receivePDFReports: { type: Boolean, default: true },
    },

}, {
    timestamps: true,
});

// ──────────────────────────────────────────────────────────
// Indexes
// ──────────────────────────────────────────────────────────
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ 'subscription.plan': 1 });

// ──────────────────────────────────────────────────────────
// Virtuals
// ──────────────────────────────────────────────────────────
userSchema.virtual('netProfit').get(function () {
    return (this.stats.totalRevenue || 0) - (this.stats.totalExpenses || 0);
});

userSchema.virtual('primaryTruck').get(function () {
    return this.trucks?.[0] || null;
});

// ──────────────────────────────────────────────────────────
// Pre-save hooks
// ──────────────────────────────────────────────────────────
userSchema.pre('save', function (next) {
    this.lastActiveAt = new Date();
    next();
});

// ──────────────────────────────────────────────────────────
// Instance methods
// ──────────────────────────────────────────────────────────
userSchema.methods.getPrimaryTruckReg = function () {
    return this.trucks?.[0]?.registration || null;
};

userSchema.methods.hasActiveSubscription = function () {
    if (this.subscription.plan === 'free') return true;
    if (!this.subscription.expiresAt) return false;
    return new Date(this.subscription.expiresAt) > new Date();
};

// ──────────────────────────────────────────────────────────
// Static methods
// ──────────────────────────────────────────────────────────
userSchema.statics.findOrCreate = async function (phone, defaultName = 'Friend') {
    let user = await this.findOne({ phone });
    if (!user) {
        user = await this.create({ phone, name: defaultName });
    }
    return user;
};

module.exports = mongoose.model('User', userSchema);
