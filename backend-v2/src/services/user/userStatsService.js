// ============================================================
// src/services/user/userStatsService.js
// All User.stats mutations happen here — single source of truth
//
// Pehle stats updates 5 alag jagahon mein scattered the. Ab ek jagah.
// Future: yahan analytics events, audit trail, etc. add kar sakte hain.
// ============================================================

'use strict';

const User = require('../../models/User');
const { createLogger } = require('../../utils/logger');
const log = createLogger('userStats');

// Trip lifecycle stats
async function recordTripStarted(userId) {
    return User.findByIdAndUpdate(userId, { $inc: { 'stats.totalTrips': 1 } });
}

async function recordTripCompleted(userId, revenue) {
    return User.findByIdAndUpdate(userId, {
        $inc: {
            'stats.completedTrips': 1,
            'stats.totalRevenue':   Number(revenue) || 0,
        },
    });
}

async function recordTripCancelled(userId) {
    return User.findByIdAndUpdate(userId, { $inc: { 'stats.cancelledTrips': 1 } });
}

// Expense stats
async function recordExpense(userId, amount) {
    const n = Number(amount);
    if (!n || n <= 0) return null;
    return User.findByIdAndUpdate(userId, { $inc: { 'stats.totalExpenses': n } });
}

// Activity touch (for CRM)
async function touchLastActive(userId) {
    return User.findByIdAndUpdate(userId, { $set: { lastActiveAt: new Date() } });
}

module.exports = {
    recordTripStarted,
    recordTripCompleted,
    recordTripCancelled,
    recordExpense,
    touchLastActive,
};
