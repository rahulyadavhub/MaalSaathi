// ============================================================
// src/services/notification/jobs/planExpiryReminder.js
// Every day 11 AM IST — remind users before plan expires
// ============================================================

'use strict';

const User         = require('../../../models/User');
const Notification = require('../../../models/Notification');
const { sendMessage } = require('../../whatsapp/sender');
const { createLogger } = require('../../../utils/logger');
const log = createLogger('planExpiry');

const REMIND_DAYS = [7, 3, 1];

async function planExpiryReminder() {
    log.info('Running plan expiry reminder job...');

    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let sent = 0;

        for (const days of REMIND_DAYS) {
            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + days);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);

            const users = await User.find({
                'subscription.isActive': true,
                'subscription.plan':     { $in: ['pro', 'fleet'] },
                'subscription.endDate':  { $gte: targetDate, $lt: nextDay },
            }).select('phone name subscription');

            for (const user of users) {
                try {
                    const plan  = user.subscription.plan.toUpperCase();
                    const price = plan === 'PRO' ? '₹299' : '₹999';
                    const emoji = days === 1 ? '🔴' : days === 3 ? '🟠' : '🟡';

                    const message =
                        `${emoji} ${plan} Plan ${days === 1 ? 'Kal' : `${days} din mein`} expire ho raha hai!\n\n` +
                        `📅 Expiry: ${user.subscription.endDate.toLocaleDateString('en-IN')}\n\n` +
                        `Renew karo aur sab features use karte raho 🚛\n` +
                        `"renew" likhke ${price}/month mein continue karo`;

                    await sendMessage(user.phone, message);

                    await Notification.create({
                        userId:  user._id,
                        phone:   user.phone,
                        type:    'plan_expiry',
                        message,
                        status:  'sent',
                    });

                    sent++;

                } catch (err) {
                    log.warn(`Failed for ${user.phone}: ${err.message}`);
                }
            }
        }

        log.info(`Plan expiry reminders sent: ${sent}`);

    } catch (err) {
        log.error(`planExpiryReminder error: ${err.message}`);
    }
}

module.exports = { planExpiryReminder };
