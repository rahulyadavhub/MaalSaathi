'use strict';

const tripService = require('../services/trip/tripService');
const convManager = require('../services/conversation/conversationManager');
const MESSAGES    = require('../constants/messages');
const { formatAmount } = require('../services/parser/amountParser');

async function handle(user, conv, phone, sendMessage) {
    const trip = await tripService.completeTrip(user._id);
    if (!trip) {
        await sendMessage(phone, MESSAGES.NO_ACTIVE_TRIP(),
            { user, conv, intent: 'complete_trip', action: 'no_active' });
        return;
    }

    await convManager.setActiveTrip(conv, null);

    const spent = trip.expenses.reduce((s, e) => s + e.amount, 0);
    const net   = (trip.freightAmount || 0) - spent;
    const hrs   = Math.round((trip.completedAt - trip.startedAt) / 3_600_000);

    await sendMessage(phone,
        `🎉 *Trip Complete!* 🏁\n\n` +
        `📍 ${trip.origin} → ${trip.destination}\n` +
        `${trip.cargoType ? `📦 ${trip.cargoType}\n` : ''}` +
        `⏱️ ${hrs} ghante\n` +
        `💰 Freight: ${formatAmount(trip.freightAmount)}\n` +
        `📉 Kharcha: ${formatAmount(spent)}\n` +
        `${net >= 0 ? '✅' : '⚠️'} *Net: ${formatAmount(net)}*\n\n` +
        `${net >= 0 ? '💪 Zabardast!' : '⚠️ Kharcha zyada tha — next baar dhyan rakhna.'} 🚛`,
        { user, conv, intent: 'complete_trip', action: 'completed', tripId: trip._id }
    );
}

module.exports = { handle };
