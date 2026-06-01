// ============================================================
// src/services/party/partyLedgerService.js
// Client/party ledger — freight + receive + balance tracking
// ============================================================

'use strict';

const Party = require('../../models/Party');
const Trip  = require('../../models/Trip');
const { createLogger } = require('../../utils/logger');
const log = createLogger('partyLedger');

// Add or find party
async function findOrCreate(userId, partyName, phone = '', city = '') {
    let party = await Party.findOne({
        userId,
        partyName: new RegExp(`^${partyName}$`, 'i'),
    });

    if (party) return party;

    party = await Party.create({ userId, partyName, phone, city });
    log.info(`Party created: ${partyName} | user: ${userId}`);
    return party;
}

// Add trip + freight to party ledger
async function addFreight(partyId, tripId, freightAmount) {
    return await Party.findByIdAndUpdate(
        partyId,
        {
            $inc:  { totalFreight: freightAmount },
            $push: { trips: tripId },
        },
        { new: true }
    );
}

// Record payment received from party
async function receivePayment(partyId, amount) {
    const party = await Party.findById(partyId);
    if (!party) throw new Error('Party not found');

    party.totalReceived += amount;
    party.balance = party.totalFreight - party.totalReceived;
    await party.save();

    log.info(`Payment received ₹${amount} | party: ${party.partyName}`);
    return party;
}

// Get all parties with balance
async function getUserParties(userId) {
    return await Party.find({ userId }).sort({ balance: -1 });
}

// Get parties with pending balance
async function getPendingBalances(userId) {
    return await Party.find({
        userId,
        balance: { $gt: 0 },
    }).sort({ balance: -1 });
}

// Format party ledger message for WhatsApp
function formatLedgerMessage(parties) {
    if (!parties.length) return '📋 Koi party ledger nahi hai';

    let msg = '📋 Party Ledger\n\n';
    let totalPending = 0;

    for (const p of parties) {
        const emoji = p.balance > 0 ? '🔴' : '✅';
        msg += `${emoji} ${p.partyName}\n`;
        msg += `   Freight: ₹${p.totalFreight.toLocaleString('en-IN')}\n`;
        msg += `   Received: ₹${p.totalReceived.toLocaleString('en-IN')}\n`;
        msg += `   Balance: ₹${p.balance.toLocaleString('en-IN')}\n\n`;
        totalPending += Math.max(0, p.balance);
    }

    msg += `─────────────────\n`;
    msg += `Total Pending: ₹${totalPending.toLocaleString('en-IN')}`;

    return msg.trim();
}

module.exports = {
    findOrCreate,
    addFreight,
    receivePayment,
    getUserParties,
    getPendingBalances,
    formatLedgerMessage,
};
