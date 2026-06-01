// ============================================================
// src/services/analytics/fuelEfficiency.js
// Track km/litre per truck + driver
// ============================================================

'use strict';

const Trip    = require('../../models/Trip');
const Expense = require('../../models/Expense');
const Truck   = require('../../models/Truck');
const { createLogger } = require('../../utils/logger');
const log = createLogger('fuelEfficiency');

// Calculate fuel efficiency for a truck in a period
async function calculateForTruck(truckId, startDate, endDate) {
    try {
        const trips = await Trip.find({
            truckId,
            createdAt: { $gte: startDate, $lte: endDate },
        });

        const dieselExpenses = await Expense.find({
            truckId,
            category:  'diesel',
            createdAt: { $gte: startDate, $lte: endDate },
        });

        const totalKm     = trips.reduce((s, t) => s + (t.distance_km || 0), 0);
        const totalLitres = dieselExpenses.reduce((s, e) => s + (e.litres || 0), 0);
        const totalCost   = dieselExpenses.reduce((s, e) => s + (e.amount || 0), 0);

        const efficiency  = totalLitres > 0 ? (totalKm / totalLitres) : 0;
        const costPerKm   = totalKm > 0 ? (totalCost / totalKm) : 0;

        return {
            truckId,
            totalKm,
            totalLitres,
            totalCost,
            efficiency:  parseFloat(efficiency.toFixed(2)),
            costPerKm:   parseFloat(costPerKm.toFixed(2)),
            rating:      getRating(efficiency),
        };

    } catch (err) {
        log.error(`calculateForTruck error: ${err.message}`);
        throw err;
    }
}

// Compare all trucks
async function compareAllTrucks(userId, period = 'this_month') {
    const { start, end } = getDateRange(period);
    const trucks = await Truck.find({ userId, isActive: true });

    return await Promise.all(trucks.map(async (truck) => {
        const stats = await calculateForTruck(truck._id, start, end);
        return {
            truck: truck.registrationNumber,
            ...stats,
        };
    }));
}

// Rating: Excellent / Good / Average / Poor
function getRating(kmPerLitre) {
    if (kmPerLitre >= 5)   return 'excellent';
    if (kmPerLitre >= 4)   return 'good';
    if (kmPerLitre >= 3)   return 'average';
    return 'poor';
}

function getDateRange(period) {
    const now = new Date();
    let start, end = now;

    if (period === 'this_week') { start = new Date(now); start.setDate(now.getDate() - 7); }
    else                         { start = new Date(now.getFullYear(), now.getMonth(), 1); }

    return { start, end };
}

module.exports = { calculateForTruck, compareAllTrucks, getRating };
