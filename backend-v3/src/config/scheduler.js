// ============================================================
// src/config/scheduler.js
// node-cron master setup — all cron jobs registered here
// ============================================================

'use strict';

const cron = require('node-cron');
const { createLogger } = require('../utils/logger');
const log = createLogger('scheduler');

// Jobs will be imported here as they are built
// const { dailyExpenseReminder }  = require('../services/notification/jobs/dailyExpenseReminder');
// const { weeklyPLSummary }       = require('../services/notification/jobs/weeklyPLSummary');
// const { documentExpiryAlert }   = require('../services/notification/jobs/documentExpiryAlert');
// const { tripFollowup }          = require('../services/notification/jobs/tripFollowup');
// const { monthlyReport }         = require('../services/notification/jobs/monthlyReport');
// const { planExpiryReminder }    = require('../services/notification/jobs/planExpiryReminder');

function startScheduler() {
    log.info('Scheduler starting...');

    // ── Daily Expense Reminder — every day at 8 PM IST ──
    // cron.schedule('0 20 * * *', dailyExpenseReminder, {
    //     timezone: 'Asia/Kolkata'
    // });

    // ── Weekly P&L Summary — every Sunday at 9 AM IST ──
    // cron.schedule('0 9 * * 0', weeklyPLSummary, {
    //     timezone: 'Asia/Kolkata'
    // });

    // ── Document Expiry Alert — every day at 10 AM IST ──
    // cron.schedule('0 10 * * *', documentExpiryAlert, {
    //     timezone: 'Asia/Kolkata'
    // });

    // ── Trip Follow-up — every 12 hours ──
    // cron.schedule('0 */12 * * *', tripFollowup, {
    //     timezone: 'Asia/Kolkata'
    // });

    // ── Monthly Report — 1st of every month at 9 AM IST ──
    // cron.schedule('0 9 1 * *', monthlyReport, {
    //     timezone: 'Asia/Kolkata'
    // });

    // ── Plan Expiry Reminder — every day at 11 AM IST ──
    // cron.schedule('0 11 * * *', planExpiryReminder, {
    //     timezone: 'Asia/Kolkata'
    // });

    log.info('Scheduler ready — 6 jobs registered');
}

module.exports = { startScheduler };
