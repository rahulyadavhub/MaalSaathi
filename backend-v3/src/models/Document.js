// ============================================================
// src/models/Document.js
// RC, Insurance, PUC, Permit, Fitness — expiry tracking
// ============================================================

'use strict';

const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
        index:    true,
    },

    truckId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'Truck',
        default: null,
    },

    type: {
        type:     String,
        enum:     ['RC', 'Insurance', 'PUC', 'Permit', 'Fitness', 'DL'],
        required: true,
    },

    expiryDate: { type: Date, required: true },
    issueDate:  { type: Date, default: null },

    reminderSent: {
        days30:  { type: Boolean, default: false },
        days15:  { type: Boolean, default: false },
        days7:   { type: Boolean, default: false },
        expired: { type: Boolean, default: false },
    },

    notes: { type: String, trim: true, default: '' },

}, { timestamps: true });

DocumentSchema.index({ userId: 1, type: 1 });
DocumentSchema.index({ userId: 1, expiryDate: 1 });
DocumentSchema.index({ expiryDate: 1 });   // for cron job queries

module.exports = mongoose.model('Document', DocumentSchema);
