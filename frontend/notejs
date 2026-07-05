// ==========================================================
// DevFlow AI — Frontend Logic
// ==========================================================

const API_BASE = ""; // same-origin; server.js serves this file too

const landingView = document.getElementById("landing-view");
const dashboardView = document.getElementById("dashboard-view");
const loadingOverlay = document.getElementById("loading-overlay");
const ideaInput = document.getElementById("idea-input");
const generateBtn = document.getElementById("generate-btn");
const inputError = document.getElementById("input-error");
const complexitySelect = document.getElementById("complexity-select");
const focusSelect = document.getElementById("focus-select");
const teamSelect = document.getElementById("team-select");
const progressFill = document.getElementById("loading-progress-fill");
const bentoGrid = document.getElementById("bento-grid");
const backBtn = document.getElementById("back-btn");
const exportBtn = document.getElementById("export-btn");
const projectIdeaEcho = document.getElementById("project-idea-echo");

let currentBlueprint = null;
let currentIdea = "";

// ---------------- Generate flow ----------------

generateBtn.addEventListener("click", handleGenerate);
ideaInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
});

async function handleGenerate() {
  const idea = ideaInput.value.trim();
  inputError.textContent = "";

  if (idea.length < 8) {
    inputError.textContent = "Tell us a bit more about your idea (at least a few words).";
    return;
  }

  currentIdea = idea;
  generateBtn.disabled = true;
  showLoadingOverlay();

  const stepTimer = runLoadingSteps();

  try {
    const config = {
      complexity: complexitySelect ? complexitySelect.value : undefined,
      focus: focusSelect ? focusSelect.value : undefined,
      teamSize: teamSelect ? teamSelect.value : undefined,
    };
    const blueprint = await fetchBlueprint(idea, config);
    currentBlueprint = blueprint;
    // ensure the loading animation has time to feel premium
    await stepTimer;
    hideLoadingOverlay();
    renderDashboard(blueprint, idea);
    switchToDashboard();
  } catch (err) {
    await stepTimer.catch(() => {});
    hideLoadingOverlay();
    generateBtn.disabled = false;
    inputError.textContent =
      "Something went wrong generating your blueprint. " +
      (err && err.message ? err.message : "Please try again.");
    console.error(err);
  }
}

