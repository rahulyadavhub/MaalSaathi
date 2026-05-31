// ============================================================
// src/constants/otpConfig.js
// OTP settings — expiry, attempts, length
// ============================================================

'use strict';

const OTP_CONFIG = {
    LENGTH:         6,          // 6-digit OTP
    EXPIRY_MINUTES: 10,         // valid for 10 minutes
    MAX_ATTEMPTS:   3,          // max wrong attempts
    LOCK_MINUTES:   30,         // lockout after max attempts
    BCRYPT_ROUNDS:  10,         // hashing strength
};

const OTP_PURPOSE = {
    SUBSCRIPTION: 'subscription',
    LOGIN:        'login',
    VERIFY:       'verify',
};

const OTP_MESSAGES = {
    SENT:     'OTP aapke number pe SMS hua hai ✅\n10 minute mein enter karo',
    WRONG:    '❌ Galat OTP.',
    EXPIRED:  '⏰ OTP expire ho gaya\n"resend" likhke naya mangao',
    LOCKED:   '🔒 Bahut zyada galat attempts\n30 minute baad try karo',
    VERIFIED: '✅ OTP verified!',
};

module.exports = { OTP_CONFIG, OTP_PURPOSE, OTP_MESSAGES };
