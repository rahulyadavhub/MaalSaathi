// ============================================================
// src/models/Trip.js
// Single trip / consignment lifecycle
// ============================================================

'use strict';

const mongoose = require('mongoose');
const { TRIP_STATUS, ALL_STATUSES, canTransition } = require('../constants/tripStatus');
const { ALL_CATEGORIES, CATEGORY } = require('../constants/expenseCategories');

// ──────────────────────────────────────────────────────────
// Embedded expense (denormalized for fast trip reads)
// Master copy lives in Expense collection
// ──────────────────────────────────────────────────────────
const tripExpenseSchema = new mongoose.Schema({
    category:   { type: String, enum: ALL_CATEGORIES, default: CATEGORY.OTHER },
    amount:     { type: Number, required: true, min: 0 },
    note:       { type: String, trim: true, maxlength: 200 },
    source:     { type: String, enum: ['text', 'voice', 'manual'], default: 'text' },
    recordedAt: { type: Date,   default: Date.now },
}, { _id: true });

// ──────────────────────────────────────────────────────────
// Trip schema
// ──────────────────────────────────────────────────────────
const tripSchema = new mongoose.Schema({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
        index:    true,
    },
    truckRegistration: { type: String, trim: true, uppercase: true },

    // Route
    origin:      { type: String, trim: true },
    destination: { type: String, trim: true },

    // Cargo
    cargoType:        { type: String, trim: true },
    cargoWeightTons:  { type: Number, min: 0, max: 100 },

    // Financials
    freightAmount: { type: Number, min: 0, default: 0 },
    advancePaid:   { type: Number, min: 0, default: 0 },
    balanceDue:    { type: Number, default: 0 },

    // People
    driverName:  { type: String, trim: true },
    driverPhone: { type: String, trim: true },
    partyName:   { type: String, trim: true },   // Consignor/consignee

    // State machine
    status: {
        type:     String,
        enum:     ALL_STATUSES,
        default:  TRIP_STATUS.DRAFT,
        index:    true,
    },

    // Expenses (embedded for fast access)
    expenses: [tripExpenseSchema],

    // Timestamps
    startedAt:    { type: Date, default: Date.now },
    completedAt:  { type: Date, default: null },
    cancelledAt:  { type: Date, default: null },

    // Free-form notes
    notes: { type: String, trim: true, maxlength: 500 },

}, {
    timestamps:   true,
    toJSON:       { virtuals: true },
    toObject:     { virtuals: true },
});

// ──────────────────────────────────────────────────────────
// Indexes (most common queries)
// ──────────────────────────────────────────────────────────
tripSchema.index({ userId: 1, status: 1 });
tripSchema.index({ userId: 1, startedAt: -1 });
tripSchema.index({ userId: 1, completedAt: -1 });

// ──────────────────────────────────────────────────────────
// Virtuals
// ──────────────────────────────────────────────────────────
tripSchema.virtual('totalExpenses').get(function () {
    return this.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
});

tripSchema.virtual('netProfit').get(function () {
    return (this.freightAmount || 0) - this.totalExpenses;
});

tripSchema.virtual('durationHours').get(function () {
    const end = this.completedAt || this.cancelledAt;
    if (!end) return null;
    return Math.round((end - this.startedAt) / 3_600_000);
});

tripSchema.virtual('isActive').get(function () {
    return this.status === TRIP_STATUS.ACTIVE;
});

tripSchema.virtual('isTerminal').get(function () {
    return this.status === TRIP_STATUS.COMPLETED || this.status === TRIP_STATUS.CANCELLED;
});

// ──────────────────────────────────────────────────────────
// Pre-save: auto-calculate balanceDue + set timestamps
// ──────────────────────────────────────────────────────────
tripSchema.pre('save', function (next) {
    this.balanceDue = Math.max(0, (this.freightAmount || 0) - (this.advancePaid || 0));

    if (this.isModified('status')) {
        if (this.status === TRIP_STATUS.COMPLETED && !this.completedAt) {
            this.completedAt = new Date();
        }
        if (this.status === TRIP_STATUS.CANCELLED && !this.cancelledAt) {
            this.cancelledAt = new Date();
        }
    }
    next();
});

// ──────────────────────────────────────────────────────────
// Instance method: change status with validation
// ──────────────────────────────────────────────────────────
tripSchema.methods.changeStatus = function (newStatus) {
    if (!canTransition(this.status, newStatus)) {
        throw new Error(`Invalid transition: ${this.status} → ${newStatus}`);
    }
    this.status = newStatus;
    return this;
};

tripSchema.methods.addExpense = function ({ category, amount, note, source = 'text' }) {
    this.expenses.push({ category, amount, note, source, recordedAt: new Date() });
    return this;
};

// ──────────────────────────────────────────────────────────
// Static: find user's currently active trip (singleton)
// ──────────────────────────────────────────────────────────
tripSchema.statics.findActive = function (userId) {
    return this.findOne({ userId, status: TRIP_STATUS.ACTIVE }).sort({ startedAt: -1 });
};

tripSchema.statics.findPending = function (userId) {
    return this.findOne({ userId, status: TRIP_STATUS.PENDING_CONFIRMATION }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Trip', tripSchema);
