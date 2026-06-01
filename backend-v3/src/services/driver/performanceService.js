// ============================================================
// src/services/driver/performanceService.js
// Driver analytics — trips, km, fuel efficiency tracking
// ============================================================

'use strict';

const Driver  = require('../../models/Driver');
const Trip    = require('../../models/Trip');
const Expense = require('../../models/Expense');
const { createLogger } = require('../../utils/logger');
const log = createLogger('performanceService');

// Get driver's performance for a period
async function getDriverPerformance(driverId, period = 'this_month') {
    try {
        const driver = await Driver.findById(driverId);
        if (!driver) throw new Error('Driver not found');

        const { start, end } = getDateRange(period);

        // Get trips during period for this driver's truck
        const trips = await Trip.find({
            truckId:   driver.assignedTruckId,
            createdAt: { $gte: start, $lte: end },
        });

        const completedTrips = trips.filter(t => t.status === 'completed');

        // Get diesel expenses to calculate fuel efficiency
        const expenses = await Expense.find({
            truckId:   driver.assignedTruckId,
            category:  'diesel',
            createdAt: { $gte: start, $lte: end },
        });

        const totalDieselCost   = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        const totalDieselLitres = expenses.reduce((s, e) => s + (e.litres || 0), 0);

        const revenue = trips.reduce((s, t) => s + (t.freightAmount || 0), 0);
        const totalKm = trips.reduce((s, t) => s + (t.distance_km || 0), 0);

        const fuelEfficiency = totalDieselLitres > 0
            ? (totalKm / totalDieselLitres).toFixed(2)
            : 0;

        return {
            driver:         driver.name,
            period,
            trips:          trips.length,
            completedTrips: completedTrips.length,
            totalKm,
            revenue,
            dieselCost:     totalDieselCost,
            dieselLitres:   totalDieselLitres,
            fuelEfficiency: parseFloat(fuelEfficiency),  // km/litre
        };

    } catch (err) {
        log.error(`getDriverPerformance error: ${err.message}`);
        throw err;
    }
}

// Compare multiple drivers
async function compareDrivers(userId, period = 'this_month') {
    const drivers = await Driver.find({ userId, isActive: true });
    return await Promise.all(
        drivers.map(d => getDriverPerformance(d._id, period))
    );
}

// Format performance message for WhatsApp
function formatPerformanceMessage(perf) {
    const emoji = perf.fuelEfficiency >= 4 ? '✅' :
                  perf.fuelEfficiency >= 3 ? '🟡' : '🔴';

    return (
        `🚛 ${perf.driver} — ${perf.period}\n\n` +
        `Trips: ${perf.completedTrips}/${perf.trips}\n` +
        `Total KM: ${perf.totalKm}\n` +
        `Revenue: ₹${perf.revenue.toLocaleString('en-IN')}\n` +
        `Diesel: ₹${perf.dieselCost.toLocaleString('en-IN')} (${perf.dieselLitres}L)\n` +
        `${emoji} Mileage: ${perf.fuelEfficiency} km/L`
    );
}

function getDateRange(period) {
    const now = new Date();
    let start, end = now;

    if (period === 'today')          { start = new Date(now); start.setHours(0,0,0,0); }
    else if (period === 'this_week') { start = new Date(now); start.setDate(now.getDate() - 7); }
    else                              { start = new Date(now.getFullYear(), now.getMonth(), 1); }

    return { start, end };
}

module.exports = { getDriverPerformance, compareDrivers, formatPerformanceMessage };
