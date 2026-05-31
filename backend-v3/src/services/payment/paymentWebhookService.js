// ============================================================
// src/services/payment/paymentWebhookService.js
// Handle Razorpay webhook events — payment.captured
// ============================================================

'use strict';

const { markPaid, verifyPaymentSignature } = require('./razorpayService');
const { generateOTP, saveOTP }            = require('../otp/otpService');
const { sendOTP }                          = require('../otp/msg91Service');
const { sendMessage }                      = require('../whatsapp/sender');
const User                                 = require('../../models/User');
const { createLogger }                     = require('../../utils/logger');
const log = createLogger('paymentWebhook');

async function handleWebhook(event, body) {
    const eventType = event?.event;
    log.info(`Webhook received: ${eventType}`);

    if (eventType === 'payment.captured') {
        return await handlePaymentCaptured(event);
    }

    if (eventType === 'payment.failed') {
        return await handlePaymentFailed(event);
    }

    log.info(`Unhandled event: ${eventType}`);
}

// ── Payment success ──
async function handlePaymentCaptured(event) {
    try {
        const { order_id, id: paymentId, contact } = event.payload.payment.entity;

        // Mark payment paid in DB
        const payment = await markPaid(order_id, paymentId);
        if (!payment) {
            log.warn(`Payment not found for order: ${order_id}`);
            return;
        }

        const phone = payment.phone;

        // Find user
        const user = await User.findById(payment.userId);
        if (!user) return;

        // Generate OTP
        const otp = await generateOTP();
        await saveOTP(phone, otp, paymentId, 'subscription');

        // Send OTP via MSG91 SMS
        await sendOTP(phone, otp);

        // Notify on WhatsApp
        await sendMessage(phone,
            `✅ Payment received! ₹${payment.amount / 100}\n\n` +
            `OTP aapke number pe SMS hua hai 📱\n` +
            `10 minute mein enter karo activate karne ke liye:`
        );

        log.info(`Payment captured + OTP sent: ${phone}`);

    } catch (err) {
        log.error(`handlePaymentCaptured error: ${err.message}`);
    }
}

// ── Payment failed ──
async function handlePaymentFailed(event) {
    try {
        const { order_id, contact } = event.payload.payment.entity;
        const phone = contact?.replace('+91', '') || null;

        if (phone) {
            await sendMessage(phone,
                `❌ Payment fail ho gaya\n\n` +
                `Dobara try karo — "upgrade" likhke`
            );
        }

        log.warn(`Payment failed for order: ${order_id}`);

    } catch (err) {
        log.error(`handlePaymentFailed error: ${err.message}`);
    }
}

module.exports = { handleWebhook };
