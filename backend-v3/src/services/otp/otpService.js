// ============================================================
// src/services/otp/otpService.js
// Generate, store, verify OTP — bcrypt hashed
// ============================================================

'use strict';

const OTPModel = require('../../models/OTP');
const { hash, compare } = require('../security/hashService');
const { OTP_CONFIG, OTP_PURPOSE } = require('../../constants/otpConfig');
const { createLogger } = require('../../utils/logger');
const log = createLogger('otpService');

// Generate random 6-digit OTP
function generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

// Create + store hashed OTP in DB
async function createOTP(phone, purpose = OTP_PURPOSE.SUBSCRIPTION, paymentId = null) {
    try {
        // Delete any existing unused OTPs for this phone
        await OTPModel.deleteMany({ phone, used: false });

        const otp = generateOTP();
        const hashedOTP = await hash(otp);

        const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

        await OTPModel.create({
            phone,
            otp: hashedOTP,
            paymentId,
            purpose,
            expiresAt,
        });

        log.info(`OTP created for ${phone}`);
        return otp; // Return plain OTP to send via SMS
    } catch (err) {
        log.error(`createOTP failed: ${err.message}`);
        throw err;
    }
}

// Verify OTP entered by user
async function verifyOTP(phone, enteredOTP) {
    try {
        const record = await OTPModel.findOne({ phone, used: false }).sort({ createdAt: -1 });

        if (!record) return { success: false, reason: 'not_found' };

        // Check expiry
        if (record.expiresAt < new Date()) {
            await OTPModel.deleteOne({ _id: record._id });
            return { success: false, reason: 'expired' };
        }

        // Check max attempts
        if (record.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
            return { success: false, reason: 'locked' };
        }

        // Compare OTP
        const isValid = await compare(enteredOTP, record.otp);

        if (!isValid) {
            await OTPModel.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
            const remaining = OTP_CONFIG.MAX_ATTEMPTS - (record.attempts + 1);
            return { success: false, reason: 'wrong', remaining };
        }

        // Mark as used
        await OTPModel.updateOne({ _id: record._id }, { used: true });

        log.info(`OTP verified for ${phone}`);
        return { success: true, paymentId: record.paymentId };

    } catch (err) {
        log.error(`verifyOTP failed: ${err.message}`);
        throw err;
    }
}

module.exports = { createOTP, verifyOTP, generateOTP };
