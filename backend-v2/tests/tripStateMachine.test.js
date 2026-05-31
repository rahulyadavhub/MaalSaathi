'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { canTransition, TRIP_STATUS } = require('../src/constants/tripStatus');

describe('Trip state machine — happy path', () => {
    test('draft → pending_confirmation', () => {
        assert.strictEqual(canTransition(TRIP_STATUS.DRAFT, TRIP_STATUS.PENDING_CONFIRMATION), true);
    });
    test('pending_confirmation → active', () => {
        assert.strictEqual(canTransition(TRIP_STATUS.PENDING_CONFIRMATION, TRIP_STATUS.ACTIVE), true);
    });
    test('active → completed', () => {
        assert.strictEqual(canTransition(TRIP_STATUS.ACTIVE, TRIP_STATUS.COMPLETED), true);
    });
});

describe('Trip state machine — cancellations', () => {
    test('draft → cancelled allowed', () => {
        assert.strictEqual(canTransition(TRIP_STATUS.DRAFT, TRIP_STATUS.CANCELLED), true);
    });
    test('pending_confirmation → cancelled allowed', () => {
        assert.strictEqual(canTransition(TRIP_STATUS.PENDING_CONFIRMATION, TRIP_STATUS.CANCELLED), true);
    });
    test('active → cancelled allowed', () => {
        assert.strictEqual(canTransition(TRIP_STATUS.ACTIVE, TRIP_STATUS.CANCELLED), true);
    });
});

describe('Trip state machine — terminal states are locked', () => {
    test('completed → active NOT allowed', () => {
        assert.strictEqual(canTransition(TRIP_STATUS.COMPLETED, TRIP_STATUS.ACTIVE), false);
    });
    test('completed → cancelled NOT allowed', () => {
        assert.strictEqual(canTransition(TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED), false);
    });
    test('cancelled → active NOT allowed', () => {
        assert.strictEqual(canTransition(TRIP_STATUS.CANCELLED, TRIP_STATUS.ACTIVE), false);
    });
});

describe('Trip state machine — invalid skip transitions', () => {
    test('draft → active NOT allowed (must go through pending)', () => {
        assert.strictEqual(canTransition(TRIP_STATUS.DRAFT, TRIP_STATUS.ACTIVE), false);
    });
    test('draft → completed NOT allowed', () => {
        assert.strictEqual(canTransition(TRIP_STATUS.DRAFT, TRIP_STATUS.COMPLETED), false);
    });
    test('pending_confirmation → completed NOT allowed', () => {
        assert.strictEqual(canTransition(TRIP_STATUS.PENDING_CONFIRMATION, TRIP_STATUS.COMPLETED), false);
    });
});
