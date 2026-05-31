// ============================================================
// src/services/parser/tripParser.js
// Parse trip info from natural Hinglish text
//
// Examples it handles:
//   "Mumbai se Pune 12 ton cement 28000"
//   "delhi to jaipur 45k cement"
//   "bangalore chennai 30 hazaar steel"
//   "mumb-del 50000 wheat 15 ton"
//   "trip mumbai pune"
//   "del se blr 20 ton sariya advance 10000 freight 60000"
// ============================================================

'use strict';

const { parseAmount } = require('./amountParser');
const { resolveCity, isKnownCity } = require('../../utils/cityAliases');

// ──────────────────────────────────────────────────────────
// Words that look like cities but aren't (false positives)
// ──────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
    // Time
    'aaj', 'kal', 'parso', 'subah', 'shaam', 'raat',
    // Verbs
    'gaya', 'gaye', 'aya', 'aaya', 'aayi', 'jana', 'jaana',
    'pohncha', 'pahunch', 'dena', 'liya', 'diya', 'karo',
    // Common particles
    'se', 'sey', 'to', 'ka', 'ki', 'ke', 'ko', 'tak',
    'aur', 'or', 'phir', 'fir', 'ya', 'hai', 'tha',
    'hun', 'ho', 'rahe', 'raha', 'rahi',
    // Vocatives / fillers
    'bhai', 'yaar', 'sir', 'ji', 'na', 'haan', 'nahi',
    // Trip/cargo nouns (not cities)
    'trip', 'maal', 'ton', 'tonne', 'tonn', 'tan', 'kg', 'kilo',
    'mt', 'quintal', 'cargo', 'load', 'goods', 'saman', 'samaan',
    'gaadi', 'truck', 'lorry', 'vehicle',
    // Money nouns
    'rupee', 'rupees', 'rs', 'inr', 'paisa', 'paise',
    'freight', 'fare', 'bhada', 'bhaada', 'kiraya',
    'advance', 'kharcha', 'kharch', 'profit', 'loss',
    // Misc
    'log', 'bus', 'train', 'flight', 'auto',
]);

// ──────────────────────────────────────────────────────────
// Cargo type keywords (only used to extract cargo from text)
// ──────────────────────────────────────────────────────────
const CARGO_KEYWORDS = [
    'cement', 'siment', 'simant', 'ciment',
    'steel', 'sariya', 'rod', 'iron', 'lohaa',
    'coal', 'koyla', 'coke',
    'wheat', 'gehu', 'aata', 'atta',
    'rice', 'chawal', 'dhan',
    'sand', 'bajri', 'gitti', 'gravel', 'stone', 'patthar',
    'cotton', 'kapas',
    'oil', 'edible\\s*oil', 'cooking\\s*oil', 'vanaspati',
    'sugar', 'cheeni', 'shakkar',
    'salt', 'namak',
    'onion', 'pyaaz', 'aloo', 'potato',
    'fruit', 'sabzi', 'vegetable',
    'wood', 'lakdi', 'timber',
    'cloth', 'kapda', 'fabric',
    'plastic', 'chemical', 'kerosene',
    'medicine', 'dawa', 'pharma',
    'electronics', 'machine', 'machinery',
    'brick', 'eent', 'tiles',
    'paint', 'rang',
    'fertilizer', 'khad', 'urea',
    'cattle', 'animal', 'fish', 'mach',
    'empty', 'khali',
];

const CARGO_REGEX = new RegExp(`\\b(${CARGO_KEYWORDS.join('|')})\\b`, 'i');

// ──────────────────────────────────────────────────────────
// Helper — check if word is a valid city candidate
// (not stop word, has min length, can be resolved)
// ──────────────────────────────────────────────────────────
function looksLikeCity(word) {
    if (!word) return false;
    const w = word.toLowerCase().trim();
    if (w.length < 2) return false;
    if (STOP_WORDS.has(w)) return false;
    if (/^\d+$/.test(w)) return false;
    return true;
}

// ──────────────────────────────────────────────────────────
// Extract origin → destination from text
// Tries multiple patterns
// ──────────────────────────────────────────────────────────
function extractRoute(text) {
    const msg = text.toLowerCase();

    // Pattern 1: "X se Y" (most common Hinglish)
    let m = msg.match(/\b([a-z]{2,})\s+(?:se|sey|s)\s+([a-z]{2,})\b/);
    if (m && looksLikeCity(m[1]) && looksLikeCity(m[2])) {
        return { origin: resolveCity(m[1]), destination: resolveCity(m[2]) };
    }

    // Pattern 2: "X to Y" / "X tak Y"
    m = msg.match(/\b([a-z]{3,})\s+(?:to|tak|→|->|=>)\s+([a-z]{3,})\b/);
    if (m && looksLikeCity(m[1]) && looksLikeCity(m[2])) {
        return { origin: resolveCity(m[1]), destination: resolveCity(m[2]) };
    }

    // Pattern 3: "X - Y" (dash separated)
    m = msg.match(/\b([a-z]{3,})\s*[-–]\s*([a-z]{3,})\b/);
    if (m && looksLikeCity(m[1]) && looksLikeCity(m[2])) {
        return { origin: resolveCity(m[1]), destination: resolveCity(m[2]) };
    }

    // Pattern 4: "trip X Y" — two cities after "trip"
    if (msg.includes('trip')) {
        m = msg.match(/trip\s+([a-z]{3,})\s+([a-z]{3,})/);
        if (m && looksLikeCity(m[1]) && looksLikeCity(m[2])) {
            return { origin: resolveCity(m[1]), destination: resolveCity(m[2]) };
        }
    }

    // Pattern 5: "X Y route/gaya/jana" — two cities + action verb
    m = msg.match(/\b([a-z]{4,})\s+([a-z]{4,})\s+(?:route|gaya|aya|jana|maal|trip)\b/);
    if (m && looksLikeCity(m[1]) && looksLikeCity(m[2])) {
        return { origin: resolveCity(m[1]), destination: resolveCity(m[2]) };
    }

    // Pattern 6: Two adjacent KNOWN cities (no se/to needed)
    // Safe — only triggers when BOTH words exist in CITY_ALIASES
    // Catches: "kal mumbai jaipur 35k", "parso del blr 50000"
    const words = msg.split(/\s+/).map(w => w.replace(/[^a-z]/g, '')).filter(Boolean);
    for (let i = 0; i < words.length - 1; i++) {
        if (isKnownCity(words[i]) && isKnownCity(words[i+1]) && words[i] !== words[i+1]) {
            return { origin: resolveCity(words[i]), destination: resolveCity(words[i+1]) };
        }
    }

    return { origin: null, destination: null };
}

