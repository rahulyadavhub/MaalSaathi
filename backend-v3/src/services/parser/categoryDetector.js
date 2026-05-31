// ============================================================
// src/services/parser/categoryDetector.js
// Detect expense category from message text
//
// 500+ keyword variations covering:
// - Hindi spellings
// - English spellings
// - Common typos
// - Voice-to-text artifacts
// - Regional words
// ============================================================

'use strict';

const { CATEGORY } = require('../../constants/expenseCategories');

// ──────────────────────────────────────────────────────────
// Category rules — order matters! More specific patterns first
// Each rule: { category, patterns: [regex, regex, ...] }
// ──────────────────────────────────────────────────────────
const CATEGORY_RULES = [

    // ──────── Driver + Food override (MUST be FIRST) ────────
    // "driver ko khana diya", "khalasi ne chai pi", "helper ko nashta"
    // These are FOOD expenses, not salary — check before DRIVER_SALARY
    {
        category: CATEGORY.FOOD,
        patterns: [
            /(driver|draivar|draiver|drayvar|khalasi|khelasi|helper|cleaner|conductor)\s+ko\s+(khana|khaana|chai|chay|nashta|nasta|bhojan|lunch|dinner|breakfast|roti|thali|khane|paratha|poha|snack)/i,
            /(driver|khalasi|helper)\s+(ne\s+)?(khana|khaana|chai|nashta|bhojan)\s+(khaya|piya|kha|pi)/i,
            /khane\s+ke\s+liye\s+(driver|khalasi|helper)/i,
            /(driver|khalasi|helper)\s+ke\s+liye\s+(khana|khaana|chai|nashta|bhojan|lunch|dinner)/i,
        ],
    },

    // ──────── Driver salary (explicit salary/advance/pay only) ────────
    {
        category: CATEGORY.DRIVER_SALARY,
        patterns: [
            /\b(driver\s+(salary|pay|payment|advance))/i,
            /\b(khalasi|khelasi|khalashi)\s+(salary|pay|payment|advance)\b/i,
            /\b(helper|cleaner|conductor)\s+(salary|pay|payment|advance)\b/i,
            /(driver|khalasi|helper)\s+ko\s+(salary|advance|tankhwah|tanjwah|tankhwa|paise\s+de\s+diye|payment|pay\s+kiya|wages|majdoori)/i,
            /(driver|khalasi|helper)\s+ki\s+(salary|tankhwah|tanjwah|payment)\b/i,
            /\b(tankhwah|tanjwah|tankhwa)\b/i,
            /\b(majdoori|majduri|wages)\b/i,
            /\b(driver|khalasi|helper)\b.*\b(advance|salary|tankhwah)\b/i,
        ],
    },

    // ──────── Diesel / fuel ────────
    {
        category: CATEGORY.DIESEL,
        patterns: [
            /\b(diesel|disel|diseal|dyseal|dysel|deisal|deisel|diesal|dizel)\b/i,
            /\b(petrol|petral|pitrol|petroll)\b/i,
            /\b(fuel|fyuel)\b/i,
            /\b(cng|gas|gaas)\s*(bhara|bharwaya|bharvaya|filling)?/i,
            /\b(tel|teliya|taila|indhan)\b/i,
            /\bpump\s+(pe|ke|gaya|main|mein)/i,
            /\b(iocl|bpcl|hpcl|hp\s+pump|indian\s+oil)\b/i,
            /\b(bhara|bharwaya|bharvaya)\b/i,
        ],
    },

    // ──────── FASTag / Toll ────────
    {
        category: CATEGORY.TOLL,
        patterns: [
            /\b(toll|tol|toal|tole)\b/i,
            /\b(naka|naaka|nak\b)/i,
            /\b(fastag|fast\s*tag|fasttag|fasteg|f\s*tag|ftag)\b/i,
            /\b(highway|booth|barrier|checkpost|check\s*post)\b/i,
            /\b(toll\s+plaza|toll\s+booth|toll\s+naka)\b/i,
            /\b(octroi|cess)\b/i,
            /\b(express\s*way|expressway)\b/i,
        ],
    },

    // ──────── Tyre / Puncture ────────
    {
        category: CATEGORY.TYRE,
        patterns: [
            /\b(tyre|tire|tayar|tayer|tyr|tier|tiar|tyar|tyara)\b/i,
            /\b(puncture|punchur|panchar|pankchar|punchar|punctcher)\b/i,
            /\b(tube|tubes)\s+(change|fit|repair)?/i,
            /\btube\b/i,
            /\b(balancing|wheel\s+balancing|alignment)\b/i,
            /\b(rim|rims|rim\s+change)\b/i,
            /\btyre\s+(fata|phata|flat|change|fit|repair)/i,
        ],
    },

    // ──────── Greasing / Oil change ────────
    {
        category: CATEGORY.GREASING,
        patterns: [
            /\b(grease|greasing|greas|grising)\b/i,
            /\b(mobil\s*oil|mobil\b)/i,
            /\b(engine\s*oil|gear\s*oil|brake\s*oil|hydraulic)/i,
            /\boil\s+change\b/i,
            /\b(coolant|radiator\s+water|anti\s*freeze)\b/i,
            /\b(oil\s*filter|air\s*filter|fuel\s*filter|filter\s+change)\b/i,
        ],
    },

    // ──────── Food / Dhaba ────────
    {
        category: CATEGORY.FOOD,
        patterns: [
            /\b(food|khaana|khana|khanna)\b/i,
            /\b(dhaba|daba|dabha|dhabha)\b/i,
            /\b(chai|chay|tea|coffee)\b/i,
            /\b(nashta|nasta|breakfast)\b/i,
            /\b(lunch|lanch|dinner|bhojan)\b/i,
            /\b(roti|dal|thali|plate)\b/i,
            /\b(paratha|poha|idli|vada|paneer)\b/i,
            /\b(snack|namkeen|biscuit)\b/i,
            /\bkhane\s+(mein|ke|main|ka)/i,
            /\bkhana\s+(khaya|kha\s+liya)/i,
        ],
    },

    // ──────── Loading ────────
    {
        category: CATEGORY.LOADING,
        patterns: [
            /\b(loading|lodin|loding|loadng)\b/i,
            /\b(hamali|hamaali)\b/i,
            /\b(coolie|coolies|mazdoor|maazdoor)\b/i,
            /\b(labour|labur|labourer|labor)\b/i,
            /maal\s+(charh|chadh|charha|chadha|liya|utha)/i,
            /load\s+(kiya|karwa)/i,
        ],
    },

    // ──────── Unloading ────────
    {
        category: CATEGORY.UNLOADING,
        patterns: [
            /\b(unloading|unlodin|unload)\b/i,
            /\b(offload|offloading|discharge)\b/i,
            /maal\s+(utar|de\s+diya|pohncha|deliver|khali|nikla)/i,
            /\b(delivery|deliver|delivered)\b/i,
        ],
    },

    // ──────── Weighbridge ────────
    {
        category: CATEGORY.WEIGHBRIDGE,
        patterns: [
            /\b(weighbridge|weight\s*bridge)\b/i,
            /\b(kanta|kaanta)\b/i,
            /\b(wazan|wajan|weighing|tolai|tarazu)\b/i,
            /weight\s+(slip|check|kiya)/i,
        ],
    },

    // ──────── Fine / Challan ────────
    {
        category: CATEGORY.FINE,
        patterns: [
            /\b(fine|fain|fyne)\b/i,
            /\b(challan|chalan|chaalan|chalaan)\b/i,
            /\b(police|polis|cops|traffic)\b/i,
            /\b(overload|ovarlod|over\s*load)/i,
            /\b(penalty|penalti)\b/i,
            /\b(bribe|ghoos|setting)\b/i,
            /\b(court|kachehri)\b/i,
            /naka\s+(fine|pe\s+pakda)/i,
        ],
    },

    // ──────── Parking ────────
    {
        category: CATEGORY.PARKING,
        patterns: [
            /\b(parking|parkin|parkng)\b/i,
            /\b(night\s+halt|overnight|raat\s+ruka|raat\s+halt)\b/i,
            /\b(dharmshala|rest\s+house|truck\s+stand)\b/i,
            /gaadi\s+khadi/i,
        ],
    },

    // ──────── EMI / Loan ────────
    {
        category: CATEGORY.EMI,
        patterns: [
            /\bemi\b/i,
            /\b(loan|loan\s+ki\s+kist|installment)\b/i,
            /\b(kist|kisht)\b/i,
            /\b(finance|leasing)\b/i,
            /\b(shriram\s+finance|cholamandalam|chola|mahindra\s+finance|hdfc|sbi)\s+(loan|kist|emi)?/i,
            /truck\s+ka\s+(loan|emi|kist)/i,
        ],
    },

    // ──────── Insurance ────────
    {
        category: CATEGORY.INSURANCE,
        patterns: [
            /\b(insurance|insurence|insuranc)\b/i,
            /\b(bima|beema|bheema)\b/i,
            /\b(premium|policy)\b/i,
            /\b(comprehensive|third\s+party)\s+(insurance|policy)?/i,
        ],
    },

    // ──────── Permit / RC / Pollution ────────
    {
        category: CATEGORY.PERMIT,
        patterns: [
            /\b(permit|parmet|permitt)\b/i,
            /\brc\s+(renew|renewal|kharcha)/i,
            /\b(fitness\s+(cert|certificate|FC))/i,
            /\b(noc|no\s*objection)\b/i,
            /\b(puc|pollution)\b/i,
            /\b(road\s+tax|green\s+tax|tax\s+bhara)\b/i,
            /\b(national\s+permit|state\s+permit|all\s+india\s+permit|AIP)\b/i,
            /\b(driving\s+license|dl\s+renew)\b/i,
        ],
    },

    // ──────── Commission / Dalali ────────
    {
        category: CATEGORY.COMMISSION,
        patterns: [
            /\b(commission|komishan|commision|comission)\b/i,
            /\b(dalali|dalal|broker|agent)\b/i,
            /\b(party\s+cut|cut|katauti|bahiya)\b/i,
            /agent\s+(fee|charges|ke)/i,
        ],
    },

    // ──────── Washing ────────
    {
        category: CATEGORY.WASHING,
        patterns: [
            /\b(washing|dhulai|wash)\b/i,
            /\b(truck\s+wash|gaadi\s+dhulwa|dhona|dhulwaya)\b/i,
            /\b(cleaning|safai)\b/i,
        ],
    },

    // ──────── Battery ────────
    {
        category: CATEGORY.BATTERY,
        patterns: [
            /\b(battery|batri|bateri|battri)\b/i,
            /\b(battery\s+(change|dead|new|charge))/i,
            /\b(jump\s+start|jumper)\b/i,
        ],
    },

    // ──────── Maintenance (preventive) ────────
    {
        category: CATEGORY.MAINTENANCE,
        patterns: [
            /\b(maintenance|servicing)\b/i,
            /\b(scheduled\s+service|general\s+service|preventive)\b/i,
            /\b(overhauling|overhaul|engine\s+overhaul)\b/i,
            /\bservice\s+(kiya|karwa)/i,
            /\d+\s*km\s+service/i,
        ],
    },

    // ──────── Repair (LAST — catches generic mechanic mentions) ────────
    {
        category: CATEGORY.REPAIR,
        patterns: [
            /\b(repair|repear|repare|repar|repiar|ripar)\b/i,
            /\b(mechanic|mekanik|mechanik|mekanic|mistry|mistri|fitter)\b/i,
            /\b(workshop|garage|garaj)\b/i,
            /\b(engine|gearbox|gear\s*box|clutch|cluch)\s+(repair|kharab|theek)?/i,
            /\b(brake|bake|breaks|braking)\s+(repair|kharab)?/i,
            /\b(silencer|exhaust|radiator|alternator|starter|dynamo)\b/i,
            /\b(suspension|spring|shock\s*absorber|steering|axle)\b/i,
            /\b(welding|denting|painting|bodywork)\b/i,
            /\b(spare\s+part|spares|parts|nut\s+bolt)\b/i,
            /\b(banwaya|banwana|thik\s+kiya|theek\s+karwaya|daktar)\b/i,
        ],
    },
];

