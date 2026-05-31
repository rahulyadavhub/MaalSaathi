// ============================================================
// src/constants/tripStatus.js
// Trip lifecycle states — state machine ke liye
// ============================================================

'use strict';

const TRIP_STATUS = Object.freeze({
    DRAFT:                 'draft',                  // Route mil gaya, freight nahi
    PENDING_CONFIRMATION:  'pending_confirmation',   // Sab info hai, "haan" ka wait
    ACTIVE:                'active',                 // Saved, expenses chalu
    COMPLETED:             'completed',              // Trip done, final P&L
    CANCELLED:             'cancelled',              // User ne mana kiya
});

// Valid status transitions (state machine rules)
const ALLOWED_TRANSITIONS = Object.freeze({
    [TRIP_STATUS.DRAFT]:                [TRIP_STATUS.PENDING_CONFIRMATION, TRIP_STATUS.CANCELLED],
    [TRIP_STATUS.PENDING_CONFIRMATION]: [TRIP_STATUS.ACTIVE, TRIP_STATUS.CANCELLED],
    [TRIP_STATUS.ACTIVE]:               [TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED],
    [TRIP_STATUS.COMPLETED]:            [],  // Terminal state
    [TRIP_STATUS.CANCELLED]:            [],  // Terminal state
});

function canTransition(fromStatus, toStatus) {
    const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
    return allowed.includes(toStatus);
}

const ALL_STATUSES = Object.values(TRIP_STATUS);

module.exports = {
    TRIP_STATUS,
    ALLOWED_TRANSITIONS,
    canTransition,
    ALL_STATUSES,
};