async function fetchBlueprint(idea, config = {}) {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, ...config }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Server responded with ${res.status}`);
  }

  return res.json();
}

// ---------------- Loading overlay ----------------

function showLoadingOverlay() {
  loadingOverlay.classList.remove("hidden");
  document.querySelectorAll(".loading-steps li").forEach((li) => li.classList.remove("active"));
  document.querySelectorAll(".loading-steps .check").forEach((c) => (c.textContent = "○"));

  // Restart the progress bar animation every time the overlay opens
  if (progressFill) {
    progressFill.style.animation = "none";
    void progressFill.offsetWidth; // force reflow
    progressFill.style.animation = "";
  }
}

function hideLoadingOverlay() {
  loadingOverlay.classList.add("hidden");
  generateBtn.disabled = false;
}

function runLoadingSteps() {
  const steps = document.querySelectorAll(".loading-steps li");
  return new Promise((resolve) => {
    let i = 0;
    function nextStep() {
      if (i > 0) {
        steps[i - 1].querySelector(".check").textContent = "✓";
      }
      if (i < steps.length) {
        steps[i].classList.add("active");
        i++;
        setTimeout(nextStep, 650);
      } else {
        resolve();
      }
    }
    nextStep();
  });
}

// ---------------- View switching ----------------

function switchToDashboard() {
  landingView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

backBtn.addEventListener("click", () => {
  dashboardView.classList.add("hidden");
  landingView.classList.remove("hidden");
  bentoGrid.innerHTML = "";
});

// ---------------- Rendering ----------------

function renderDashboard(bp, idea) {
  projectIdeaEcho.textContent = `"${idea}"`;
  bentoGrid.innerHTML = "";

  const cards = [
    buildSummaryCard(bp),
    buildTechStackCard(bp),
    buildFolderCard(bp),
    buildRoadmapCard(bp),
    buildFeaturesCard(bp),
    buildApisCard(bp),
    buildChallengesCard(bp),
    buildTipsCard(bp),
    buildDifficultyCard(bp),
  ];

  // The CSS already staggers each card's entrance via nth-child animation-delay,
  // so we just need to append them and wire up the tilt interaction.
  cards.forEach((card) => {
    bentoGrid.appendChild(card);
    attachTilt(card);
  });
}

function el(html) {
  const div = document.createElement("div");
  div.innerHTML = html.trim();
  return div.firstChild;
}

function buildSummaryCard(bp) {
  return el(`
    <div class="bento-card card-summary">
      <div class="card-icon">📋</div>
      <div class="card-title">Project Summary</div>
      <div class="card-body">${escapeHtml(bp.summary || "")}</div>
    </div>
  `);
}

function buildTechStackCard(bp) {
  const stack = bp.techStack || {};
  const rows = Object.entries(stack)
    .map(
      ([label, value]) => `
      <div class="stack-row">
        <span class="stack-label">${escapeHtml(capitalize(label))}</span>
        <span class="stack-value">${escapeHtml(value)}</span>
      </div>`
    )
    .join("");
  return el(`
    <div class="bento-card card-techstack">
      <div class="card-icon">🛠️</div>
      <div class="card-title">Tech Stack</div>
      <div class="card-body">${rows || "No stack suggested."}</div>
    </div>
  `);
}

function buildFolderCard(bp) {
  const items = bp.folderStructure || [];
  const tree = items
    .map((item) => {
      const isFile = item.includes(".");
      const depth = (item.match(/\//g) || []).length;
      const indent = "  ".repeat(depth);
      return `${indent}${isFile ? `<span class="file">${escapeHtml(item)}</span>` : escapeHtml(item)}`;
    })
    .join("\n");
  return el(`
    <div class="bento-card card-folder">
      <div class="card-icon">🗂️</div>
      <div class="card-title">Folder Structure</div>
      <div class="card-body folder-tree">${tree || "No structure suggested."}</div>
    </div>
  `);
}

function buildRoadmapCard(bp) {
  const phases = bp.roadmap || [];
  const list = phases
    .map(
      (p, i) => `
      <div class="roadmap-step">
        <div class="roadmap-num">${i + 1}</div>
        <div class="roadmap-text">
          <div class="roadmap-phase">${escapeHtml(p.phase || `Phase ${i + 1}`)}</div>
          <div class="roadmap-title">${escapeHtml(p.title || "")}</div>
        </div>
      </div>`
    )
    .join("");
  return el(`
    <div class="bento-card card-roadmap">
      <div class="card-icon">🗺️</div>
      <div class="card-title">Roadmap</div>
      <div class="card-body roadmap-list">${list || "No roadmap suggested."}</div>
    </div>
  `);
}

function buildFeaturesCard(bp) {
  const features = bp.features || [];
  const list = features
    .map(
      (f) => `
      <div class="feature-item"><span class="feature-check">✓</span> ${escapeHtml(f)}</div>`
    )
    .join("");
  return el(`
    <div class="bento-card card-features">
      <div class="card-icon">✅</div>
      <div class="card-title">Features</div>
      <div class="card-body feature-list">${list || "No features suggested."}</div>
    </div>
  `);
}

function buildApisCard(bp) {
  const apis = bp.apis || [];
  const list = apis
    .map(
      (a) => `
      <div class="api-item">
        <div class="api-name">${escapeHtml(a.name || "")}</div>
        <div class="api-purpose">${escapeHtml(a.purpose || "")}</div>
        <div class="api-meta">
          <span>Free Tier: ${escapeHtml(a.freeTier || "N/A")}</span>
          ${a.docs ? `<a href="${escapeAttr(a.docs)}" target="_blank" rel="noopener">Docs ↗</a>` : ""}
        </div>
        <div class="difficulty-bar-track"><div class="difficulty-bar-fill" data-pct="${(a.difficulty || 0) * 10}"></div></div>
        <div class="difficulty-label">${a.difficulty || 0} / 10 difficulty</div>
      </div>`
    )
    .join("");
  return el(`
    <div class="bento-card card-apis">
      <div class="card-icon">🔌</div>
      <div class="card-title">Recommended APIs</div>
      <div class="card-body api-grid">${list || "No APIs suggested."}</div>
    </div>
  `);
}

function buildChallengesCard(bp) {
  const challenges = bp.challenges || [];
  const list = challenges
    .map((c) => `<div class="challenge-item">${escapeHtml(c)}</div>`)
    .join("");
  return el(`
    <div class="bento-card card-challenges">
      <div class="card-icon">⚠️</div>
      <div class="card-title">Challenges</div>
      <div class="card-body challenge-list">${list || "No challenges identified."}</div>
    </div>
  `);
}

function buildTipsCard(bp) {
  const tips = bp.aiTips || [];
  const list = tips
    .map((t) => `<div class="tip-item"><span>💡</span><span>${escapeHtml(t)}</span></div>`)
    .join("");
  return el(`
    <div class="bento-card card-tips">
      <div class="card-icon">💡</div>
      <div class="card-title">AI Tips</div>
      <div class="card-body tip-list">${list || "No tips available."}</div>
    </div>
  `);
}

function buildDifficultyCard(bp) {
  const diff = bp.difficulty || 5;
  const pct = diff * 10;
  return el(`
    <div class="bento-card card-difficulty">
      <div class="card-icon">📊</div>
      <div class="card-title">Overall Difficulty</div>
      <div class="card-body difficulty-overall">
        <div class="difficulty-ring" style="--pct:${pct}"><span>${diff}/10</span></div>
        <div class="difficulty-summary">
          This project is estimated at <strong>${diff} / 10</strong> difficulty based on the
          complexity of the chosen stack, integrations, and roadmap scope. Focus on shipping the
          core flow first, then layer in the more advanced pieces.
        </div>
      </div>
    </div>
  `);
}

// animate difficulty bars once inserted
const barObserver = new MutationObserver(() => {
  document.querySelectorAll(".difficulty-bar-fill[data-pct]").forEach((bar) => {
    const pct = bar.getAttribute("data-pct");
    requestAnimationFrame(() => (bar.style.width = pct + "%"));
    bar.removeAttribute("data-pct");
  });
});
barObserver.observe(bentoGrid, { childList: true, subtree: true });

// ---------------- 3D tilt ----------------

function attachTilt(card) {
  const maxTilt = 6;
  card.addEventListener("mouseenter", () => {
    // pause the idle floating keyframe animation so it doesn't fight the tilt transform
    card.classList.add("tilt-active");
  });
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * maxTilt * 2;
    const rotateX = ((y / rect.height) - 0.5) * -maxTilt * 2;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.01)`;
  });
  card.addEventListener("mouseleave", () => {
    card.classList.remove("tilt-active");
    card.style.transform = "";
  });
}

