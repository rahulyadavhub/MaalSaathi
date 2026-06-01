// ============================================================
// src/services/notification/jobs/dailyExpenseReminder.js
// Every day 8 PM IST — remind users to log expenses
// ============================================================

'use strict';

const User         = require('../../../models/User');
const Trip         = require('../../../models/Trip');
const Notification = require('../../../models/Notification');
const { sendMessage } = require('../../whatsapp/sender');
const { createLogger } = require('../../../utils/logger');
const log = createLogger('dailyReminder');

async function dailyExpenseReminder() {
    log.info('Running daily expense reminder job...');

    try {
        // Get all PRO + FLEET users who are onboarded
        const users = await User.find({
            isOnboarded: true,
            'subscription.plan': { $in: ['pro', 'fleet'] },
            'subscription.isActive': true,
        }).select('phone name');

        let sent = 0;

        for (const user of users) {
            try {
                // Check if user has active trip
                const activeTrip = await Trip.findOne({
                    userId: user._id,
                    status: 'active',
                });

                let message;
                if (activeTrip) {
                    message =
                        `🚛 ${user.name || 'Bhai'}, aaj ka kharcha daala?\n\n` +
                        `Active trip: ${activeTrip.origin} → ${activeTrip.destination}\n\n` +
                        `Diesel, toll, khana — jo bhi hua likho abhi 📝`;
                } else {
                    message =
                        `🚛 ${user.name || 'Bhai'}, aaj koi trip chal raha hai?\n\n` +
                        `Kharcha track karna mat bhoolna!\n` +
                        `"trip start" likhke shuru karo 📝`;
                }

                await sendMessage(user.phone, message);

                // Log notification
                await Notification.create({
                    userId:  user._id,
                    phone:   user.phone,
                    type:    'daily_reminder',
                    message,
                    status:  'sent',
                });

                sent++;

            } catch (err) {
                log.warn(`Failed for ${user.phone}: ${err.message}`);
            }
        }

        log.info(`Daily reminder sent to ${sent}/${users.length} users`);

    } catch (err) {
        log.error(`dailyExpenseReminder error: ${err.message}`);
    }
}

module.exports = { dailyExpenseReminder };
