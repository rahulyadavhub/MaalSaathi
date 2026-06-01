// ============================================================
// src/models/Driver.js
// Driver database — license, salary, performance, assignment
// ============================================================

'use strict';

const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
        index:    true,
    },

    name:  { type: String, required: true, trim: true },
    phone: { type: String, trim: true },

    licenseNumber: { type: String, trim: true, uppercase: true },
    licenseExpiry: { type: Date, default: null },

    monthlySalary: { type: Number, default: 0 },
    advancePaid:   { type: Number, default: 0 },

    assignedTruckId: {
        type:    mongoose.Schema.Types.ObjectId,
        ref:     'Truck',
        default: null,
    },

    joiningDate: { type: Date, default: Date.now },

    performance: {
        totalTrips:        { type: Number, default: 0 },
        totalKm:           { type: Number, default: 0 },
        avgFuelEfficiency: { type: Number, default: 0 },
    },

    isActive: { type: Boolean, default: true },

}, { timestamps: true });

DriverSchema.index({ userId: 1, isActive: 1 });
DriverSchema.index({ userId: 1, assignedTruckId: 1 });

module.exports = mongoose.model('Driver', DriverSchema);
