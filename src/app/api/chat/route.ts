import { ANSWER_PASSAGES, handleChatRequest, parseSimilarityFloor } from "@/lib/chat-api";
import { createGroundedAnswerClient } from "@/lib/grounded-answer";
import { createRateLimiter } from "@/lib/rate-limit";
import { searchWithGemini } from "@/lib/server-search";

export const runtime = "nodejs";

// Per server process; every question costs an embedding and a model call.
const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

export async function POST(request: Request) {
  const { DATABASE_URL, GEMINI_API_KEY, AIBOT_URL, AIBOT_API_KEY, SIMILARITY_FLOOR } = process.env;
  return handleChatRequest(request, {
    enabled: Boolean(DATABASE_URL && GEMINI_API_KEY && AIBOT_URL && AIBOT_API_KEY),
    allow: key => limiter.allow(key),
    floor: parseSimilarityFloor(SIMILARITY_FLOOR),
    search: question => searchWithGemini(question, ANSWER_PASSAGES),
    answer: (question, passages) =>
      createGroundedAnswerClient({ url: AIBOT_URL, apiKey: AIBOT_API_KEY }).answer(question, passages),
  });
}
