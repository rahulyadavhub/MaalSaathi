// ============================================================
// src/models/Party.js
// Client/party ledger — freight + balance tracking
// ============================================================

'use strict';

const mongoose = require('mongoose');

const PartySchema = new mongoose.Schema({
    userId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
        index:    true,
    },

    partyName: { type: String, required: true, trim: true },
    phone:     { type: String, trim: true, default: '' },
    city:      { type: String, trim: true, default: '' },

    totalFreight:  { type: Number, default: 0 },
    totalReceived: { type: Number, default: 0 },
    balance:       { type: Number, default: 0 },  // totalFreight - totalReceived

    trips: [{
        type: mongoose.Schema.Types.ObjectId,
        ref:  'Trip',
    }],

    notes: { type: String, trim: true, default: '' },

}, { timestamps: true });

PartySchema.index({ userId: 1, partyName: 1 });

// Auto-calculate balance before save
PartySchema.pre('save', function (next) {
    this.balance = this.totalFreight - this.totalReceived;
    next();
});

module.exports = mongoose.model('Party', PartySchema);
