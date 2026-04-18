import OpenAI from "openai";

// -----------------------------------------------------------------------------
// TYPES & CONSTANTS
// -----------------------------------------------------------------------------
interface CachedResponse {
  answer: string;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;
const QUALITY_FALLBACK = "Here are the key parts of the repository to explore.";

// -----------------------------------------------------------------------------
// STATE
// -----------------------------------------------------------------------------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const cache = new Map<string, CachedResponse>();
const inFlightPromises = new Map<string, Promise<string>>();

// -----------------------------------------------------------------------------
// SERVICE METHODS
// -----------------------------------------------------------------------------

/**
 * Generates an OpenAI-powered response with advanced caching, quality filtering,
 * and cost optimization.
 */
export async function generateChatResponse(query: string, context: any): Promise<string> {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 3) return "";

  const topNodes = context?.queryContext?.topNodes?.slice(0, 5) || [];
  const cacheKey = `${normalizedQuery}|${topNodes.join(",")}`;

  // 1. Check TTL Cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.answer;
  }

  // 2. Parallel Safety (Dedupe concurrent identical calls)
  if (inFlightPromises.has(cacheKey)) {
    return inFlightPromises.get(cacheKey)!;
  }

  // 3. Perform API Call
  const apiCall = performOpenAICall(query, topNodes);
  inFlightPromises.set(cacheKey, apiCall);

  try {
    const rawResponse = await apiCall;
    const cleanAnswer = validateAndCleanResponse(rawResponse);

    // 4. Update Cache (LRU-ish pruning)
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    cache.set(cacheKey, {
      answer: cleanAnswer,
      timestamp: Date.now(),
    });

    return cleanAnswer;
  } catch (error) {
    return "";
  } finally {
    inFlightPromises.delete(cacheKey);
  }
}

/**
 * Pre-warms the cache for common queries to eliminate demo delays.
 */
export async function preWarmCache(context: any): Promise<void> {
  const commonQueries = ["what does this repo do", "main components"];
  for (const q of commonQueries) {
    generateChatResponse(q, context).catch(() => {});
  }
}

// -----------------------------------------------------------------------------
// INTERNAL HELPERS
// -----------------------------------------------------------------------------

async function performOpenAICall(query: string, topNodes: string[]): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a codebase assistant. Answer clearly and concisely using the provided repository structure names. Be professional."
        },
        {
          role: "user",
          content: `
Repository Key Components:
${topNodes.join(", ")}

User Question:
${query}
`
        }
      ],
      max_tokens: 120,
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content || "";
    return result;
  } catch (error: any) {
    return "";
  }
}

function validateAndCleanResponse(response: string): string {
  let answer = response.trim();

  // 1. Quality Filter (Rejection patterns)
  const isWeak = 
    answer.length < 10 || 
    /i'm not sure|i cannot|unauthorized|i don't have enough information/i.test(answer);

  if (isWeak) {
    return QUALITY_FALLBACK;
  }

  // 2. Final Consistency & Length Control
  return answer.slice(0, 300);
}
