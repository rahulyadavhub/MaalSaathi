// ============================================================
// src/models/Advance.js
// Driver advance payments log
// ============================================================

'use strict';

const mongoose = require('mongoose');

const AdvanceSchema = new mongoose.Schema({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
        index:    true,
    },

    driverId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'Driver',
        required: true,
        index:    true,
    },

    amount: { type: Number, required: true },

    reason: {
        type:    String,
        trim:    true,
        default: '',
    },

    paidDate: { type: Date, default: Date.now },

    deductedFromMonth: {
        type:    String,               // e.g. "June 2026"
        default: null,
    },

    status: {
        type:    String,
        enum:    ['pending', 'deducted', 'cancelled'],
        default: 'pending',
    },

}, { timestamps: true });

AdvanceSchema.index({ userId: 1, driverId: 1, status: 1 });

module.exports = mongoose.model('Advance', AdvanceSchema);