// ──────────────────────────────────────────────────────────
// Extract cargo weight in tons
// ──────────────────────────────────────────────────────────
function extractWeight(text) {
    const m = text.match(/(\d+(?:\.\d+)?)\s*(?:ton|tonne|tonn|tan|टन|mt)\b/i);
    if (!m) return null;
    const w = parseFloat(m[1]);
    return (w > 0 && w <= 100) ? w : null;
}

// ──────────────────────────────────────────────────────────
// Extract cargo type (cement, steel, etc.)
// ──────────────────────────────────────────────────────────
function extractCargo(text) {
    const m = text.match(CARGO_REGEX);
    return m ? m[1].toLowerCase() : null;
}

// ──────────────────────────────────────────────────────────
// Extract freight amount + advance (if mentioned)
// Strategy:
//   - All numbers found in text
//   - Skip weight number (if matches ton qty)
//   - Largest >= 100 becomes freight
//   - If "advance X" pattern exists, that becomes advance
// ──────────────────────────────────────────────────────────
function extractFinancials(text, weight) {
    let freight = null;
    let advance = 0;

    // Check for explicit "advance X" or "advance=X"
    const advMatch = text.match(/advance\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(k|hazaar|hajar|lakh|lac)?/i);
    if (advMatch) {
        advance = parseAmount(advMatch[0].replace(/advance\s*[:=]?\s*/i, ''));
    }

    // Check for explicit "freight X" / "bhada X" / "kiraya X"
    const freightMatch = text.match(/(?:freight|bhada|bhaada|kiraya)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(k|hazaar|hajar|lakh|lac)?/i);
    if (freightMatch) {
        freight = parseAmount(freightMatch[0].replace(/(?:freight|bhada|bhaada|kiraya)\s*[:=]?\s*/i, ''));
    }

    // If no explicit freight, find largest number that isn't weight or advance
    if (!freight) {
        const allMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(k|K|hazaar|hajar|thousand|lakh|lac)?/g)];
        for (const m of allMatches) {
            const rawNum = parseFloat(m[1]);
            const hasSuffix = Boolean(m[2]);
            const amt = parseAmount(m[0]);

            // Skip if this matches the weight number (no suffix, same value)
            if (weight && !hasSuffix && Math.abs(rawNum - weight) < 0.01) continue;

            // Skip if this matches the advance
            if (advance && amt === advance) continue;

            // Freight must be reasonable (>= 100)
            if (amt >= 100 && (!freight || amt > freight)) {
                freight = amt;
            }
        }
    }

    return { freight: freight || null, advance };
}

// ──────────────────────────────────────────────────────────
// Main: parse trip from text → structured object
// Returns null if no valid route detected
// ──────────────────────────────────────────────────────────
function parseTrip(text) {
    if (!text || typeof text !== 'string') return null;
    const input = text.trim();
    if (input.length < 4) return null;

    // 1. Extract route — must have both origin & destination
    const { origin, destination } = extractRoute(input);
    if (!origin || !destination) return null;
    if (origin.toLowerCase() === destination.toLowerCase()) return null;

    // 2. Extract weight (optional)
    const weight = extractWeight(input);

    // 3. Extract cargo (optional)
    const cargo = extractCargo(input);

    // 4. Extract financials
    const { freight, advance } = extractFinancials(input, weight);

    return {
        origin,
        destination,
        cargoType:       cargo,
        cargoWeightTons: weight,
        freight,
        advance,
        balanceDue:      freight ? (freight - advance) : null,
        // Flag: is data complete enough to confirm?
        isComplete:      Boolean(origin && destination && freight),
        missingFields:   getMissingFields(origin, destination, freight),
    };
}

function getMissingFields(origin, destination, freight) {
    const missing = [];
    if (!origin)      missing.push('origin');
    if (!destination) missing.push('destination');
    if (!freight)     missing.push('freight');
    return missing;
}

module.exports = {
    parseTrip,
    extractRoute,
    extractWeight,
    extractCargo,
    extractFinancials,
    looksLikeCity,
};
