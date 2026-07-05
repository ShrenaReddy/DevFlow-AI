// ==========================================================
// DevFlow AI - Backend Server
// Express + Gemini API
// ==========================================================

require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

// Increase request timeout
app.set("timeout", 60000);

const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Default model
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

app.use(express.json({ limit: "1mb" }));

app.use(express.static(path.join(__dirname, "frontend")));


// ==========================================================
// Prompt Builder
// ==========================================================

function buildPrompt(
  idea,
  {
    complexity,
    focus,
    teamSize
  } = {}
) {

return `You are an expert Software Architect.

Generate ONLY ONE valid JSON object.

Do not write explanations.

Do not write markdown.

Do not write code fences.

Return ONLY JSON.

Schema:

{
"summary": string,

"techStack":{
"frontend":string,
"backend":string,
"database":string,
"hosting":string
},

"folderStructure":[string],

"roadmap":[
{
"phase":string,
"title":string
}
],

"features":[string],

"apis":[
{
"name":string,
"purpose":string,
"freeTier":string,
"docs":string,
"difficulty":number
}
],

"challenges":[string],

"aiTips":[string],

"difficulty":number
}

Rules:

- Keep everything concise.
- Be specific to the user's project.
- Folder structure should match the chosen stack.
- APIs should be real.
- Difficulty must be between 1 and 10.
- Return raw JSON only.

Project Idea:

${idea}

Complexity:
${complexity || "Intermediate"}

Focus:
${focus || "Speed of Shipping"}

Team:
${teamSize || "Solo Developer"}

`;

}



// ==========================================================
// Fallback Blueprint
// ==========================================================

function fallbackBlueprint(idea) {

return {

summary:
`A project blueprint for "${idea}". Gemini AI is currently unavailable, so this generic development plan is being shown.`,

techStack:{

frontend:"HTML, CSS, JavaScript",

backend:"Node.js + Express",

database:"MongoDB",

hosting:"Render"

},

folderStructure:[

"frontend/",

"frontend/index.html",

"frontend/style.css",

"frontend/script.js",

"server.js",

"routes/",

"controllers/",

"models/",

"middleware/",

"package.json",

".env"

],

roadmap:[

{
phase:"Phase 1",
title:"Project Setup"
},

{
phase:"Phase 2",
title:"Backend APIs"
},

{
phase:"Phase 3",
title:"Frontend Development"
},

{
phase:"Phase 4",
title:"Testing & Deployment"
}

],

features:[

"Authentication",

"Responsive UI",

"Dashboard",

"Search",

"Notifications"

],

apis:[

{

name:"Gemini API",

purpose:"AI content generation",

freeTier:"Yes",

docs:"https://ai.google.dev/gemini-api/docs",

difficulty:4

}

],

challenges:[

"Authentication",

"Database Design",

"API Integration"

],

aiTips:[

"Build backend first",

"Test APIs using Postman",

"Deploy early",

"Keep components reusable"

],

difficulty:5

};

}
// ==========================================================
// JSON Extractor
// ==========================================================

function extractJson(text) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in Gemini response.");
  }

  return JSON.parse(cleaned.substring(start, end + 1));
}


// ==========================================================
// Gemini API Retry Function
// ==========================================================

async function callGemini(body) {

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

    const response = await fetch(
      `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    // Success
    if (response.ok) {
      return response;
    }

    // Retry for temporary errors
    if (
      (response.status === 429 || response.status === 503) &&
      attempt < MAX_RETRIES
    ) {

      const wait = attempt * 3000;

      console.log(
        `[DevFlow AI] Gemini busy (${response.status}). Retry ${attempt}/${MAX_RETRIES} in ${wait / 1000}s...`
      );

      await new Promise(resolve => setTimeout(resolve, wait));

      continue;
    }

    const errText = await response.text();

    console.error(
      "Gemini API Error:",
      response.status,
      errText
    );

    throw new Error(
      `Gemini API returned status ${response.status}`
    );
  }
}


// ==========================================================
// Generate Blueprint Route
// ==========================================================

app.post("/api/generate", async (req, res) => {

  const {
    idea,
    complexity,
    focus,
    teamSize
  } = req.body || {};

  if (
    !idea ||
    typeof idea !== "string" ||
    idea.trim().length < 8
  ) {
    return res.status(400).json({
      error:
        "Please enter a project idea with at least 8 characters."
    });
  }

  if (!GEMINI_API_KEY) {

    console.warn(
      "[DevFlow AI] No GEMINI_API_KEY found. Returning fallback blueprint."
    );

    return res.json(
      fallbackBlueprint(idea.trim())
    );
  }

  try {

    const response = await callGemini({

      contents: [

        {

          role: "user",

          parts: [

            {

              text: buildPrompt(
                idea.trim(),
                {
                  complexity,
                  focus,
                  teamSize
                }
              )

            }

          ]

        }

      ],

      generationConfig: {

        temperature: 0.7,

        responseMimeType: "application/json"

      }

    });

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error(
        "Gemini returned an empty response."
      );
    }

    const blueprint = extractJson(text);

    return res.json(blueprint);

  } catch (err) {

    console.error(
      "[DevFlow AI] Generation failed:",
      err.message
    );

    const blueprint = fallbackBlueprint(
      idea.trim()
    );

    blueprint.warning =
      "Gemini AI is temporarily unavailable. Showing a fallback blueprint.";

    return res.status(200).json(blueprint);

  }

});
// ==========================================================
// Health Check Route
// ==========================================================

app.get("/api/health", (req, res) => {

  res.json({

    success: true,

    app: "DevFlow AI",

    version: "1.0.0",

    geminiConfigured: Boolean(GEMINI_API_KEY),

    model: GEMINI_MODEL

  });

});


// ==========================================================
// 404 Handler
// ==========================================================

app.use((req, res) => {

  res.status(404).json({

    success: false,

    message: "Route not found."

  });

});


// ==========================================================
// Global Error Handler
// ==========================================================

app.use((err, req, res, next) => {

  console.error("[Server Error]", err);

  res.status(500).json({

    success: false,

    message: "Something went wrong on the server."

  });

});


// ==========================================================
// Start Server
// ==========================================================

app.listen(PORT, () => {

  console.log("\n======================================");

  console.log("🚀 DevFlow AI Server Started");

  console.log(`🌐 URL: http://localhost:${PORT}`);

  console.log(`🤖 Gemini Model: ${GEMINI_MODEL}`);

  console.log(
    `🔑 API Key: ${
      GEMINI_API_KEY ? "Configured ✅" : "Missing ❌"
    }`
  );

  console.log("======================================\n");

});
