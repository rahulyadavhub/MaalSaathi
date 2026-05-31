// ============================================================
// src/services/payment/razorpayService.js
// Create Razorpay order + verify payment signature
// ============================================================

'use strict';

const crypto = require('crypto');
const { getRazorpay } = require('../../config/razorpay');
const { env } = require('../../config/env');
const Payment = require('../../models/Payment');
const { createLogger } = require('../../utils/logger');
const log = createLogger('razorpayService');

// Create order for plan upgrade
async function createOrder(userId, phone, plan, amountPaise) {
    const razorpay = getRazorpay();
    if (!razorpay) throw new Error('Razorpay not configured');

    const order = await razorpay.orders.create({
        amount:   amountPaise,
        currency: 'INR',
        receipt:  `ms_${userId}_${Date.now()}`,
        notes:    { userId: String(userId), phone, plan },
    });

    // Save to DB
    await Payment.create({
        userId,
        phone,
        razorpayOrderId: order.id,
        amount: amountPaise,
        plan,
        status: 'created',
    });

    log.info(`Order created: ${order.id} | ${phone} | ${plan}`);
    return order;
}

// Verify payment signature from webhook
function verifyPaymentSignature(orderId, paymentId, signature) {
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');
    return expected === signature;
}

// Mark payment as paid in DB
async function markPaid(razorpayOrderId, razorpayPaymentId) {
    const payment = await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { razorpayPaymentId, status: 'paid' },
        { new: true }
    );
    log.info(`Payment marked paid: ${razorpayPaymentId}`);
    return payment;
}

module.exports = { createOrder, verifyPaymentSignature, markPaid };
