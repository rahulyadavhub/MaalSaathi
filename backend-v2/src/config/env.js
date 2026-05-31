'use strict';

require('dotenv').config();

const SCHEMA = {
    NODE_ENV:                 { required: false, default: 'development', enum: ['development', 'production', 'test'] },
    PORT:                     { required: false, default: '3000', type: 'number' },

    MONGO_URI:                { required: true,  type: 'string', secret: true },

    GEMINI_API_KEY:           { required: false, type: 'string', secret: true },
    GEMINI_MODEL:             { required: false, default: 'gemini-2.5-flash' },

    OPENAI_API_KEY:           { required: true,  type: 'string', secret: true },
    OPENAI_MODEL:             { required: false, default: 'gpt-4o-mini' },

    WHATSAPP_PHONE_NUMBER_ID: { required: true,  type: 'string' },
    WHATSAPP_ACCESS_TOKEN:    { required: true,  type: 'string', secret: true },
    WHATSAPP_API_VERSION:     { required: false, default: 'v25.0' },
    WHATSAPP_VERIFY_TOKEN:    { required: true,  type: 'string' },

    META_APP_SECRET:          { required: false, type: 'string', secret: true },

    RATE_LIMIT_PER_MIN:       { required: false, default: '20', type: 'number' },
    ADMIN_PHONES:             { required: false, default: '' },
    LOG_LEVEL:                { required: false, default: 'info', enum: ['debug', 'info', 'warn', 'error'] },
};

function loadEnv() {
    const config = {};
    const errors = [];

    for (const [key, rules] of Object.entries(SCHEMA)) {
        let value = process.env[key];

        if (rules.required && (!value || value.trim() === '')) {
            errors.push('X ' + key + ' is REQUIRED but missing in .env');
            continue;
        }

        if ((!value || value.trim() === '') && rules.default !== undefined) {
            value = rules.default;
        }

        if (rules.type === 'number') {
            const num = Number(value);
            if (Number.isNaN(num)) {
                errors.push('X ' + key + ' must be a number, got "' + value + '"');
                continue;
            }
            value = num;
        }

        if (rules.enum && !rules.enum.includes(value)) {
            errors.push('X ' + key + ' must be one of [' + rules.enum.join(', ') + '], got "' + value + '"');
            continue;
        }

        config[key] = value;
    }

    if (config.NODE_ENV === 'production' && !config.META_APP_SECRET) {
        errors.push('X META_APP_SECRET is REQUIRED in production (webhook signature)');
    }

    if (errors.length > 0) {
        console.error('\nENVIRONMENT VALIDATION FAILED:\n');
        errors.forEach(e => console.error('  ' + e));
        console.error('\nCheck your .env file against .env.example\n');
        throw new Error('Invalid environment configuration');
    }

    return config;
}

function printConfig(config) {
    console.log('\nEnvironment loaded:');
    for (const [key, rules] of Object.entries(SCHEMA)) {
        const value = config[key];
        if (value === undefined || value === '') {
            console.log('   ' + key + ' = (not set)');
            continue;
        }
        if (rules.secret) {
            const s = String(value);
            const masked = s.length > 12 ? s.substring(0, 8) + '...' + s.slice(-4) : '***';
            console.log('   ' + key + ' = ' + masked);
        } else {
            console.log('   ' + key + ' = ' + value);
        }
    }
    console.log('');
}

const env = loadEnv();

env.IS_PRODUCTION    = env.NODE_ENV === 'production';
env.IS_DEVELOPMENT   = env.NODE_ENV === 'development';
env.ADMIN_PHONE_LIST = env.ADMIN_PHONES
    ? env.ADMIN_PHONES.split(',').map(s => s.trim()).filter(Boolean)
    : [];

module.exports = { env, printConfig };
