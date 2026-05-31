// ============================================================
// src/services/trip/expenseService.js
// Expense logging + analytics
// Stats updates delegated to userStatsService (DRY)
// ============================================================

'use strict';

const Expense = require('../../models/Expense');
const Trip    = require('../../models/Trip');
const userStats = require('../user/userStatsService');
const { TRIP_STATUS } = require('../../constants/tripStatus');
const { createLogger } = require('../../utils/logger');
const log = createLogger('expenseService');

async function logExpense(userId, { category, amount, note, source = 'text', rawMessage }) {
    if (!amount || amount <= 0) throw new Error('Invalid expense amount');

    const trip = await Trip.findOne({ userId, status: TRIP_STATUS.ACTIVE }).sort({ startedAt: -1 });

    const expense = await Expense.create({
        userId, tripId: trip?._id || null,
        category, amount, note, source, rawMessage,
    });

    if (trip) {
        trip.expenses.push({ category, amount, note, source, recordedAt: expense.recordedAt });
        await trip.save();
    }

    await userStats.recordExpense(userId, amount);
    log.info(`Expense: ${category} ₹${amount}`, { userId, tripId: trip?._id });
    return { expense, trip };
}

async function logMultiple(userId, expenses, { source = 'text', rawMessage } = {}) {
    const valid = (expenses || []).filter(e => Number(e.amount) > 0);
    if (valid.length === 0) return { trip: null, saved: [] };

    const trip = await Trip.findOne({ userId, status: TRIP_STATUS.ACTIVE }).sort({ startedAt: -1 });

    const docs = valid.map(e => ({
        userId,
        tripId: trip?._id || null,
        category: e.category,
        amount:   Number(e.amount),
        note:     e.note || null,
        source,
        rawMessage,
    }));

    const saved = await Expense.insertMany(docs);

    if (trip) {
        for (const e of valid) {
            trip.expenses.push({
                category:   e.category,
                amount:     Number(e.amount),
                note:       e.note || null,
                source,
                recordedAt: new Date(),
            });
        }
        await trip.save();
    }

    const total = valid.reduce((s, e) => s + Number(e.amount), 0);
    await userStats.recordExpense(userId, total);

    log.info(`Bulk expenses: ${valid.length} items (₹${total})`, { userId, tripId: trip?._id });
    return { trip, saved };
}

async function totalForPeriod(userId, startDate, endDate = new Date()) {
    return Expense.sumByPeriod(userId, startDate, endDate);
}

async function breakdownForPeriod(userId, startDate, endDate = new Date()) {
    return Expense.sumByCategory(userId, startDate, endDate);
}

module.exports = { logExpense, logMultiple, totalForPeriod, breakdownForPeriod };
