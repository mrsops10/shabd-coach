// Shabd AI coach: server function that keeps the Gemini API key secret.
// The page sends a task name and small data; only these four tasks are allowed.

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const SESSION_SIZE = 5;

const clip = (s, n) => {
  s = String(s ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n) : s;
};

function buildPrompt(task, d) {
  const coach = "You are Shabd, a warm English vocabulary coach for Indian learners. Use very simple English.";
  const word = d.word
    ? `Target word: "${clip(d.word.w, 40)}" (${clip(d.word.pos, 20)}): ${clip(d.word.def, 160)}.`
    : "";
  if (task === "judge") {
    return `${coach}
${word}
The learner tried to explain the meaning in their own words. It came from speech recognition, so ignore spelling and punctuation; Hinglish or Hindi is fine.
Learner said: "${clip(d.answer, 300)}"
Verdict rules: "correct" if the core idea is right, even if informal or incomplete; "close" if partly right or too vague; "wrong" otherwise.
Reply with only JSON: {"verdict":"correct|close|wrong","feedback":"one short spoken sentence, max 20 words. If not correct, nudge without giving the full definition."}`;
  }
  if (task === "sentence") {
    return `${coach}
${word}
The learner made a sentence with the word. It came from speech recognition, so ignore punctuation and capitalisation, and if the target word looks misheard as a similar-sounding word, assume they said the target word.
Sentence: "${clip(d.sentence, 300)}"
Judge only whether the word is used with the right meaning and the sentence is understandable.
Reply with only JSON: {"correct":true,"feedback":"one encouraging sentence, max 22 words, mention one specific thing","better":"an improved version of their sentence, or empty string if already good"}`;
  }
  if (task === "ask") {
    return `${coach}
${word}
The learner asked a question about this word: "${clip(d.question, 300)}"
Answer in at most 45 words, in a natural spoken style with no markdown or lists. Use a short example if it helps. If the question has nothing to do with English learning, kindly bring them back to the word.
Reply with only JSON: {"answer":"..."}`;
  }
  if (task === "topic") {
    return `${coach}
Create ${SESSION_SIZE} useful English words for a learner on the topic: "${clip(d.topic, 60)}". Difficulty: ${clip(d.level, 20)}. Prefer words people actually use at work and in daily life; avoid very rare words. If the topic is unsafe or inappropriate, return an empty list.
For each word give: w (lowercase word), syl (syllables joined by the · character), pos (noun, verb, adjective or adverb), def (simple definition, max 14 words), hi (Hindi meaning in Devanagari, 1 to 3 words), hiRoman (that Hindi meaning in lowercase roman letters, one word), ex (example sentence using the word, max 16 words), kw (6 short lowercase words or phrases a learner might say when explaining the meaning), forms (lowercase forms of the word, including the word itself).
Reply with only JSON: {"words":[{"w":"","syl":"","pos":"","def":"","hi":"","hiRoman":"","ex":"","kw":[],"forms":[]}]}`;
  }
  return null;
}

function parseJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a > -1 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch {} }
  return null;
}

const reply = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  if (req.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405);

  let body;
  try { body = await req.json(); } catch { return reply({ ok: false, error: "bad_json" }, 400); }

  const key = process.env.GEMINI_API_KEY;
  if (body?.task === "ping") return reply({ ok: Boolean(key), model: key ? MODEL : null });
  if (!key) return reply({ ok: false, error: "no_api_key" }, 503);

  const prompt = buildPrompt(body?.task, body?.data || {});
  if (!prompt) return reply({ ok: false, error: "unknown_task" }, 400);

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: body.task === "topic" ? 0.8 : 0.4,
            maxOutputTokens: 2048,
          },
        }),
      }
    );
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 400);
      console.error("Gemini error", r.status, detail);
      return reply({ ok: false, error: r.status === 429 ? "rate_limited" : "upstream_error", status: r.status }, 502);
    }
    const data = await r.json();
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    const result = parseJson(text);
    if (result == null) return reply({ ok: false, error: "bad_ai_output" }, 502);
    return reply({ ok: true, result });
  } catch (e) {
    console.error("Network error", e);
    return reply({ ok: false, error: "network_error" }, 502);
  }
};

export const config = { path: "/api/coach" };
