// ============================================================
// src/services/otp/msg91Service.js
// Send OTP SMS via MSG91 API — DLT compliant
// ============================================================

'use strict';

const axios = require('axios');
const { env } = require('../../config/env');
const { createLogger } = require('../../utils/logger');
const log = createLogger('msg91');

const MSG91_URL = 'https://api.msg91.com/api/v5/otp';

async function sendOTP(phone, otp) {
    if (!env.MSG91_API_KEY) {
        log.warn('MSG91 not configured — OTP not sent');
        return { ok: false, reason: 'MSG91 not configured' };
    }

    // Remove +91 if present, keep 10 digits
    const cleanPhone = String(phone).replace(/^\+?91/, '').slice(-10);

    try {
        const response = await axios.post(MSG91_URL, {
            template_id: env.MSG91_TEMPLATE_ID,
            mobile:      `91${cleanPhone}`,
            authkey:     env.MSG91_API_KEY,
            otp,
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000,
        });

        log.info(`OTP SMS sent to ${cleanPhone}`);
        return { ok: true, data: response.data };

    } catch (err) {
        log.error(`MSG91 send failed: ${err.message}`);
        return { ok: false, reason: err.message };
    }
}

async function resendOTP(phone) {
    const cleanPhone = String(phone).replace(/^\+?91/, '').slice(-10);

    try {
        const response = await axios.get(`https://api.msg91.com/api/v5/otp/retry`, {
            params: {
                authkey: env.MSG91_API_KEY,
                mobile:  `91${cleanPhone}`,
                retrytype: 'text',
            },
            timeout: 5000,
        });

        log.info(`OTP resent to ${cleanPhone}`);
        return { ok: true, data: response.data };

    } catch (err) {
        log.error(`MSG91 resend failed: ${err.message}`);
        return { ok: false, reason: err.message };
    }
}

module.exports = { sendOTP, resendOTP };
