// ============================================================
// src/services/notification/jobs/tripFollowup.js
// Every 12 hours — ping users with active trips > 12 hours
// ============================================================

'use strict';

const Trip         = require('../../../models/Trip');
const Notification = require('../../../models/Notification');
const { sendMessage } = require('../../whatsapp/sender');
const { createLogger } = require('../../../utils/logger');
const log = createLogger('tripFollowup');

async function tripFollowup() {
    log.info('Running trip follow-up job...');

    try {
        const twelveHoursAgo = new Date();
        twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

        // Find active trips older than 12 hours
        const trips = await Trip.find({
            status:    'active',
            createdAt: { $lt: twelveHoursAgo },
        }).populate('userId', 'phone name subscription');

        let sent = 0;

        for (const trip of trips) {
            const user = trip.userId;
            if (!user) continue;

            // Only pro + fleet users
            if (!['pro', 'fleet'].includes(user.subscription?.plan)) continue;
            if (!user.subscription?.isActive) continue;

            try {
                const hoursAgo = Math.floor(
                    (Date.now() - trip.createdAt) / (1000 * 60 * 60)
                );

                const message =
                    `🚛 ${user.name || 'Bhai'}, trip ka kya haal hai?\n\n` +
                    `📍 ${trip.origin} → ${trip.destination}\n` +
                    `⏱️ ${hoursAgo} ghante se active hai\n\n` +
                    `Pahunch gaye? "trip complete" likhke finish karo\n` +
                    `Ya kharcha daalo abhi 📝`;

                await sendMessage(user.phone, message);

                await Notification.create({
                    userId:    user._id,
                    phone:     user.phone,
                    type:      'trip_followup',
                    message,
                    status:    'sent',
                    reference: String(trip._id),
                });

                sent++;

            } catch (err) {
                log.warn(`Failed for ${user.phone}: ${err.message}`);
            }
        }

        log.info(`Trip follow-ups sent: ${sent}/${trips.length}`);

    } catch (err) {
        log.error(`tripFollowup error: ${err.message}`);
    }
}

module.exports = { tripFollowup };
