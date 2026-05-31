// ============================================================
// src/models/Expense.js
// Separate expenses collection
//
// Kyun separate jab Trip mein bhi hai?
// - Cross-trip analytics easy: "is mahine ka total diesel?"
// - Trip ke bina bhi expense log ho sakta hai
// - PDF reports ke liye fast queries
// - Future: tax exports, category-wise charts
// ============================================================

'use strict';

const mongoose = require('mongoose');
const { ALL_CATEGORIES, CATEGORY } = require('../constants/expenseCategories');

const expenseSchema = new mongoose.Schema({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
        index:    true,
    },
    tripId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'Trip',
        default:  null,
        index:    true,
    },
    category: {
        type:     String,
        enum:     ALL_CATEGORIES,
        default:  CATEGORY.OTHER,
        index:    true,
    },
    amount: {
        type:     Number,
        required: true,
        min:      0,
    },
    note: {
        type:      String,
        trim:      true,
        maxlength: 200,
    },
    source: {
        type:    String,
        enum:    ['text', 'voice', 'manual', 'api'],
        default: 'text',
    },
    // Raw message (debugging + future ML training)
    rawMessage: {
        type:      String,
        trim:      true,
        maxlength: 500,
    },
    recordedAt: {
        type:    Date,
        default: Date.now,
        index:   true,
    },
}, {
    timestamps: true,
});

// ──────────────────────────────────────────────────────────
// Compound indexes (analytics queries)
// ──────────────────────────────────────────────────────────
expenseSchema.index({ userId: 1, recordedAt: -1 });
expenseSchema.index({ userId: 1, category: 1, recordedAt: -1 });
expenseSchema.index({ userId: 1, tripId: 1 });

// ──────────────────────────────────────────────────────────
// Statics — analytics helpers
// ──────────────────────────────────────────────────────────

// "Aaj ka total kharcha"
expenseSchema.statics.sumByPeriod = async function (userId, startDate, endDate = new Date()) {
    const result = await this.aggregate([
        { $match: {
            userId:     new mongoose.Types.ObjectId(userId),
            recordedAt: { $gte: startDate, $lte: endDate },
        }},
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    return result[0] || { total: 0, count: 0 };
};

// "Is mahine ka diesel kitna gaya"
expenseSchema.statics.sumByCategory = async function (userId, startDate, endDate = new Date()) {
    return this.aggregate([
        { $match: {
            userId:     new mongoose.Types.ObjectId(userId),
            recordedAt: { $gte: startDate, $lte: endDate },
        }},
        { $group: {
            _id:   '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
        }},
        { $sort: { total: -1 } },
    ]);
};

// Recent expenses (for context building)
expenseSchema.statics.recent = function (userId, limit = 5) {
    return this.find({ userId }).sort({ recordedAt: -1 }).limit(limit).lean();
};

module.exports = mongoose.model('Expense', expenseSchema);
