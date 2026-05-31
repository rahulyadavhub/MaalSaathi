'use strict';

const tripService = require('../services/trip/tripService');
const { formatAmount } = require('../services/parser/amountParser');

async function handle(period, user, phone, sendMessage) {
    const now = new Date();
    let startDate, label;

    if (period === 'this_week') {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        label = 'Is hafte (7 din)';
    } else if (period === 'this_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        label = 'Is mahine';
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        label = 'Aaj';
    }

    const { tripCount, completed, active, revenue, expenses, netProfit } =
        await tripService.getProfitForPeriod(user._id, startDate);

    const meta = { user, intent: 'query_profit', action: period };

    if (tripCount === 0) {
        await sendMessage(phone,
            `📊 *${label} ka hisaab*\n\nKoi trip nahi mili.\n\n` +
            `Trip: *"Mumbai se Pune 12 ton 28000"* 🚛`,
            meta
        );
        return;
    }

    await sendMessage(phone,
        `📊 *${label} ka hisaab*\n\n` +
        `🚛 Trips: ${tripCount} (${completed} complete, ${active} active)\n` +
        `💰 Revenue: ${formatAmount(revenue)}\n` +
        `📉 Kharcha: ${formatAmount(expenses)}\n` +
        `${netProfit >= 0 ? '✅' : '⚠️'} *Net Profit: ${formatAmount(netProfit)}*\n\n` +
        `${netProfit >= 0 ? '💪 Badhiya chal raha hai!' : '🤔 Kharcha zyada — review karo!'}`,
        meta
    );
}

module.exports = { handle };
