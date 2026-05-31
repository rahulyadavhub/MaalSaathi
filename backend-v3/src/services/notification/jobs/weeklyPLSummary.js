// ============================================================
// src/services/notification/jobs/weeklyPLSummary.js
// Every Sunday 9 AM IST — send weekly P&L summary
// ============================================================

'use strict';

const User         = require('../../../models/User');
const Trip         = require('../../../models/Trip');
const Expense      = require('../../../models/Expense');
const Notification = require('../../../models/Notification');
const { sendMessage } = require('../../whatsapp/sender');
const { createLogger } = require('../../../utils/logger');
const log = createLogger('weeklyPL');

async function weeklyPLSummary() {
    log.info('Running weekly P&L summary job...');

    try {
        const users = await User.find({
            isOnboarded: true,
            'subscription.plan': { $in: ['pro', 'fleet'] },
            'subscription.isActive': true,
        }).select('phone name _id');

        // Last 7 days range
        const now   = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);

        let sent = 0;

        for (const user of users) {
            try {
                // Get this week's trips
                const trips = await Trip.find({
                    userId:    user._id,
                    createdAt: { $gte: start, $lte: now },
                });

                const totalRevenue = trips.reduce((s, t) => s + (t.freightAmount || 0), 0);

                // Get this week's expenses
                const expenses = await Expense.find({
                    userId:    user._id,
                    createdAt: { $gte: start, $lte: now },
                });

                const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);
                const netProfit    = totalRevenue - totalExpense;
                const emoji        = netProfit >= 0 ? '✅' : '⚠️';

                const message =
                    `📊 Is hafte ka hisaab (${start.toLocaleDateString('en-IN')} - aaj)\n\n` +
                    `🚛 Trips: ${trips.length}\n` +
                    `💰 Revenue: ₹${totalRevenue.toLocaleString('en-IN')}\n` +
                    `📋 Kharcha: ₹${totalExpense.toLocaleString('en-IN')}\n` +
                    `${emoji} Net Profit: ₹${netProfit.toLocaleString('en-IN')}\n\n` +
                    `Badhiya kaam karo ${user.name || 'Bhai'}! 💪`;

                await sendMessage(user.phone, message);

                await Notification.create({
                    userId:  user._id,
                    phone:   user.phone,
                    type:    'weekly_summary',
                    message,
                    status:  'sent',
                });

                sent++;

            } catch (err) {
                log.warn(`Failed for ${user.phone}: ${err.message}`);
            }
        }

        log.info(`Weekly P&L sent to ${sent}/${users.length} users`);

    } catch (err) {
        log.error(`weeklyPLSummary error: ${err.message}`);
    }
}

module.exports = { weeklyPLSummary };
