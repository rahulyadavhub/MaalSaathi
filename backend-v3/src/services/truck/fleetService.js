// ============================================================
// src/services/truck/fleetService.js
// Fleet-wide analytics — all trucks combined P&L view
// ============================================================

'use strict';

const Truck   = require('../../models/Truck');
const Trip    = require('../../models/Trip');
const Expense = require('../../models/Expense');
const { createLogger } = require('../../utils/logger');
const log = createLogger('fleetService');

// Get fleet overview — all trucks summary
async function getFleetOverview(userId, period = 'this_month') {
    try {
        const trucks = await Truck.find({ userId, isActive: true })
            .populate('currentDriverId', 'name');

        const { start, end } = getDateRange(period);

        const fleetData = await Promise.all(trucks.map(async (truck) => {
            const trips = await Trip.find({
                userId,
                truckId:   truck._id,
                createdAt: { $gte: start, $lte: end },
            });

            const expenses = await Expense.find({
                userId,
                truckId:   truck._id,
                createdAt: { $gte: start, $lte: end },
            });

            const revenue = trips.reduce((s, t) => s + (t.freightAmount || 0), 0);
            const expense = expenses.reduce((s, e) => s + (e.amount || 0), 0);

            return {
                truck:          truck.registrationNumber,
                model:          truck.model || 'N/A',
                driver:         truck.currentDriverId?.name || 'No driver',
                trips:          trips.length,
                revenue,
                expense,
                profit:         revenue - expense,
                activeTrip:     trips.find(t => t.status === 'active') || null,
            };
        }));

        const totals = fleetData.reduce((acc, t) => ({
            trucks:  acc.trucks + 1,
            trips:   acc.trips + t.trips,
            revenue: acc.revenue + t.revenue,
            expense: acc.expense + t.expense,
            profit:  acc.profit + t.profit,
        }), { trucks: 0, trips: 0, revenue: 0, expense: 0, profit: 0 });

        return { fleetData, totals, period };

    } catch (err) {
        log.error(`getFleetOverview error: ${err.message}`);
        throw err;
    }
}

// Format fleet summary message for WhatsApp
function formatFleetMessage(overview) {
    const { fleetData, totals, period } = overview;

    let msg = `🚛 Fleet Overview — ${period}\n\n`;

    for (const t of fleetData) {
        const emoji = t.profit >= 0 ? '✅' : '⚠️';
        msg += `${t.truck} (${t.driver})\n`;
        msg += `  Trips: ${t.trips} | Net: ₹${t.profit.toLocaleString('en-IN')}\n\n`;
    }

    msg += `─────────────────\n`;
    msg += `📊 Total ${totals.trucks} trucks\n`;
    msg += `💰 Revenue: ₹${totals.revenue.toLocaleString('en-IN')}\n`;
    msg += `📋 Expense: ₹${totals.expense.toLocaleString('en-IN')}\n`;
    msg += `✅ Net: ₹${totals.profit.toLocaleString('en-IN')}`;

    return msg;
}

function getDateRange(period) {
    const now = new Date();
    let start, end = now;

    if (period === 'today') {
        start = new Date(now); start.setHours(0, 0, 0, 0);
    } else if (period === 'this_week') {
        start = new Date(now); start.setDate(now.getDate() - 7);
    } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end };
}

module.exports = { getFleetOverview, formatFleetMessage };
