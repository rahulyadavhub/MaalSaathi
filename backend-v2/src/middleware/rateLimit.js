'use strict';

const { env } = require('../config/env');
const map = new Map();

function check(phone) {
    const now = Date.now();
    const r = map.get(phone);
    if (!r || now > r.resetAt) {
        map.set(phone, { count: 1, resetAt: now + 60_000 });
        return { limited: false };
    }
    r.count++;
    if (r.count > env.RATE_LIMIT_PER_MIN) return { limited: true };
    return { limited: false };
}

setInterval(() => {
    const now = Date.now();
    for (const [k, v] of map.entries()) if (now > v.resetAt) map.delete(k);
}, 60_000);

module.exports = { check };
