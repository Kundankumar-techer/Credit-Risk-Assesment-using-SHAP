/**
 * Credit Ledger — Modern Underwriting & SHAP Explainability Engine
 * UI/UX Interaction & Animation Controller
 */
(() => {
  // DOM Elements
  const form = document.getElementById("riskForm");
  const submitBtn = document.getElementById("submitBtn");
  const resetBtn = document.getElementById("resetBtn");
  const errorNote = document.getElementById("errorNote");
  const toastContainer = document.getElementById("toastContainer");

  // Inputs
  const ageInput = document.getElementById("person_age");
  const incomeInput = document.getElementById("person_income");
  const incomeRange = document.getElementById("incomeRange");
  const incomeLiveVal = document.getElementById("incomeLiveVal");

  const homeInput = document.getElementById("person_home_ownership");
  const empInput = document.getElementById("person_emp_length");
  const intentInput = document.getElementById("loan_intent");
  const gradeInput = document.getElementById("loan_grade");

  const amountInput = document.getElementById("loan_amnt");
  const amountRange = document.getElementById("amountRange");
  const amountLiveVal = document.getElementById("amountLiveVal");

  const rateInput = document.getElementById("loan_int_rate");
  const percentInput = document.getElementById("loan_percent_income");
  const dtiBadge = document.getElementById("dtiBadge");

  const defaultInput = document.getElementById("cb_person_default_on_file");
  const histInput = document.getElementById("cb_person_cred_hist_length");

  // Verdict & Intelligence Panel
  const verdictCard = document.getElementById("verdictCard");
  const tierTitle = document.getElementById("tierTitle");
  const stampBadge = document.getElementById("stampBadge");
  const stampText = document.getElementById("stampText");

  const gaugeFill = document.getElementById("gaugeFill");
  const gaugeThresholdLine = document.getElementById("gaugeThresholdLine");
  const probNumber = document.getElementById("probNumber");
  const thresholdLabel = document.getElementById("thresholdLabel");

  const recommendationBox = document.getElementById("recommendationBox");
  const recIcon = document.getElementById("recIcon");
  const recText = document.getElementById("recText");

  const metricResult = document.getElementById("metricResult");
  const metricProb = document.getElementById("metricProb");
  const metricThreshold = document.getElementById("metricThreshold");
  const metricBuffer = document.getElementById("metricBuffer");

  const shapFactorsList = document.getElementById("shapFactorsList");

  const copyReportBtn = document.getElementById("copyReportBtn");
  const simulateBtn = document.getElementById("simulateBtn");
  const audioToggleBtn = document.getElementById("audioToggleBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  // Status Elements
  const apiDot = document.getElementById("apiDot");
  const apiStatusText = document.getElementById("apiStatusText");
  const apiLatency = document.getElementById("apiLatency");

  // SVG Gauge Constant: 2 * PI * 92
  const GAUGE_CIRCUMFERENCE = 578.05;

  // Preset Data Profiles
  const PRESETS = {
    prime: {
      person_age: 34,
      person_income: 1200000,
      person_home_ownership: "MORTGAGE",
      person_emp_length: 8,
      loan_intent: "HOMEIMPROVEMENT",
      loan_grade: "A",
      loan_amnt: 150000,
      loan_int_rate: 7.25,
      cb_person_default_on_file: "N",
      cb_person_cred_hist_length: 10
    },
    standard: {
      person_age: 30,
      person_income: 600000,
      person_home_ownership: "RENT",
      person_emp_length: 5,
      loan_intent: "PERSONAL",
      loan_grade: "B",
      loan_amnt: 100000,
      loan_int_rate: 11.50,
      cb_person_default_on_file: "N",
      cb_person_cred_hist_length: 6
    },
    venture: {
      person_age: 28,
      person_income: 450000,
      person_home_ownership: "RENT",
      person_emp_length: 3.5,
      loan_intent: "VENTURE",
      loan_grade: "C",
      loan_amnt: 120000,
      loan_int_rate: 13.80,
      cb_person_default_on_file: "N",
      cb_person_cred_hist_length: 4
    },
    subprime: {
      person_age: 22,
      person_income: 180000,
      person_home_ownership: "RENT",
      person_emp_length: 0.5,
      loan_intent: "DEBTCONSOLIDATION",
      loan_grade: "G",
      loan_amnt: 220000,
      loan_int_rate: 21.50,
      cb_person_default_on_file: "Y",
      cb_person_cred_hist_length: 2
    }
  };

  // State
  let soundEnabled = localStorage.getItem("cl_sound_enabled") !== "false";
  let lastResultData = null;

  // =========================================================================
  // AUDIO SYNTHESIZER (WEB AUDIO API)
  // Subtle, pleasant micro-interaction beeps without external assets
  // =========================================================================
  const audioCtx = window.AudioContext ? new (window.AudioContext || window.webkitAudioContext)() : null;

  function playTone(freq, type, duration, gainVal = 0.04) {
    if (!soundEnabled || !audioCtx) return;
    try {
      if (audioCtx.state === "suspended") audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (_) {}
  }

  function playSuccessSound() {
    playTone(523.25, "sine", 0.1, 0.05); // C5
    setTimeout(() => playTone(659.25, "sine", 0.15, 0.05), 80); // E5
  }

  function playRiskAlertSound() {
    playTone(392.00, "triangle", 0.12, 0.06); // G4
    setTimeout(() => playTone(311.13, "sawtooth", 0.25, 0.05), 100); // Eb4
  }

  function playClickSound() {
    playTone(700, "sine", 0.04, 0.02);
  }

  // Audio Toggle Button
  function updateAudioButtonState() {
    audioToggleBtn.classList.toggle("active", soundEnabled);
    audioToggleBtn.style.opacity = soundEnabled ? "1" : "0.5";
  }
  updateAudioButtonState();

  audioToggleBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("cl_sound_enabled", soundEnabled ? "true" : "false");
    updateAudioButtonState();
    showToast(soundEnabled ? "Sound effects enabled" : "Sound effects muted");
    if (soundEnabled) playTone(600, "sine", 0.06, 0.03);
  });

  // =========================================================================
  // LIGHT & DARK THEME CONTROLLER
  // =========================================================================
  const iconSun = themeToggleBtn.querySelector(".icon-sun");
  const iconMoon = themeToggleBtn.querySelector(".icon-moon");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cl_theme", theme);
    if (theme === "light") {
      iconSun.style.display = "none";
      iconMoon.style.display = "block";
      themeToggleBtn.setAttribute("title", "Switch to Dark Mode");
    } else {
      iconSun.style.display = "block";
      iconMoon.style.display = "none";
      themeToggleBtn.setAttribute("title", "Switch to Light Mode");
    }
  }

  // Detect preferred or stored theme
  const initialTheme = localStorage.getItem("cl_theme") ||
    (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  applyTheme(initialTheme);

  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
    playClickSound();
    showToast(`Switched to ${nextTheme === "light" ? "Light" : "Dark"} Mode`);
  });

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(message, duration = 3000) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>✨</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.25s ease";
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // =========================================================================
  // CURRENCY & FORMATTING HELPERS
  // =========================================================================
  function formatINR(val) {
    return "₹" + Number(val).toLocaleString("en-IN");
  }

  // =========================================================================
  // SYNCHRONIZED SLIDERS & DEBT-TO-INCOME CALCULATION
  // =========================================================================
  function syncInputs() {
    const income = parseFloat(incomeInput.value) || 0;
    const amount = parseFloat(amountInput.value) || 0;

    incomeLiveVal.textContent = formatINR(income);
    amountLiveVal.textContent = formatINR(amount);

    incomeRange.value = income;
    amountRange.value = amount;

    // Calculate DTI
    if (income > 0) {
      const ratio = amount / income;
      const pct = (ratio * 100).toFixed(1) + "%";
      percentInput.value = ratio.toFixed(2);
      dtiBadge.textContent = pct;

      dtiBadge.className = "dti-badge";
      if (ratio < 0.20) {
        dtiBadge.classList.add("dti-badge--safe");
      } else if (ratio < 0.40) {
        dtiBadge.classList.add("dti-badge--warning");
      } else {
        dtiBadge.classList.add("dti-badge--danger");
      }
    }
  }

  incomeInput.addEventListener("input", syncInputs);
  amountInput.addEventListener("input", syncInputs);

  incomeRange.addEventListener("input", (e) => {
    incomeInput.value = e.target.value;
    syncInputs();
  });

  amountRange.addEventListener("input", (e) => {
    amountInput.value = e.target.value;
    syncInputs();
  });

  percentInput.addEventListener("input", () => {
    const ratio = parseFloat(percentInput.value) || 0;
    dtiBadge.textContent = (ratio * 100).toFixed(1) + "%";
  });

  // Initial Sync
  syncInputs();

  // =========================================================================
  // SERVICE STATUS & LATENCY MONITOR
  // =========================================================================
  async function checkServiceHealth() {
    const t0 = performance.now();
    try {
      const res = await fetch("/openapi.json");
      const latency = Math.round(performance.now() - t0);
      if (res.ok) {
        apiDot.className = "status-pulse ok";
        apiStatusText.textContent = "Engine Ready";
        apiLatency.textContent = `${latency} ms`;
      } else {
        throw new Error("HTTP " + res.status);
      }
    } catch (_) {
      apiDot.className = "status-pulse down";
      apiStatusText.textContent = "Offline";
      apiLatency.textContent = "-- ms";
    }
  }
  checkServiceHealth();
  setInterval(checkServiceHealth, 15000);

  // =========================================================================
  // PERSONA PRESET SWITCHER
  // =========================================================================
  function loadPreset(key) {
    const data = PRESETS[key];
    if (!data) return;

    playClickSound();

    ageInput.value = data.person_age;
    incomeInput.value = data.person_income;
    homeInput.value = data.person_home_ownership;
    empInput.value = data.person_emp_length;
    intentInput.value = data.loan_intent;
    gradeInput.value = data.loan_grade;
    amountInput.value = data.loan_amnt;
    rateInput.value = data.loan_int_rate;
    defaultInput.value = data.cb_person_default_on_file;
    histInput.value = data.cb_person_cred_hist_length;

    syncInputs();

    // Trigger instant evaluation
    submitAssessment();
    showToast(`Loaded Preset: ${key.toUpperCase()}`);
  }

  document.querySelectorAll(".preset-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".preset-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const presetKey = chip.getAttribute("data-preset");
      loadPreset(presetKey);
    });
  });

  // Reset button
  resetBtn.addEventListener("click", () => {
    loadPreset("standard");
    showToast("Form parameters reset to standard baseline");
  });

  // =========================================================================
  // ANIMATED NUMERICAL COUNTER
  // =========================================================================
  function animateNumber(el, from, to, duration = 1000) {
    const startTime = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      el.textContent = current.toFixed(1);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = to.toFixed(1);
      }
    }
    requestAnimationFrame(tick);
  }

  // =========================================================================
  // RENDER UNDERWRITING & SHAP VERDICT
  // =========================================================================
  function renderVerdict(data) {
    lastResultData = data;
    const probPct = data.default_probability * 100;
    const threshPct = data.threshold * 100;
    const isHighRisk = data.default_prediction === 1;

    // 1. Title & Risk Tier
    tierTitle.textContent = data.risk_tier || (isHighRisk ? "High Risk (Tier C)" : "Prime (Tier A+)");

    // 2. Decision Stamp Badge
    stampBadge.className = "stamp-box stamp--slam";
    if (isHighRisk) {
      stampBadge.classList.add("risk-high");
      stampText.textContent = "HIGH RISK\nDECLINE";
      playRiskAlertSound();
    } else {
      stampText.textContent = "LOW RISK\nAPPROVED";
      playSuccessSound();
    }

    // 3. Radial SVG Gauge Fill & Threshold Tick
    const strokeOffset = GAUGE_CIRCUMFERENCE * (1 - probPct / 100);
    gaugeFill.style.strokeDashoffset = Math.max(0, strokeOffset);

    // Color gradient shift based on probability
    if (probPct < 20) {
      gaugeFill.style.stroke = "url(#gaugeGradSafe)";
    } else if (probPct < threshPct) {
      gaugeFill.style.stroke = "url(#gaugeGradWarning)";
    } else {
      gaugeFill.style.stroke = "url(#gaugeGradDanger)";
    }

    // Position threshold marker line
    gaugeThresholdLine.style.transform = `rotate(${threshPct * 3.6}deg)`;
    thresholdLabel.textContent = `${threshPct.toFixed(1)}%`;

    // 4. Rolling Counter Readout
    animateNumber(probNumber, 0, probPct, 1100);

    // 5. Policy Recommendation Box
    recommendationBox.className = "recommendation-callout";
    if (isHighRisk) {
      recommendationBox.classList.add("risk-high");
      recIcon.textContent = "✕";
    } else {
      recIcon.textContent = "✓";
    }
    recText.textContent = data.recommendation || (isHighRisk ? "Decline Application: Excessive default risk." : "Auto-Approve: Prime low-risk profile.");

    // 6. Metrics Ledger Readout
    metricResult.textContent = data.Result;
    metricResult.style.color = isHighRisk ? "var(--danger-rose)" : "var(--safe-emerald)";
    metricProb.textContent = `${probPct.toFixed(2)}%`;
    metricThreshold.textContent = `${threshPct.toFixed(2)}%`;

    const buffer = threshPct - probPct;
    metricBuffer.textContent = (buffer > 0 ? "+" : "") + buffer.toFixed(1) + "%";
    metricBuffer.style.color = buffer > 0 ? "var(--safe-emerald)" : "var(--danger-rose)";

    // 7. Render SHAP Explainability Factors
    renderShapFactors(data.shap_factors || []);
  }

  function renderShapFactors(factors) {
    shapFactorsList.innerHTML = "";

    if (!factors || factors.length === 0) {
      shapFactorsList.innerHTML = `<p class="shap-caption" style="text-align:center; padding:12px 0;">No active feature contributions detected.</p>`;
      return;
    }

    // Show top 6 factors
    const topFactors = factors.slice(0, 6);
    const maxImpact = Math.max(...topFactors.map(f => Math.abs(f.impact)), 0.1);

    topFactors.forEach((f, idx) => {
      const isDecrease = f.direction === "risk_decrease";
      const pctWidth = Math.min(100, Math.max(12, (Math.abs(f.impact) / maxImpact) * 100));

      const row = document.createElement("div");
      row.className = "shap-factor-row";
      row.style.animation = `toastSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 60}ms forwards`;

      row.innerHTML = `
        <div class="factor-top-line">
          <span class="factor-name">${f.feature}</span>
          <span class="factor-val ${isDecrease ? 'decrease' : 'increase'}">
            ${isDecrease ? '▼ Reduces Risk' : '▲ Increases Risk'} (${f.impact > 0 ? '+' : ''}${f.impact.toFixed(3)})
          </span>
        </div>
        <div class="factor-bar-track">
          <div class="factor-bar-fill ${isDecrease ? 'safe' : 'risk'}" style="width: ${pctWidth}%;"></div>
        </div>
      `;
      shapFactorsList.appendChild(row);
    });
  }

  // =========================================================================
  // SUBMISSION LOGIC
  // =========================================================================
  async function submitAssessment() {
    errorNote.hidden = true;
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;

    const payload = {
      person_age: parseInt(ageInput.value, 10),
      person_income: parseFloat(incomeInput.value),
      person_home_ownership: homeInput.value,
      person_emp_length: parseFloat(empInput.value),
      loan_intent: intentInput.value,
      loan_grade: gradeInput.value,
      loan_amnt: parseFloat(amountInput.value),
      loan_int_rate: parseFloat(rateInput.value),
      loan_percent_income: parseFloat(percentInput.value),
      cb_person_default_on_file: defaultInput.value,
      cb_person_cred_hist_length: parseInt(histInput.value, 10),
    };

    try {
      const res = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body && body.detail) ? JSON.stringify(body.detail) : `HTTP ${res.status}`);
      }

      const data = await res.json();
      renderVerdict(data);
    } catch (err) {
      errorNote.textContent = `Underwriting service unreachable: ${err.message}`;
      errorNote.hidden = false;
      playRiskAlertSound();
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    playClickSound();
    submitAssessment();
  });

  // =========================================================================
  // UNDERWRITING SUMMARY CLIPBOARD EXPORT
  // =========================================================================
  copyReportBtn.addEventListener("click", () => {
    if (!lastResultData) {
      showToast("Please assess an application first");
      return;
    }
    const text = [
      "══════════════════════════════════════════",
      "      CREDIT LEDGER UNDERWRITING SUMMARY  ",
      "══════════════════════════════════════════",
      `Applicant Age: ${ageInput.value} yrs`,
      `Gross Income: ${formatINR(incomeInput.value)}`,
      `Facility Amount: ${formatINR(amountInput.value)} (${rateInput.value}% APR)`,
      `Debt-to-Income: ${(parseFloat(percentInput.value) * 100).toFixed(1)}%`,
      `Credit Grade: ${gradeInput.value} | Prior Default: ${defaultInput.value}`,
      "------------------------------------------",
      `VERDICT: ${lastResultData.Result.toUpperCase()}`,
      `Risk Tier: ${lastResultData.risk_tier}`,
      `Default Probability: ${(lastResultData.default_probability * 100).toFixed(2)}%`,
      `Policy Cutoff: ${(lastResultData.threshold * 100).toFixed(2)}%`,
      `Policy Action: ${lastResultData.recommendation}`,
      "══════════════════════════════════════════"
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      playTone(800, "sine", 0.08, 0.04);
      showToast("Underwriting dossier copied to clipboard!");
    }).catch(() => {
      showToast("Failed to copy to clipboard");
    });
  });

  // =========================================================================
  // COUNTER-OFFER SIMULATION (-20% PRINCIPAL)
  // =========================================================================
  simulateBtn.addEventListener("click", () => {
    const currentAmount = parseFloat(amountInput.value) || 100000;
    const reducedAmount = Math.max(10000, Math.round(currentAmount * 0.8));
    amountInput.value = reducedAmount;
    syncInputs();
    submitAssessment();
    showToast(`Simulated -20% exposure: ${formatINR(reducedAmount)}`);
  });

  // Initial Run on load
  submitAssessment();
})();
