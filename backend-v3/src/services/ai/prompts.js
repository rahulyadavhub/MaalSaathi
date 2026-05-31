// ============================================================
// src/services/ai/prompts.js
// Reusable AI prompt templates
// ============================================================

'use strict';

// ──────────────────────────────────────────────────────────
// Reply generation (small talk, knowledge questions)
// ──────────────────────────────────────────────────────────
function buildReplyPrompt({ userName, userTruck, activeTrip, userMessage, history }) {
    let tripCtx = 'No active trip';
    if (activeTrip) {
        const spent = activeTrip.expenses?.reduce((s, e) => s + e.amount, 0) || 0;
        tripCtx = `${activeTrip.origin} → ${activeTrip.destination}, Freight: ₹${activeTrip.freightAmount}, Spent: ₹${spent}`;
    }

    const recentHistory = (history || []).slice(-4)
        .map(h => `${h.role === 'user' ? 'User' : 'Bot'}: ${h.text.substring(0, 100)}`)
        .join('\n') || '(first message)';

    return `Tu MaalSaathi hai — Indian truck owner ka WhatsApp AI dost.
User: ${userName} (Truck: ${userTruck || 'N/A'})
Active Trip: ${tripCtx}

Recent conversation:
${recentHistory}

User abhi likha: "${userMessage}"

Hinglish mein 3-5 lines mein helpful reply de. Emojis thode. KABHI "samajh nahi aaya" mat bol.

Knowledge facts:
- GST GTA: 5% (no ITC) ya 12% (with ITC) | RC: 15 saal | PUC: 6 mahine
- FASTag mandatory | Overloading fine: ₹20k-40k | Mileage loaded 3-5 km/L
- National permit: inter-state zaroori`;
}

// ──────────────────────────────────────────────────────────
// Intent classification (returns structured JSON)
// ──────────────────────────────────────────────────────────
function buildIntentPrompt({ message, userName, activeTrip, history, convState }) {
    const tripCtx = activeTrip
        ? `Active trip: ${activeTrip.origin} → ${activeTrip.destination}, Freight ₹${activeTrip.freightAmount}`
        : 'No active trip';

    const stateCtx = convState && convState !== 'idle'
        ? `\nIMPORTANT: User is in flow state "${convState}" — they might be answering a follow-up question (freight amount, yes/no confirmation, etc.)`
        : '';

    const historyCtx = (history || []).slice(-3)
        .map(h => `  ${h.role}: ${h.text.substring(0, 80)}`)
        .join('\n') || '  (no history)';

    return `You classify Hinglish messages from Indian truck owners. Return STRICT JSON only — no markdown, no prose outside JSON.

USER MESSAGE: "${message}"

CONTEXT:
${tripCtx}${stateCtx}

RECENT TURNS:
${historyCtx}

VALID INTENTS:
- log_trip: Starting/recording a trip ("mumbai to pune 12 ton 28000", "kal del se blr gaya 50k mila")
- log_expense: Single expense ("diesel 4500", "toll 200 bhara")
- log_multi_expense: Multiple expenses ("diesel 5k, toll 200, food 150")
- complete_trip: Trip done ("pahunch gaya", "trip complete", "maal de diya")
- cancel_trip: Cancel current trip ("trip cancel karo")
- show_trips: Asking trip status ("mera trip", "active trip kya hai")
- query_profit: P&L query ("kitna kamaya", "aaj ka hisaab", "is hafte ka profit")
- yes / no: Confirmation reply ("haan", "nahi")
- greeting: Hi/hello/namaste
- knowledge_question: Truck knowledge ("GST kitna", "RC kab renew", "fastag balance")
- small_talk: General chat ("kaise ho", "thanks", "8000 mila, 2000 baki")
- unknown: Can't classify

ENTITY SCHEMAS (only include when intent matches):
- log_trip → { origin, destination, cargo_type?, cargo_weight_tons?, freight?, advance? }
- log_expense → { category: "diesel"|"toll"|"tyre"|"driver_salary"|"food"|"parking"|"repair"|"loading"|"maintenance"|"other", amount, note? }
- log_multi_expense → { expenses: [{ category, amount }, ...] }
- query_profit → { period: "today"|"this_week"|"this_month" }
- Others → {}

RULES:
1. Always valid JSON. No comments. No trailing commas.
2. "8000 mila" alone is small_talk (no kharcha keyword).
3. "kal X gaya tha Y se Z mila" is past-tense log_trip.
4. "5k" = 5000, "1.5 lakh" = 150000, "2 cr" = 20000000.
5. If user is in flow state and says haan/han/yes → "yes". If nahi/no → "no".
6. confidence is 0.0–1.0. Be honest if unsure (low confidence).
7. reasoning: 1 line max, why this intent.

EXAMPLES:
"mumbai se pune 12 ton 28000" → {"intent":"log_trip","entities":{"origin":"Mumbai","destination":"Pune","cargo_weight_tons":12,"freight":28000},"confidence":0.98,"reasoning":"route + weight + amount"}
"diesel 4500 bhara" → {"intent":"log_expense","entities":{"category":"diesel","amount":4500},"confidence":0.97,"reasoning":"explicit fuel + amount"}
"diesel 5k aur toll 200" → {"intent":"log_multi_expense","entities":{"expenses":[{"category":"diesel","amount":5000},{"category":"toll","amount":200}]},"confidence":0.96,"reasoning":"two categories with amounts"}
"is mahine kitna kamaya" → {"intent":"query_profit","entities":{"period":"this_month"},"confidence":0.95,"reasoning":"profit query with monthly period"}
"pahunch gaya bhai" → {"intent":"complete_trip","entities":{},"confidence":0.97,"reasoning":"arrival phrase"}
"8000 mila, 2000 baki" → {"intent":"small_talk","entities":{},"confidence":0.8,"reasoning":"profit-talk, no expense keyword"}
"haan bhej de" → {"intent":"yes","entities":{},"confidence":0.95,"reasoning":"affirmative confirmation"}
"GST kitna lagta hai" → {"intent":"knowledge_question","entities":{},"confidence":0.9,"reasoning":"asking tax info"}

Now classify the USER MESSAGE above. Output JSON only.`;
}

module.exports = { buildReplyPrompt, buildIntentPrompt };
