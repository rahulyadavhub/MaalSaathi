// ============================================================
// src/config/razorpay.js
// Razorpay singleton instance
// ============================================================

'use strict';

const Razorpay = require('razorpay');
const { env } = require('./env');
const { createLogger } = require('../utils/logger');
const log = createLogger('razorpay');

let instance = null;

function getRazorpay() {
    if (!instance) {
        if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
            log.warn('Razorpay not configured — payment features disabled');
            return null;
        }
        instance = new Razorpay({
            key_id:     env.RAZORPAY_KEY_ID,
            key_secret: env.RAZORPAY_KEY_SECRET,
        });
        log.info('Razorpay instance created');
    }
    return instance;
}

function isConfigured() {
    return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

module.exports = { getRazorpay, isConfigured };
