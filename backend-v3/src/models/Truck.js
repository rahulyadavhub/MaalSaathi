// ============================================================
// src/models/Truck.js
// Multiple trucks per user — Phase 3 feature
// ============================================================

'use strict';

const mongoose = require('mongoose');

const TruckSchema = new mongoose.Schema({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
        index:    true,
    },

    registrationNumber: {
        type:     String,
        required: true,
        uppercase: true,
        trim:     true,
    },

    model:        { type: String, trim: true },
    year:         { type: Number },
    capacity_tons: { type: Number },

    fuelType: {
        type:    String,
        enum:    ['diesel', 'cng', 'petrol'],
        default: 'diesel',
    },

    currentDriverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'Driver',
        default: null,
    },

    documents: {
        rcExpiry:        { type: Date, default: null },
        insuranceExpiry: { type: Date, default: null },
        pucExpiry:       { type: Date, default: null },
        permitExpiry:    { type: Date, default: null },
        fitnessExpiry:   { type: Date, default: null },
    },

    isActive: { type: Boolean, default: true },

}, { timestamps: true });

TruckSchema.index({ userId: 1, isActive: 1 });
TruckSchema.index({ userId: 1, registrationNumber: 1 });

module.exports = mongoose.model('Truck', TruckSchema);
