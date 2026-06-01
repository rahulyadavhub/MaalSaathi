// ============================================================
// src/services/subscription/subscriptionService.js
// Activate, check, expire plans
// ============================================================

'use strict';

const User         = require('../../models/User');
const Subscription = require('../../models/Subscription');
const { PLAN, PLAN_DURATION_DAYS } = require('../../constants/subscriptionPlans');
const { createLogger } = require('../../utils/logger');
const log = createLogger('subscriptionService');

// Activate plan after OTP verified
async function activate(userId, plan, paymentId) {
    const startDate = new Date();
    const endDate   = new Date();
    endDate.setDate(endDate.getDate() + PLAN_DURATION_DAYS);

    // Update User subscription
    await User.findByIdAndUpdate(userId, {
        'subscription.plan':      plan,
        'subscription.startDate': startDate,
        'subscription.endDate':   endDate,
        'subscription.isActive':  true,
        'subscription.paymentId': paymentId,
    });

    // Log in Subscription history
    await Subscription.create({
        userId,
        plan,
        paymentId,
        startDate,
        endDate,
        isActive: true,
    });

    log.info(`Plan activated: ${plan} for user ${userId}`);
    return { plan, startDate, endDate };
}

// Check if user's plan is active
async function isActive(userId) {
    const user = await User.findById(userId).select('subscription');
    if (!user) return false;

    const { plan, isActive, endDate } = user.subscription;
    if (plan === PLAN.FREE) return true;
    if (!isActive) return false;
    if (new Date() > new Date(endDate)) {
        await expire(userId);
        return false;
    }
    return true;
}

// Get user's current plan
async function getPlan(userId) {
    const user = await User.findById(userId).select('subscription');
    if (!user) return PLAN.FREE;
    return user.subscription?.plan || PLAN.FREE;
}

// Expire plan — called by cron or on check
async function expire(userId) {
    await User.findByIdAndUpdate(userId, {
        'subscription.plan':     PLAN.FREE,
        'subscription.isActive': false,
        'subscription.endDate':  new Date(),
    });

    await Subscription.findOneAndUpdate(
        { userId, isActive: true },
        { isActive: false, expiredAt: new Date() }
    );

    log.info(`Plan expired for user: ${userId}`);
}

// Days remaining in plan
async function daysRemaining(userId) {
    const user = await User.findById(userId).select('subscription');
    if (!user || user.subscription?.plan === PLAN.FREE) return 0;

    const endDate = new Date(user.subscription.endDate);
    const today   = new Date();
    const diff    = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
}

module.exports = { activate, isActive, getPlan, expire, daysRemaining };