// ──────────────────────────────────────────────────────────
// Main: detect category from text
// Returns category string, defaults to 'other'
// ──────────────────────────────────────────────────────────
function detectCategory(text) {
    if (!text) return CATEGORY.OTHER;
    const input = String(text).toLowerCase().trim();
    if (!input) return CATEGORY.OTHER;

    for (const rule of CATEGORY_RULES) {
        for (const pattern of rule.patterns) {
            if (pattern.test(input)) return rule.category;
        }
    }
    return CATEGORY.OTHER;
}

// ──────────────────────────────────────────────────────────
// Check if text contains ANY expense-related keyword
// ──────────────────────────────────────────────────────────
function isExpenseText(text) {
    if (!text) return false;
    const input = String(text).toLowerCase().trim();
    if (!input) return false;

    for (const rule of CATEGORY_RULES) {
        for (const pattern of rule.patterns) {
            if (pattern.test(input)) return true;
        }
    }

    return /\b(kharcha|kharach|kharch\s+hua|paisa\s+(lag|gaya|gaye)|paise\s+(lage|gaye|diye)|spend|spent)\b/i.test(input);
}

// ──────────────────────────────────────────────────────────
// Detect MULTIPLE categories in a single message
// ──────────────────────────────────────────────────────────
function detectAllCategories(text) {
    if (!text) return [];
    const input = String(text).toLowerCase().trim();
    if (!input) return [];

    const found = [];
    const seen = new Set();

    for (const rule of CATEGORY_RULES) {
        for (const pattern of rule.patterns) {
            if (pattern.test(input) && !seen.has(rule.category)) {
                found.push(rule.category);
                seen.add(rule.category);
                break;
            }
        }
    }
    return found;
}

module.exports = {
    detectCategory,
    isExpenseText,
    detectAllCategories,
    CATEGORY_RULES,
};
