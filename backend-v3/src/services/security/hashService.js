// ============================================================
// src/services/security/hashService.js
// bcrypt hashing — OTP + passwords
// NEVER store plain text OTPs or passwords
// ============================================================

'use strict';

const bcrypt = require('bcryptjs');
const { OTP_CONFIG } = require('../../constants/otpConfig');
const { createLogger } = require('../../utils/logger');
const log = createLogger('hashService');

// Hash any string (OTP, password)
async function hash(value) {
    try {
        return await bcrypt.hash(String(value), OTP_CONFIG.BCRYPT_ROUNDS);
    } catch (err) {
        log.error(`Hash failed: ${err.message}`);
        throw err;
    }
}

// Compare plain value with hashed
async function compare(plain, hashed) {
    try {
        return await bcrypt.compare(String(plain), hashed);
    } catch (err) {
        log.error(`Compare failed: ${err.message}`);
        return false;
    }
}

module.exports = { hash, compare };