// ---------------- Export PDF ----------------

exportBtn.addEventListener("click", exportPdf);

async function exportPdf() {
  if (!currentBlueprint) return;
  exportBtn.disabled = true;
  const original = exportBtn.innerHTML;
  exportBtn.innerHTML = "<span>⏳</span> Exporting...";

  const clone = bentoGrid.cloneNode(true);
  clone.querySelectorAll(".bento-card").forEach((c) => {
    c.style.opacity = "1";
    c.style.transform = "none";
  });

  const wrapper = document.createElement("div");
  wrapper.style.background = "#09090b";
  wrapper.style.padding = "32px";
  wrapper.style.width = "1100px";

  const title = document.createElement("h1");
  title.textContent = "DevFlow AI — Project Blueprint";
  title.style.color = "#fff";
  title.style.fontFamily = "Inter, sans-serif";
  title.style.marginBottom = "8px";

  const subtitle = document.createElement("p");
  subtitle.textContent = `"${currentIdea}"`;
  subtitle.style.color = "#a1a1aa";
  subtitle.style.fontFamily = "Inter, sans-serif";
  subtitle.style.marginBottom = "24px";

  wrapper.appendChild(title);
  wrapper.appendChild(subtitle);
  wrapper.appendChild(clone);

  const target = document.getElementById("pdf-render-target");
  target.innerHTML = "";
  target.appendChild(wrapper);

  try {
    await html2pdf()
      .set({
        margin: 0,
        filename: "devflow-ai-blueprint.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: "#09090b" },
        jsPDF: { unit: "px", format: [1200, 1600], orientation: "portrait" },
      })
      .from(wrapper)
      .save();
  } catch (err) {
    console.error(err);
    alert("Could not export PDF. Please try again.");
  } finally {
    target.innerHTML = "";
    exportBtn.disabled = false;
    exportBtn.innerHTML = original;
  }
}

// ---------------- Helpers ----------------

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}