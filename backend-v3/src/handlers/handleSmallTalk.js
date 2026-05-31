'use strict';

const replyGenerator = require('../services/ai/replyGenerator');
const contextBuilder = require('../services/conversation/contextBuilder');

async function handle(user, conv, message, phone, sendMessage) {
    const ctx  = await contextBuilder.build(user, conv);
    const reply = await replyGenerator.generate({ ...ctx, userMessage: message });
    await sendMessage(phone, reply, { user, conv, intent: 'small_talk' });
}

module.exports = { handle };
