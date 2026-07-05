// ==========================================================
// DevFlow AI
// Backend Server
// Express + Gemini API
// ==========================================================

require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

app.use(express.json({ limit: "2mb" }));

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "frontend")));


// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get("/api/health", (req, res) => {

    res.json({
        status: "online",
        server: "DevFlow AI",

        geminiConfigured: Boolean(GEMINI_API_KEY),

        model: GEMINI_MODEL,

        timestamp: new Date().toISOString()
    });

});


// --------------------------------------------------
// Sleep helper
// --------------------------------------------------

function sleep(ms){

    return new Promise(resolve=>setTimeout(resolve,ms));

}


// --------------------------------------------------
// JSON extractor
// Gemini sometimes wraps JSON in markdown.
// This safely extracts it.
// --------------------------------------------------

function extractJSON(text){

    if(!text){

        throw new Error("Gemini returned an empty response.");

    }

    text=text
        .replace(/```json/g,"")
        .replace(/```/g,"")
        .trim();

    const start=text.indexOf("{");

    const end=text.lastIndexOf("}");

    if(start===-1 || end===-1){

        throw new Error("No JSON found in Gemini response.");

    }

    return JSON.parse(
        text.substring(start,end+1)
    );

}


// --------------------------------------------------
// Blueprint validator
// Ensures every required field exists.
// --------------------------------------------------

function validateBlueprint(bp){

    return{

        summary:
            bp.summary || "",

        techStack:
            bp.techStack || {},

        folderStructure:
            bp.folderStructure || [],

        roadmap:
            bp.roadmap || [],

        features:
            bp.features || [],

        apis:
            bp.apis || [],

        challenges:
            bp.challenges || [],

        aiTips:
            bp.aiTips || [],

        difficulty:
            bp.difficulty || 5

    };

}
// --------------------------------------------------
// Prompt Builder
// --------------------------------------------------

function buildPrompt(
    idea,
    {
        complexity = "Intermediate",
        focus = "Fast Development",
        teamSize = "Solo Developer"
    } = {}
){

return `
You are an expert software architect with 15+ years of experience.

A user will give you a software project idea.

Your task is to create a COMPLETE project blueprint.

Return ONLY valid JSON.

Do NOT use markdown.

Do NOT explain anything.

Schema:

{
  "summary": string,

  "techStack": {
      "frontend": string,
      "backend": string,
      "database": string,
      "hosting": string
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

1.
Generate ONLY JSON.

2.
No markdown.

3.
No code blocks.

4.
No explanations.

5.
Every recommendation should match THIS project.

6.
Folder structure should contain
12-18 realistic folders/files.

7.
Roadmap should contain
6 phases.

8.
Features should contain
8-12 features.

9.
Recommend REAL APIs.

10.
Use actual documentation links.

11.
Difficulty should be between
1 and 10.

12.
Keep the summary under 80 words.

Project Idea:

"${idea}"

Preferences

Complexity:
${complexity}

Focus:
${focus}

Team:
${teamSize}

`;
}



// --------------------------------------------------
// Generic fallback
// Used only if Gemini completely fails.
// --------------------------------------------------

function fallbackBlueprint(idea){

return{

summary:
`A project blueprint for "${idea}". Gemini AI is currently unavailable, so this generic development plan is being shown. Retry after a few moments for a personalized AI-generated blueprint.`,

techStack:{

frontend:"React",

backend:"Node.js + Express",

database:"MongoDB",

hosting:"Render"

},

folderStructure:[

"frontend/",

"frontend/index.html",

"frontend/style.css",

"frontend/script.js",

"backend/",

"backend/routes/",

"backend/controllers/",

"backend/models/",

"backend/utils/",

"backend/middleware/",

".env",

"package.json"

],

roadmap:[

{
phase:"Phase 1",
title:"Project Setup"
},

{
phase:"Phase 2",
title:"Authentication"
},

{
phase:"Phase 3",
title:"Core Features"
},

{
phase:"Phase 4",
title:"Database Integration"
},

{
phase:"Phase 5",
title:"Testing"
},

{
phase:"Phase 6",
title:"Deployment"
}

],

features:[

"User Authentication",

"Responsive UI",

"Dashboard",

"Search",

"Notifications",

"Profile Management",

"Settings",

"Analytics"

],

apis:[

{

name:"REST API",

purpose:"Backend Communication",

freeTier:"Unlimited",

docs:"https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API",

difficulty:2

}

],

challenges:[

"Authentication",

"Database Design",

"Performance Optimization",

"Responsive UI"

],

aiTips:[

"Build the backend first.",

"Keep components reusable.",

"Deploy early.",

"Use Git branches.",

"Write reusable APIs."

],

difficulty:5

};

}
// --------------------------------------------------
// Gemini API Caller
// Retries automatically for temporary failures.
// --------------------------------------------------

