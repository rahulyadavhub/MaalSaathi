// ============================================================
// src/services/notification/jobs/monthlyReport.js
// 1st of every month 9 AM IST — send monthly P&L summary
// ============================================================

'use strict';

const User         = require('../../../models/User');
const Trip         = require('../../../models/Trip');
const Expense      = require('../../../models/Expense');
const Notification = require('../../../models/Notification');
const { sendMessage } = require('../../whatsapp/sender');
const { createLogger } = require('../../../utils/logger');
const log = createLogger('monthlyReport');

async function monthlyReport() {
    log.info('Running monthly report job...');

    try {
        const users = await User.find({
            isOnboarded: true,
            'subscription.plan':     { $in: ['pro', 'fleet'] },
            'subscription.isActive': true,
        }).select('phone name _id');

        // Last month range
        const now        = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastOfMonth  = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const monthName = firstOfMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

        let sent = 0;

        for (const user of users) {
            try {
                const trips = await Trip.find({
                    userId:    user._id,
                    createdAt: { $gte: firstOfMonth, $lte: lastOfMonth },
                });

                const completedTrips = trips.filter(t => t.status === 'completed');
                const totalRevenue   = trips.reduce((s, t) => s + (t.freightAmount || 0), 0);

                const expenses = await Expense.find({
                    userId:    user._id,
                    createdAt: { $gte: firstOfMonth, $lte: lastOfMonth },
                });

                const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);
                const netProfit    = totalRevenue - totalExpense;
                const margin       = totalRevenue > 0
                    ? ((netProfit / totalRevenue) * 100).toFixed(1)
                    : 0;

                const emoji = netProfit >= 0 ? '✅' : '⚠️';

                const message =
                    `📊 ${monthName} Ka Poora Hisaab\n\n` +
                    `🚛 Total Trips: ${trips.length} (${completedTrips.length} complete)\n` +
                    `💰 Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}\n` +
                    `📋 Total Kharcha: ₹${totalExpense.toLocaleString('en-IN')}\n` +
                    `${emoji} Net Profit: ₹${netProfit.toLocaleString('en-IN')}\n` +
                    `📈 Margin: ${margin}%\n\n` +
                    `${netProfit >= 0 ? 'Badhiya mahina raha' : 'Agli baar aur achha karenge'} ${user.name || 'Bhai'}! 💪\n\n` +
                    `PDF report ke liye "report bhejo" likho 📄`;

                await sendMessage(user.phone, message);

                await Notification.create({
                    userId:  user._id,
                    phone:   user.phone,
                    type:    'monthly_report',
                    message,
                    status:  'sent',
                });

                sent++;

            } catch (err) {
                log.warn(`Failed for ${user.phone}: ${err.message}`);
            }
        }

        log.info(`Monthly reports sent: ${sent}/${users.length}`);

    } catch (err) {
        log.error(`monthlyReport error: ${err.message}`);
    }
}

module.exports = { monthlyReport };
