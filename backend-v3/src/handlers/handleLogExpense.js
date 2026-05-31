'use strict';

const expenseService = require('../services/trip/expenseService');
const { getEmoji, getLabel } = require('../constants/expenseCategories');
const { formatAmount } = require('../services/parser/amountParser');

async function handleSingle(parsed, user, phone, sendMessage, rawMessage) {
    if (!parsed || !parsed.amount || parsed.amount <= 0) {
        await sendMessage(phone, `Amount samajh nahi aaya. Dobara bhej: *"diesel 4500"*`,
            { user, intent: 'log_expense', action: 'parse_failed' });
        return;
    }

    const { expense, trip } = await expenseService.logExpense(user._id, {
        category: parsed.category,
        amount:   parsed.amount,
        source:   'text',
        rawMessage,
    });

    const emoji = getEmoji(parsed.category);
    const label = getLabel(parsed.category);
    const meta = {
        user,
        intent:    'log_expense',
        action:    'created',
        tripId:    trip?._id || null,
        expenseId: expense?._id || null,
    };

    if (!trip) {
        await sendMessage(phone,
            `${emoji} *${label}* ${formatAmount(parsed.amount)} note ho gaya! ✅\n\n` +
            `_(Active trip nahi tha — record ho gaya)_\n\n` +
            `Trip start karo: *"Mumbai se Pune 12 ton 28000"*`,
            meta
        );
        return;
    }

    const spent = trip.expenses.reduce((s, e) => s + e.amount, 0);
    const net   = (trip.freightAmount || 0) - spent;

    await sendMessage(phone,
        `${emoji} *${label}* ${formatAmount(parsed.amount)} add ho gaya! ✅\n\n` +
        `📊 *${trip.origin} → ${trip.destination}*\n` +
        `💰 Revenue: ${formatAmount(trip.freightAmount)}\n` +
        `📉 Kharcha: ${formatAmount(spent)}\n` +
        `${net >= 0 ? '✅' : '⚠️'} *Net: ${formatAmount(net)}*`,
        meta
    );
}

async function handleMulti(expenses, user, phone, sendMessage, rawMessage) {
    const valid = (expenses || []).filter(e => e.amount > 0);
    if (valid.length === 0) {
        await sendMessage(phone,
            `Expenses parse nahi ho paaye. Comma se bhejo:\n*"diesel 4500, toll 200, food 150"*`,
            { user, intent: 'log_multi_expense', action: 'parse_failed' }
        );
        return;
    }

    const { trip } = await expenseService.logMultiple(user._id, valid, { source: 'text', rawMessage });

    let total = 0;
    const lines = valid.map(e => {
        total += e.amount;
        return `${getEmoji(e.category)} ${getLabel(e.category)}: ${formatAmount(e.amount)}`;
    });

    const meta = {
        user,
        intent: 'log_multi_expense',
        action: 'created',
        tripId: trip?._id || null,
    };

    const header = `✅ *${valid.length} kharche save ho gaye!*\n\n`;

    if (!trip) {
        await sendMessage(phone,
            header + lines.join('\n') + `\n\n💸 Total: ${formatAmount(total)}\n_(Active trip nahi tha)_`,
            meta
        );
        return;
    }

    const spent = trip.expenses.reduce((s, e) => s + e.amount, 0);
    const net   = (trip.freightAmount || 0) - spent;

    await sendMessage(phone,
        header + lines.join('\n') + `\n\n` +
        `📊 *${trip.origin} → ${trip.destination}*\n` +
        `💰 Revenue: ${formatAmount(trip.freightAmount)}\n` +
        `📉 Total Kharcha: ${formatAmount(spent)}\n` +
        `${net >= 0 ? '✅' : '⚠️'} *Net: ${formatAmount(net)}*`,
        meta
    );
}

module.exports = { handleSingle, handleMulti };
