// ============================================================
// src/services/conversation/contextBuilder.js
// Builds full context object for handlers + AI prompts
// ============================================================

'use strict';

const tripService = require('../trip/tripService');
const Expense     = require('../../models/Expense');

async function build(user, conv) {
    const activeTrip = await tripService.getActiveTrip(user._id);

    const today = new Date(); today.setHours(0,0,0,0);
    const recentExpenses = await Expense.find({
        userId: user._id,
        recordedAt: { $gte: today },
    }).sort({ recordedAt: -1 }).limit(5).lean();

    return {
        user,
        conversation: conv,
        activeTrip,
        recentExpenses,
        userName:  user.name || 'Bhai',
        userTruck: user.trucks?.[0]?.registration || null,
        history:   conv.history || [],
    };
}

module.exports = { build };
