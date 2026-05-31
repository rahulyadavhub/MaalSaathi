// Pure logic tests — koi DB/AI dependency nahi
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');

const { parseAmount } = require('../src/services/parser/amountParser');
const { parseTrip }   = require('../src/services/parser/tripParser');
const {
    parseExpenses,
    parseSingleExpense,
    isMultiExpense,
} = require('../src/services/parser/expenseParser');

describe('amountParser', () => {
    test('"5k" → 5000', () => {
        assert.strictEqual(parseAmount('5k'), 5000);
    });
    test('"1.5 lakh" → 150000', () => {
        assert.strictEqual(parseAmount('1.5 lakh'), 150000);
    });
    test('"28000" → 28000', () => {
        assert.strictEqual(parseAmount('28000'), 28000);
    });
});

describe('tripParser', () => {
    test('basic route + freight', () => {
        const r = parseTrip('mumbai to pune 28000');
        assert.strictEqual(r?.origin, 'Mumbai');
        assert.strictEqual(r?.destination, 'Pune');
        assert.strictEqual(r?.freight, 28000);
    });

    test('weight + cargo + freight', () => {
        const r = parseTrip('Mumbai se Pune 12 ton cement 28000');
        assert.strictEqual(r?.cargoWeightTons, 12);
        assert.strictEqual(r?.cargoType, 'cement');
    });

    test('short form "5k" works', () => {
        const r = parseTrip('del se blr 5k cement');
        assert.ok(r?.origin);
        assert.ok(r?.destination);
        assert.strictEqual(r?.freight, 5000);
    });

    test('non-route text returns null', () => {
        const r = parseTrip('namaste bhai');
        assert.strictEqual(r, null);
    });
});

describe('expenseParser', () => {
    test('single expense', () => {
        const r = parseSingleExpense('diesel 4500');
        assert.strictEqual(r?.category, 'diesel');
        assert.strictEqual(r?.amount, 4500);
    });

    test('multi-expense with explicit categories', () => {
        assert.strictEqual(isMultiExpense('diesel 5000, toll 200, food 150'), true);
        const arr = parseExpenses('diesel 5000, toll 200');
        assert.strictEqual(arr.length, 2);
    });

    test('Bug 8 fix: profit-talk NOT expense', () => {
        assert.strictEqual(isMultiExpense('8000 mila, 2000 baki'), false);
    });

    test('Bug 8 fix: random numbers NOT expense', () => {
        assert.strictEqual(isMultiExpense('123 abc, 456 def'), false);
    });

    test('partial: diesel + bare number IS multi-expense (1 named OK)', () => {
        assert.strictEqual(isMultiExpense('diesel 5000, 2000'), true);
    });
});
