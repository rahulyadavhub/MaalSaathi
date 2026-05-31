// ============================================================
// src/utils/cityAliases.js
// Indian city name resolver — handles short forms, typos, slang
//
// User likhta hai "del se mumb 50000" → "Delhi → Mumbai 50000"
// ============================================================

'use strict';

// ──────────────────────────────────────────────────────────
// Master alias map
// Key (lowercase) → Canonical name
// ──────────────────────────────────────────────────────────
const CITY_ALIASES = Object.freeze({
    // Metro cities
    'mumb':     'Mumbai',   'bom':       'Mumbai',     'bombay':    'Mumbai',
    'mbai':     'Mumbai',   'mumbai':    'Mumbai',

    'del':      'Delhi',    'dilli':     'Delhi',      'ndls':      'Delhi',
    'dilhi':    'Delhi',    'delhi':     'Delhi',      'ncr':       'Delhi',

    'pune':     'Pune',     'pun':       'Pune',       'poona':     'Pune',

    'jai':      'Jaipur',   'jp':        'Jaipur',     'jaypur':    'Jaipur',
    'jaipur':   'Jaipur',

    'ahm':      'Ahmedabad','amd':       'Ahmedabad',  'ahemdabad': 'Ahmedabad',
    'ahmedabad':'Ahmedabad',

    'blr':      'Bengaluru','bang':      'Bengaluru',  'bangalore': 'Bengaluru',
    'blore':    'Bengaluru','bengaluru': 'Bengaluru',

    'hyd':      'Hyderabad','hb':        'Hyderabad',  'hydrabad':  'Hyderabad',
    'hyderabad':'Hyderabad',

    'chn':      'Chennai',  'madras':    'Chennai',    'channai':   'Chennai',
    'chennai':  'Chennai',

    'kol':      'Kolkata',  'cal':       'Kolkata',    'calcutta':  'Kolkata',
    'kolkata':  'Kolkata',

    // State capitals + Tier 2
    'nag':      'Nagpur',   'nagpor':    'Nagpur',     'nagpur':    'Nagpur',
    'lko':      'Lucknow',  'lkw':       'Lucknow',    'luckhnow':  'Lucknow',
    'lucknow':  'Lucknow',
    'ind':      'Indore',   'indor':     'Indore',     'indore':    'Indore',
    'bpl':      'Bhopal',   'bhopl':     'Bhopal',     'bhopal':    'Bhopal',
    'rpr':      'Raipur',   'raypur':    'Raipur',     'raipur':    'Raipur',
    'jbp':      'Jabalpur', 'jabalpur':  'Jabalpur',
    'vdr':      'Vadodara', 'baroda':    'Vadodara',   'vadodara':  'Vadodara',
    'srt':      'Surat',    'surat':     'Surat',
    'amr':      'Amritsar', 'amritsar':  'Amritsar',
    'lud':      'Ludhiana', 'ludhiana':  'Ludhiana',
    'ald':      'Prayagraj','prayagraj': 'Prayagraj',  'allahabad': 'Prayagraj',
    'var':      'Varanasi', 'banaras':   'Varanasi',   'kashi':     'Varanasi',
    'varanasi': 'Varanasi',
    'kan':      'Kanpur',   'canpur':    'Kanpur',     'kanpur':    'Kanpur',
    'agr':      'Agra',     'agra':      'Agra',
    'mrt':      'Meerut',   'mirut':     'Meerut',     'meerut':    'Meerut',
    'pat':      'Patna',    'patna':     'Patna',
    'ran':      'Ranchi',   'ranchi':    'Ranchi',
    'bhp':      'Bhubaneswar', 'bhubneshwar': 'Bhubaneswar', 'bhubaneswar': 'Bhubaneswar',
    'gau':      'Guwahati', 'gauhati':   'Guwahati',   'guwahati':  'Guwahati',
    'jam':      'Jammu',    'jmu':       'Jammu',      'jammu':     'Jammu',
    'srn':      'Srinagar', 'srinagar':  'Srinagar',
    'shm':      'Shimla',   'shimla':    'Shimla',
    'ddn':      'Dehradun', 'dehradun':  'Dehradun',
    'ghz':      'Ghaziabad','ghaziabad': 'Ghaziabad',
    'fbd':      'Faridabad','faridabad': 'Faridabad',
    'ngr':      'Gurgaon',  'gurugram':  'Gurgaon',    'gurgaon':   'Gurgaon',
    'noi':      'Noida',    'noida':     'Noida',
    'tvm':      'Trivandrum', 'thiruvananthapuram': 'Trivandrum',
    'coc':      'Kochi',    'cochin':    'Kochi',      'kochi':     'Kochi',
    'cbe':      'Coimbatore', 'coimbatore': 'Coimbatore',
    'mdu':      'Madurai',  'madurai':   'Madurai',
    'vij':      'Vijayawada', 'vijayawada': 'Vijayawada',
    'vsk':      'Visakhapatnam', 'vizag': 'Visakhapatnam', 'visakhapatnam': 'Visakhapatnam',
    'goa':      'Goa',      'panji':     'Goa',
    'mng':      'Mangalore','mangalore': 'Mangalore',
    'hbl':      'Hubli',    'hubli':     'Hubli',
    'sng':      'Sangli',   'sangli':    'Sangli',
    'klp':      'Kolhapur', 'kolhapur':  'Kolhapur',
    'auh':      'Aurangabad', 'aurangabad': 'Aurangabad',
    'slm':      'Solapur',  'solapur':   'Solapur',
    'ngj':      'Gandhinagar', 'gandhinagar': 'Gandhinagar',
    'rjt':      'Rajkot',   'rajkot':    'Rajkot',
    'jmd':      'Jamnagar', 'jamnagar':  'Jamnagar',
    'jhn':      'Jhansi',   'jhansi':    'Jhansi',
    'gwl':      'Gwalior',  'gwalior':   'Gwalior',
    'cmb':      'Chamba',   'chamba':    'Chamba',

    // States (for cargo destination references)
    'mp':       'Madhya Pradesh',  'up':  'Uttar Pradesh',
    'raj':      'Rajasthan',       'guj': 'Gujarat',
    'mah':      'Maharashtra',     'pb':  'Punjab',
    'hr':       'Haryana',         'hp':  'Himachal Pradesh',
    'uk':       'Uttarakhand',     'ua':  'Uttarakhand',
    'bih':      'Bihar',           'jh':  'Jharkhand',
    'odi':      'Odisha',          'or':  'Odisha',
    'wb':       'West Bengal',     'as':  'Assam',
    'tn':       'Tamil Nadu',      'ap':  'Andhra Pradesh',
    'tel':      'Telangana',       'kar': 'Karnataka',
    'ker':      'Kerala',
});

// ──────────────────────────────────────────────────────────
// Resolve a single word to canonical city name
// Falls back to capitalize-first-letter for unknown cities
// ──────────────────────────────────────────────────────────
function resolveCity(word) {
    if (!word) return null;
    const cleaned = String(word).toLowerCase().trim();
    if (!cleaned) return null;

    if (CITY_ALIASES[cleaned]) {
        return CITY_ALIASES[cleaned];
    }

    // Unknown city — capitalize properly
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// ──────────────────────────────────────────────────────────
// Check if a word is a known city or alias
// ──────────────────────────────────────────────────────────
function isKnownCity(word) {
    if (!word) return false;
    return Boolean(CITY_ALIASES[String(word).toLowerCase().trim()]);
}

// ──────────────────────────────────────────────────────────
// Get all canonical city names (for autocomplete / validation)
// ──────────────────────────────────────────────────────────
function getAllCities() {
    return [...new Set(Object.values(CITY_ALIASES))].sort();
}

module.exports = {
    CITY_ALIASES,
    resolveCity,
    isKnownCity,
    getAllCities,
};
