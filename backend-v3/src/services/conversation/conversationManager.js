// ============================================================
// src/services/conversation/conversationManager.js
// Manages persistent conversation state (MongoDB-backed)
// ============================================================

'use strict';

const Conversation = require('../../models/Conversation');
const { createLogger } = require('../../utils/logger');
const log = createLogger('convManager');

const STATES = Object.freeze({
    IDLE:                        'idle',
    AWAITING_NAME:               'awaiting_name',
    AWAITING_TRUCK:              'awaiting_truck',
    AWAITING_FREIGHT:            'awaiting_freight',
    AWAITING_TRIP_CONFIRMATION:  'awaiting_trip_confirmation',
});

async function get(userId, phone) {
    return Conversation.findOrCreate(userId, phone);
}

async function setState(conv, newState, context = {}) {
    conv.setState(newState, context);
    await conv.save();
    log.debug(`State → ${newState}`, { userId: conv.userId.toString() });
    return conv;
}

async function reset(conv) {
    conv.reset();
    await conv.save();
    return conv;
}

async function addUserMessage(conv, text, intent = null) {
    conv.addMessage('user', text, intent);
    await conv.save();
    return conv;
}

async function addBotMessage(conv, text) {
    conv.addMessage('bot', text);
    await conv.save();
    return conv;
}

async function setActiveTrip(conv, tripId) {
    conv.activeTripId = tripId;
    await conv.save();
    return conv;
}

function isAwaitingFreight(conv)         { return conv?.state === STATES.AWAITING_FREIGHT; }
function isAwaitingConfirmation(conv)    { return conv?.state === STATES.AWAITING_TRIP_CONFIRMATION; }
function isInOnboarding(conv)            { return [STATES.AWAITING_NAME, STATES.AWAITING_TRUCK].includes(conv?.state); }

module.exports = {
    STATES,
    get, setState, reset,
    addUserMessage, addBotMessage,
    setActiveTrip,
    isAwaitingFreight, isAwaitingConfirmation, isInOnboarding,
};