async function callGemini(prompt) {

    const MAX_RETRIES = 5;

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        console.log(`\n[Gemini] Attempt ${attempt}/${MAX_RETRIES}`);

        try {

            const controller = new AbortController();

            const timeout = setTimeout(() => {
                controller.abort();
            }, 30000); // 30 seconds timeout

            const response = await fetch(
                `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
                {
                    method: "POST",

                    signal: controller.signal,

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        contents: [
                            {
                                role: "user",
                                parts: [
                                    {
                                        text: prompt
                                    }
                                ]
                            }
                        ],

                        generationConfig: {

                            temperature: 0.7,

                            topP: 0.95,

                            topK: 40,

                            maxOutputTokens: 8192,

                            responseMimeType: "application/json"

                        }

                    })

                }
            );

            clearTimeout(timeout);

            // ----------------------------
            // Success
            // ----------------------------

            if (response.ok) {

                const json = await response.json();

                return json;

            }

            // ----------------------------
            // Read error body
            // ----------------------------

            const errorText = await response.text();

            console.error(
                "\nGemini Error:",
                response.status,
                errorText
            );

            lastError = new Error(
                `Gemini returned ${response.status}`
            );

            // ----------------------------
            // Retry on Busy / Rate Limit
            // ----------------------------

            if (
                response.status === 429 ||
                response.status === 503
            ) {

                const waitTime =
                    Math.min(attempt * 3000, 12000);

                console.log(
                    `Retrying in ${waitTime / 1000}s...`
                );

                await sleep(waitTime);

                continue;

            }

            // ----------------------------
            // Invalid API Key
            // ----------------------------

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                throw new Error(
                    "Invalid Gemini API Key."
                );

            }

            throw lastError;

        }

        catch(err){

            lastError = err;

            console.error(
                "[Gemini]",
                err.message
            );

            // Fetch timeout
            if(
                err.name==="AbortError"
            ){

                console.log(
                    "Gemini timed out."
                );

            }

            if(attempt<MAX_RETRIES){

                await sleep(
                    attempt*2500
                );

                continue;

            }

        }

    }

    throw lastError;

}
// --------------------------------------------------
// Generate Blueprint Route
// --------------------------------------------------

app.post("/api/generate", async (req, res) => {

    try {

        const {
            idea,
            complexity,
            focus,
            teamSize
        } = req.body || {};

        // ----------------------------
        // Validate input
        // ----------------------------

        if (
            !idea ||
            typeof idea !== "string" ||
            idea.trim().length < 8
        ) {

            return res.status(400).json({
                error: "Please enter a valid project idea."
            });

        }

        // ----------------------------
        // API key missing
        // ----------------------------

        if (!GEMINI_API_KEY) {

            console.warn(
                "[DevFlow AI] No GEMINI_API_KEY found."
            );

            return res.json(
                fallbackBlueprint(idea)
            );

        }

        console.log(
            "\n=============================="
        );

        console.log(
            "Generating Blueprint..."
        );

        console.log(
            "Idea:",
            idea
        );

        console.log(
            "Model:",
            GEMINI_MODEL
        );

        console.log(
            "==============================\n"
        );

        // ----------------------------
        // Build Prompt
        // ----------------------------

        const prompt = buildPrompt(
            idea,
            {
                complexity,
                focus,
                teamSize
            }
        );

        // ----------------------------
        // Call Gemini
        // ----------------------------

        const geminiResponse =
            await callGemini(prompt);

        // ----------------------------
        // Extract text
        // ----------------------------

        const text =
            geminiResponse
                ?.candidates?.[0]
                ?.content?.parts?.[0]
                ?.text;

        if (!text) {

            throw new Error(
                "Gemini returned an empty response."
            );

        }

        // ----------------------------
        // Parse JSON
        // ----------------------------

        let blueprint;

        try {

            blueprint =
                extractJSON(text);

        }

        catch(parseError){

            console.error(
                "\nInvalid JSON from Gemini:\n"
            );

            console.error(text);

            throw new Error(
                "Gemini returned malformed JSON."
            );

        }

        // ----------------------------
        // Validate blueprint
        // ----------------------------

        blueprint =
            validateBlueprint(
                blueprint
            );

        console.log(
            "Blueprint generated successfully.\n"
        );

        return res.json(
            blueprint
        );

    }

    catch(error){

        console.error(
            "\n================================="
        );

        console.error(
            "Blueprint Generation Failed"
        );

        console.error(
            error.message
        );

        console.error(
            "=================================\n"
        );

        // Last safety fallback
        return res.json(

            fallbackBlueprint(
                req.body.idea || "Untitled Project"
            )

        );

    }

});
// --------------------------------------------------
// Default Route
// --------------------------------------------------

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "frontend", "index.html")
    );

});


// --------------------------------------------------
// 404 Handler
// --------------------------------------------------

app.use((req, res) => {

    res.status(404).json({

        success: false,

        error: "Route not found."

    });

});


// --------------------------------------------------
// Global Error Handler
// --------------------------------------------------

app.use((err, req, res, next) => {

    console.error("\n========== SERVER ERROR ==========\n");

    console.error(err);

    console.error("\n==================================\n");

    res.status(500).json({

        success: false,

        error: "Internal Server Error"

    });

});


// --------------------------------------------------
// Start Server
// --------------------------------------------------

app.listen(PORT, () => {

    console.log("\n====================================");

    console.log("🚀 DevFlow AI Started Successfully");

    console.log("====================================");

    console.log(`Server : http://localhost:${PORT}`);

    console.log(`Model  : ${GEMINI_MODEL}`);

    console.log(
        `Gemini Key : ${
            GEMINI_API_KEY
                ? "Configured ✅"
                : "Missing ❌"
        }`
    );

    console.log("====================================\n");

});