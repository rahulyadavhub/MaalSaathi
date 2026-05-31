// ============================================================
// src/services/trip/tripService.js
// Trip CRUD + lifecycle
// Stats updates delegated to userStatsService (DRY)
// ============================================================

'use strict';

const Trip = require('../../models/Trip');
const { TRIP_STATUS } = require('../../constants/tripStatus');
const { transition } = require('./tripStateMachine');
const userStats = require('../user/userStatsService');
const { createLogger } = require('../../utils/logger');
const log = createLogger('tripService');

async function getActiveTrip(userId) {
    return Trip.findOne({ userId, status: TRIP_STATUS.ACTIVE }).sort({ startedAt: -1 });
}

async function getPendingTrip(userId) {
    return Trip.findOne({ userId, status: TRIP_STATUS.PENDING_CONFIRMATION }).sort({ createdAt: -1 });
}

async function createDraft(userId, parsedTrip) {
    const trip = await Trip.create({
        userId,
        origin:          parsedTrip.origin,
        destination:     parsedTrip.destination,
        cargoType:       parsedTrip.cargoType || null,
        cargoWeightTons: parsedTrip.cargoWeightTons || null,
        freightAmount:   parsedTrip.freight || 0,
        advancePaid:     parsedTrip.advance || 0,
        status:          TRIP_STATUS.DRAFT,
    });
    log.info(`Draft trip: ${trip._id} (${trip.origin}→${trip.destination})`);
    return trip;
}

async function createPending(userId, parsedTrip, truckReg = null) {
    const trip = await Trip.create({
        userId,
        truckRegistration: truckReg,
        origin:          parsedTrip.origin,
        destination:     parsedTrip.destination,
        cargoType:       parsedTrip.cargoType || null,
        cargoWeightTons: parsedTrip.cargoWeightTons || null,
        freightAmount:   parsedTrip.freight,
        advancePaid:     parsedTrip.advance || 0,
        driverName:      parsedTrip.driverName || null,
        status:          TRIP_STATUS.PENDING_CONFIRMATION,
    });
    log.info(`Pending trip: ${trip._id}`);
    return trip;
}

async function confirmTrip(tripId) {
    const trip = await Trip.findById(tripId);
    if (!trip) throw new Error('Trip not found');

    transition(trip, TRIP_STATUS.ACTIVE);
    trip.startedAt = new Date();
    await trip.save();

    await userStats.recordTripStarted(trip.userId);
    log.info(`Trip activated: ${tripId}`);
    return trip;
}

async function setFreightAndPromote(tripId, freight, advance = 0) {
    const trip = await Trip.findById(tripId);
    if (!trip) throw new Error('Trip not found');

    trip.freightAmount = freight;
    trip.advancePaid   = advance;
    transition(trip, TRIP_STATUS.PENDING_CONFIRMATION);
    await trip.save();
    return trip;
}

async function completeTrip(userId) {
    const trip = await getActiveTrip(userId);
    if (!trip) return null;

    transition(trip, TRIP_STATUS.COMPLETED);
    await trip.save();

    const revenue  = trip.freightAmount || 0;
    const expenses = trip.expenses.reduce((s, e) => s + e.amount, 0);

    // Stats: revenue + trip count (expenses counted in expenseService — no double count)
    await userStats.recordTripCompleted(trip.userId, revenue);

    log.info(`Trip completed: ${trip._id}`, { revenue, expenses, net: revenue - expenses });
    return trip;
}

async function cancelTrip(tripId) {
    const trip = await Trip.findById(tripId);
    if (!trip) return null;

    transition(trip, TRIP_STATUS.CANCELLED);
    await trip.save();
    await userStats.recordTripCancelled(trip.userId);
    return trip;
}

async function cancelAllOpen(userId) {
    const openTrips = await Trip.find({
        userId,
        status: { $in: [TRIP_STATUS.DRAFT, TRIP_STATUS.PENDING_CONFIRMATION] },
    });
    for (const t of openTrips) {
        transition(t, TRIP_STATUS.CANCELLED);
        await t.save();
    }
    return openTrips.length;
}

async function getProfitForPeriod(userId, startDate, endDate = new Date()) {
    const trips = await Trip.find({
        userId,
        startedAt: { $gte: startDate, $lte: endDate },
    });

    const revenue   = trips.reduce((s, t) => s + (t.freightAmount || 0), 0);
    const expenses  = trips.reduce((s, t) => s + t.expenses.reduce((es, e) => es + e.amount, 0), 0);
    const completed = trips.filter(t => t.status === TRIP_STATUS.COMPLETED).length;
    const active    = trips.filter(t => t.status === TRIP_STATUS.ACTIVE).length;

    return {
        tripCount: trips.length,
        completed,
        active,
        revenue,
        expenses,
        netProfit: revenue - expenses,
        trips,
    };
}

module.exports = {
    getActiveTrip,
    getPendingTrip,
    createDraft,
    createPending,
    confirmTrip,
    setFreightAndPromote,
    completeTrip,
    cancelTrip,
    cancelAllOpen,
    getProfitForPeriod,
};
