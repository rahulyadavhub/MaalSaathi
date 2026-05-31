'use strict';

const tripService = require('../services/trip/tripService');
const Trip = require('../models/Trip');
const { TRIP_STATUS } = require('../constants/tripStatus');
const { formatAmount } = require('../services/parser/amountParser');

async function handle(user, phone, sendMessage) {
    const trip = await tripService.getActiveTrip(user._id);
    const meta = { user, intent: 'show_trips' };

    if (!trip) {
        const today = new Date(); today.setHours(0,0,0,0);
        const doneToday = await Trip.countDocuments({
            userId: user._id,
            status: TRIP_STATUS.COMPLETED,
            completedAt: { $gte: today },
        });
        await sendMessage(phone,
            `📋 Koi active trip nahi hai.\n\n` +
            `${doneToday ? `✅ Aaj ${doneToday} trip complete ho chuki.\n\n` : ''}` +
            `Nayi trip: *"Mumbai se Pune 12 ton 28000"*`,
            { ...meta, action: 'no_active' }
        );
        return;
    }

    const spent = trip.expenses.reduce((s, e) => s + e.amount, 0);
    const net   = (trip.freightAmount || 0) - spent;
    const hrs   = Math.round((Date.now() - trip.startedAt) / 3_600_000);

    await sendMessage(phone,
        `📋 *Active Trip:*\n\n` +
        `📍 *${trip.origin} → ${trip.destination}*\n` +
        `${trip.cargoType ? `📦 ${trip.cargoType}\n` : ''}` +
        `⏱️ ${hrs} ghante se chal raha\n` +
        `💰 Freight: ${formatAmount(trip.freightAmount)}\n` +
        `📉 Kharcha: ${formatAmount(spent)}\n` +
        `${net >= 0 ? '✅' : '⚠️'} *Net: ${formatAmount(net)}*\n\n` +
        `*"trip complete"* bhejo khatam karne ke liye 🏁`,
        { ...meta, action: 'shown', tripId: trip._id }
    );
}

module.exports = { handle };
