'use strict';

const convManager = require('../services/conversation/conversationManager');
const MESSAGES    = require('../constants/messages');
const { sendMessage } = require('../services/whatsapp/sender');

const TRUCK_REG_REGEX = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/;
const SKIP_REGEX      = /^(skip|nahi|no|later|n|baad\s*mein|abhi\s*nahi)$/i;

async function handle(user, conv, message, phone) {
    const msg = (message || '').trim();
    const { STATES } = convManager;
    const ctx = { user, conv, intent: 'onboarding' };

    if (conv.state === STATES.IDLE) {
        await convManager.setState(conv, STATES.AWAITING_NAME);
        await sendMessage(phone, MESSAGES.WELCOME(), ctx);
        return;
    }

    if (conv.state === STATES.AWAITING_NAME) {
        if (msg.length < 2 || msg.length > 50 || !/[a-zA-Z\u0900-\u097F]/.test(msg)) {
            await sendMessage(phone, MESSAGES.NAME_TOO_SHORT(), ctx);
            return;
        }
        user.name = msg;
        await user.save();
        await convManager.setState(conv, STATES.AWAITING_TRUCK);
        await sendMessage(phone, MESSAGES.ASK_TRUCK(user.name), ctx);
        return;
    }

    if (conv.state === STATES.AWAITING_TRUCK) {
        if (SKIP_REGEX.test(msg)) {
            user.onboardingComplete = true;
            await user.save();
            await convManager.reset(conv);
            await sendMessage(phone, MESSAGES.ONBOARDING_DONE(user.name), ctx);
            return;
        }

        const reg = msg.toUpperCase().replace(/[\s\-]+/g, '');
        if (!TRUCK_REG_REGEX.test(reg)) {
            await sendMessage(phone,
                `🚛 Truck number sahi format mein bhejo:\n\n` +
                `*Example:* MH12AB1234, DL1CAB5678, KA05MN9999\n\n` +
                `_Format: State(2L) + District(1-2D) + Series(1-3L) + Number(1-4D)_\n\n` +
                `Abhi nahi dena? *"skip"* likh do.`,
                ctx
            );
            return;
        }

        user.trucks.push({ registration: reg, vehicleType: 'truck' });
        user.onboardingComplete = true;
        await user.save();
        await convManager.reset(conv);
        await sendMessage(phone, MESSAGES.ONBOARDING_DONE(user.name), ctx);
        return;
    }
}

module.exports = { handle };
