// ============================================================
// src/middleware/verifyRazorpay.js
// Verify Razorpay webhook signature — security critical
// ============================================================

'use strict';

const crypto = require('crypto');
const { env } = require('../config/env');
const { createLogger } = require('../utils/logger');
const log = createLogger('verifyRazorpay');

function verifyRazorpay(req, res, next) {
    try {
        const signature = req.headers['x-razorpay-signature'];

        if (!signature) {
            log.warn('Razorpay webhook — missing signature');
            return res.status(400).json({ error: 'Missing signature' });
        }

        const body = JSON.stringify(req.body);

        const expected = crypto
            .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
            .update(body)
            .digest('hex');

        if (expected !== signature) {
            log.warn('Razorpay webhook — invalid signature');
            return res.status(403).json({ error: 'Invalid signature' });
        }

        log.info('Razorpay webhook verified ✅');
        next();

    } catch (err) {
        log.error(`verifyRazorpay error: ${err.message}`);
        return res.status(500).json({ error: 'Verification failed' });
    }
}

module.exports = { verifyRazorpay };
