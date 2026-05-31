// ============================================================
// src/services/trip/tripStateMachine.js
// Trip state machine — enforces valid lifecycle transitions
// ============================================================

'use strict';

const { TRIP_STATUS, canTransition } = require('../../constants/tripStatus');
const { createLogger } = require('../../utils/logger');
const log = createLogger('tripState');

class TripStateMachineError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}

// ──────────────────────────────────────────────────────────
// Validate + perform status transition on a Trip document
// Throws if transition is invalid
// ──────────────────────────────────────────────────────────
function transition(trip, newStatus) {
    if (!trip) {
        throw new TripStateMachineError('Trip not found', 'TRIP_NOT_FOUND');
    }
    if (trip.status === newStatus) {
        log.warn(`Trip ${trip._id} already in ${newStatus}`);
        return trip;
    }
    if (!canTransition(trip.status, newStatus)) {
        throw new TripStateMachineError(
            `Invalid transition: ${trip.status} → ${newStatus}`,
            'INVALID_TRANSITION'
        );
    }

    const oldStatus = trip.status;
    trip.status = newStatus;

    // Auto-set timestamps
    const now = new Date();
    if (newStatus === TRIP_STATUS.COMPLETED && !trip.completedAt) {
        trip.completedAt = now;
    }
    if (newStatus === TRIP_STATUS.CANCELLED && !trip.cancelledAt) {
        trip.cancelledAt = now;
    }

    log.info(`Trip ${trip._id}: ${oldStatus} → ${newStatus}`);
    return trip;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function isActive(trip)   { return trip?.status === TRIP_STATUS.ACTIVE; }
function isPending(trip)  { return trip?.status === TRIP_STATUS.PENDING_CONFIRMATION; }
function isDraft(trip)    { return trip?.status === TRIP_STATUS.DRAFT; }
function isTerminal(trip) {
    return trip?.status === TRIP_STATUS.COMPLETED || trip?.status === TRIP_STATUS.CANCELLED;
}

module.exports = {
    transition,
    isActive, isPending, isDraft, isTerminal,
    TripStateMachineError,
};
