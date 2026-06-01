// ============================================================
// src/services/analytics/fleetAnalytics.js
// Combined P&L analytics across all trucks
// ============================================================

'use strict';

const Truck   = require('../../models/Truck');
const Trip    = require('../../models/Trip');
const Expense = require('../../models/Expense');
const { createLogger } = require('../../utils/logger');
const log = createLogger('fleetAnalytics');

// Fleet-wide P&L for a date range
async function getFleetPL(userId, startDate, endDate) {
    try {
        const trucks = await Truck.find({ userId, isActive: true });

        const trips = await Trip.find({
            userId,
            createdAt: { $gte: startDate, $lte: endDate },
        });

        const expenses = await Expense.find({
            userId,
            createdAt: { $gte: startDate, $lte: endDate },
        });

        const totalRevenue = trips.reduce((s, t) => s + (t.freightAmount || 0), 0);
        const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        const netProfit    = totalRevenue - totalExpense;
        const margin       = totalRevenue > 0
            ? ((netProfit / totalRevenue) * 100).toFixed(1)
            : 0;

        return {
            trucks:    trucks.length,
            trips:     trips.length,
            completedTrips: trips.filter(t => t.status === 'completed').length,
            revenue:   totalRevenue,
            expense:   totalExpense,
            netProfit,
            margin:    parseFloat(margin),
            period:    { start: startDate, end: endDate },
        };

    } catch (err) {
        log.error(`getFleetPL error: ${err.message}`);
        throw err;
    }
}

// Per-truck P&L breakdown
async function getPerTruckPL(userId, startDate, endDate) {
    const trucks = await Truck.find({ userId, isActive: true });

    return await Promise.all(trucks.map(async (truck) => {
        const trips = await Trip.find({
            userId,
            truckId:   truck._id,
            createdAt: { $gte: startDate, $lte: endDate },
        });

        const expenses = await Expense.find({
            userId,
            truckId:   truck._id,
            createdAt: { $gte: startDate, $lte: endDate },
        });

        const revenue = trips.reduce((s, t) => s + (t.freightAmount || 0), 0);
        const expense = expenses.reduce((s, e) => s + (e.amount || 0), 0);

        return {
            truck:    truck.registrationNumber,
            model:    truck.model || 'N/A',
            trips:    trips.length,
            revenue,
            expense,
            profit:   revenue - expense,
        };
    }));
}

// Top performing truck
async function getTopTruck(userId, period = 'this_month') {
    const { start, end } = getDateRange(period);
    const trucks = await getPerTruckPL(userId, start, end);
    return trucks.sort((a, b) => b.profit - a.profit)[0] || null;
}

function getDateRange(period) {
    const now = new Date();
    let start, end = now;

    if (period === 'today')          { start = new Date(now); start.setHours(0,0,0,0); }
    else if (period === 'this_week') { start = new Date(now); start.setDate(now.getDate() - 7); }
    else                              { start = new Date(now.getFullYear(), now.getMonth(), 1); }

    return { start, end };
}

module.exports = { getFleetPL, getPerTruckPL, getTopTruck };
