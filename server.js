// ==========================================================
// DevFlow AI — Backend Server
// Express server that proxies blueprint generation requests
// to the Google Gemini API and serves the static frontend.
// ==========================================================

require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.0-flash"; // used if the primary model is overloaded
const GEMINI_URL_FOR = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Calls Gemini with retries (exponential backoff) for transient errors (429/503),
// then falls back to a secondary model if the primary is still unavailable.
async function callGemini(prompt, { maxRetries = 2, json = true } = {}) {
  const models = [GEMINI_MODEL, FALLBACK_MODEL].filter(
    (m, i, arr) => arr.indexOf(m) === i // dedupe in case both env values match
  );

  let lastError;

  for (const model of models) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${GEMINI_URL_FOR(model)}?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: json
              ? { temperature: 0.7, responseMimeType: "application/json" }
              : { temperature: 0.7 },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error("Empty response from Gemini API.");
          return text;
        }

        // Only retry on transient errors; anything else (400, 401, 403) fails immediately.
        const transient = response.status === 429 || response.status === 503;
        const errText = await response.text();
        lastError = new Error(`Gemini API (${model}) returned ${response.status}: ${errText}`);

        if (!transient) throw lastError;

        console.warn(
          `[DevFlow AI] ${model} returned ${response.status} (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`
        );
        if (attempt < maxRetries) await sleep(500 * Math.pow(2, attempt)); // 500ms, 1s, 2s...
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) await sleep(500 * Math.pow(2, attempt));
      }
    }
    console.warn(`[DevFlow AI] Exhausted retries on ${model}, trying next model if available...`);
  }

  throw lastError || new Error("Gemini API failed for an unknown reason.");
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "frontend")));

// ---------------- Prompt builder ----------------

function buildPrompt(idea, { complexity, focus, teamSize } = {}) {
  return `You are a senior software architect. A user will describe a project idea, and you must
respond with ONLY a single valid JSON object (no markdown fences, no commentary, no extra text)
that matches this exact schema:

{
  "summary": string (2-3 sentences describing the project and its core value),
  "techStack": { "frontend": string, "backend": string, "database": string, "hosting": string },
  "folderStructure": string[] (10-16 realistic file/folder paths for this project, using trailing "/" for folders),
  "roadmap": [ { "phase": string (e.g. "Phase 1"), "title": string (short milestone name) } ] (4-6 items, in order),
  "features": string[] (5-8 short feature names, 1-3 words each),
  "apis": [ { "name": string, "purpose": string (short), "freeTier": string (short, e.g. "Yes, 10k req/mo"), "docs": string (a real documentation URL), "difficulty": number (1-10) } ] (2-4 relevant third-party APIs for THIS project, not for building DevFlow AI itself),
  "challenges": string[] (3-5 short technical challenges specific to this project),
  "aiTips": string[] (4-6 short, actionable implementation tips),
  "difficulty": number (1-10, overall project difficulty)
}

Rules:
- Base every field on the user's actual idea below — be specific, not generic.
- Keep every string concise (the UI has limited space).
- folderStructure should reflect the chosen tech stack.
- Respond with raw JSON only. Do not wrap it in \`\`\`json or any other text.

User's project idea:
"""
${idea}
"""

Additional preferences to tailor the plan around:
- Target complexity level: ${complexity || "Intermediate"}
- Primary focus: ${focus || "Speed of shipping"}
- Team size: ${teamSize || "Solo developer"}`;
}

// ---------------- Fallback (used if Gemini is unreachable / no key) ----------------

function fallbackBlueprint(idea) {
  return {
    summary: `A web application built around the idea: "${idea}". This blueprint is a generic starting point — connect a valid GEMINI_API_KEY to generate a fully tailored plan.`,
    techStack: { frontend: "React", backend: "Node.js", database: "MongoDB", hosting: "Render" },
    folderStructure: [
      "client/",
      "client/src/",
      "client/src/components/",
      "client/src/pages/",
      "server/",
      "server/routes/",
      "server/controllers/",
      "server/models/",
      "server/middleware/",
      "public/",
      "package.json",
      ".env",
    ],
    roadmap: [
      { phase: "Phase 1", title: "Authentication" },
      { phase: "Phase 2", title: "Core Database Models" },
      { phase: "Phase 3", title: "Dashboard & UI" },
      { phase: "Phase 4", title: "Deployment" },
    ],
    features: ["Login", "Payments", "Admin", "Search", "Notifications"],
    apis: [
      {
        name: "Gemini API",
        purpose: "AI-powered content generation",
        freeTier: "Yes, generous free quota",
        docs: "https://ai.google.dev/gemini-api/docs",
        difficulty: 4,
      },
    ],
    challenges: [
      "Designing a scalable data model",
      "Handling authentication securely",
      "Keeping the UI responsive under load",
    ],
    aiTips: [
      "Start with authentication.",
      "Build APIs before UI.",
      "Use JWT for stateless auth.",
      "Optimize images before shipping.",
    ],
    difficulty: 5,
  };
}

// ---------------- Robust JSON extraction ----------------

function extractJson(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model response.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// ---------------- Route ----------------

app.post("/api/generate", async (req, res) => {
  const { idea, complexity, focus, teamSize } = req.body || {};

  if (!idea || typeof idea !== "string" || idea.trim().length < 8) {
    return res.status(400).json({ error: "Please provide a project idea (min 8 characters)." });
  }

  if (!GEMINI_API_KEY) {
    console.warn("[DevFlow AI] GEMINI_API_KEY is not set — returning fallback blueprint.");
    return res.json(fallbackBlueprint(idea.trim()));
  }

  try {
    const prompt = buildPrompt(idea.trim(), { complexity, focus, teamSize });
    const text = await callGemini(prompt);
    const blueprint = extractJson(text);
    res.json(blueprint);
  } catch (err) {
    console.error("[DevFlow AI] Generation failed after retries:", err.message);
    res.status(200).json(fallbackBlueprint(idea.trim()));
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, geminiConfigured: Boolean(GEMINI_API_KEY) });
});

app.listen(PORT, () => {
  console.log(`\n  🚀 DevFlow AI running at http://localhost:${PORT}\n`);
  if (!GEMINI_API_KEY) {
    console.log("  ⚠️  No GEMINI_API_KEY found in .env — using fallback blueprints.\n");
  }
});
