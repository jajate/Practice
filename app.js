(() => {
  // =========================
  // Keyboard-only gate
  // =========================
  const isTouchLike =
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

  const el = {
    main: document.getElementById("main"),
    board: document.getElementById("board"),
    hint: document.getElementById("hint"),
    mobileBlock: document.getElementById("mobileBlock"),

    timerText: document.getElementById("timerText"),
    kpmText: document.getElementById("kpmText"),
    okText: document.getElementById("okText"),
    roundText: document.getElementById("roundText"),

    btnNew: document.getElementById("btnNew"),
    btnReset: document.getElementById("btnReset"),
    btnMute: document.getElementById("btnMute"),
    toggleEasy: document.getElementById("toggleEasy"),

    srLive: document.getElementById("srLive"),
  };

  if (isTouchLike) {
    el.mobileBlock.hidden = false;
    el.hint.textContent = "Mobile/touch tidak didukung. Buka di PC/laptop dengan keyboard.";
    return;
  }

  // =========================
  // Level 1 — Fixed pool (QWEASD + Space), length 7
  // =========================
  const POOL = ["Q", "W", "E", "A", "S", "D", " "];
  const SEQ_LEN = 7;

  // =========================
  // Timer (per round)
  // =========================
  const TIME_LIMIT_HARD_SEC = 4;
  const TIME_LIMIT_EASY_SEC = 6;

  // =========================
  // Audio (mute toggle)
  // =========================
  let muted = localStorage.getItem("muted") === "1";
  el.btnMute.setAttribute("aria-pressed", String(muted));
  el.btnMute.textContent = muted ? "Unmute" : "Mute";

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ac = AudioCtx ? new AudioCtx() : null;

  function beep(freq, ms, gain = 0.04) {
    if (muted || !ac) return;
    try {
      if (ac.state === "suspended") ac.resume().catch(() => {});
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g);
      g.connect(ac.destination);
      o.start();
      setTimeout(() => o.stop(), ms);
    } catch {}
  }

  // =========================
  // Game state
  // =========================
  let round = 1;

  let target = ""; // string of length SEQ_LEN
  let idx = 0;

  // Score
  let startAtMs = null;
  let correctKeys = 0;

  // Timer (per round)
  let roundStartMs = null;
  let timeLimitSec = TIME_LIMIT_HARD_SEC;

  // UI state
  let lastBadFlashAt = 0;

  function getNow() {
    return Date.now();
  }

  function generateSequence() {
    const out = [];
    for (let i = 0; i < SEQ_LEN; i++) {
      let c = POOL[Math.floor(Math.random() * POOL.length)];
      // hindari spasi dobel berurutan biar natural
      if (c === " " && out[i - 1] === " ") {
        c = POOL[Math.floor(Math.random() * POOL.length)];
      }
      out.push(c);
    }
    return out.join("");
  }

  function resetRound() {
    target = generateSequence();
    idx = 0;
    roundStartMs = null;
    lastBadFlashAt = 0;
    renderBoard();
    renderHud();
  }

  function resetAll() {
    round = 1;

    startAtMs = null;
    correctKeys = 0;

    timeLimitSec = el.toggleEasy.checked ? TIME_LIMIT_EASY_SEC : TIME_LIMIT_HARD_SEC;

    resetRound();
  }

  function elapsedMsForKpm(now) {
    if (!startAtMs) return 0;
    return now - startAtMs;
  }

  function calcKpm(now) {
    if (!startAtMs) return 0;
    const minutes = Math.max(elapsedMsForKpm(now) / 60000, 1 / 60);
    return Math.round(correctKeys / minutes);
  }

  function remainingMs(now) {
    if (!roundStartMs) return timeLimitSec * 1000;
    const spent = now - roundStartMs;
    return Math.max(0, timeLimitSec * 1000 - spent);
  }

  function isTimeUp(now) {
    return remainingMs(now) <= 0;
  }

  function winRound(now) {
    beep(880, 110, 0.05);
    round += 1;
    resetRound();
  }

  function failRound(now) {
    beep(220, 140, 0.05);
    // ulang round (skor tetap)
    resetRound();
  }

  // =========================
  // Render
  // =========================
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderBoard() {
    const now = getNow();
    const badFlash = now - lastBadFlashAt < 180;

    const tiles = [];
    for (let i = 0; i < target.length; i++) {
      const ch = target[i];
      const cls = ["tile"];
      const isSpace = ch === " ";

      if (isSpace) cls.push("space");
      if (i < idx) cls.push("done", "ok");
      if (i === idx) cls.push("current");
      if (badFlash && i === idx) cls.push("badFlash");

      // Spacebar icon
      const display = isSpace
        ? `<span class="spaceIcon" aria-hidden="true">⎵</span><span class="srOnly">Space</span>`
        : escapeHtml(ch);

      tiles.push(`<div class="${cls.join(" ")}" aria-hidden="false">${display}</div>`);
    }
    el.board.innerHTML = tiles.join("");
  }

  function renderHud() {
    const now = getNow();

    const rem = remainingMs(now);
    const remSec = (rem / 1000).toFixed(1);
    el.timerText.textContent = `${remSec}s`;

    el.kpmText.textContent = String(calcKpm(now));
    el.okText.textContent = String(correctKeys);
    el.roundText.textContent = String(round);

    el.srLive.textContent =
      `Round ${round}. Time ${remSec} detik. KPM ${calcKpm(now)}. Benar ${correctKeys}.`;
  }

  // =========================
  // Input
  // =========================
  function onKeyDown(e) {
    const now = getNow();

    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }

    // Start KPM timer on first valid key
    if (startAtMs === null) startAtMs = now;
    // Start round timer on first valid key in this round
    if (roundStartMs === null) roundStartMs = now;

    if (isTimeUp(now)) {
      failRound(now);
      return;
    }

    // Only accept single char keys (including space)
    if (!e.key || e.key.length !== 1) return;

    const pressed = e.key.toUpperCase();
    const expected = (target[idx] || "").toUpperCase();

    if (!expected) return;

    if (pressed === expected) {
      correctKeys += 1;
      idx += 1;
      beep(520, 35, 0.035);

      if (idx >= target.length) {
        winRound(now);
      }
    } else {
      lastBadFlashAt = now;
      beep(160, 70, 0.04);
    }

    renderBoard();
    renderHud();
  }

  // =========================
  // Loop
  // =========================
  function tick() {
    const now = getNow();

    if (roundStartMs !== null && isTimeUp(now)) {
      failRound(now);
    }

    renderHud();
    requestAnimationFrame(tick);
  }

  // =========================
  // UI events
  // =========================
  el.btnNew.addEventListener("click", () => {
    round += 1;
    resetRound();
  });

  el.btnReset.addEventListener("click", () => {
    resetAll();
  });

  el.toggleEasy.addEventListener("change", () => {
    timeLimitSec = el.toggleEasy.checked ? TIME_LIMIT_EASY_SEC : TIME_LIMIT_HARD_SEC;
    resetRound();
  });

  el.btnMute.addEventListener("click", () => {
    muted = !muted;
    localStorage.setItem("muted", muted ? "1" : "0");
    el.btnMute.setAttribute("aria-pressed", String(muted));
    el.btnMute.textContent = muted ? "Unmute" : "Mute";
  });

  el.main.addEventListener("pointerdown", () => {
    el.main.focus({ preventScroll: true });
  });

  window.addEventListener("keydown", onKeyDown);

  // =========================
  // Init
  // =========================
  resetAll();
  requestAnimationFrame(tick);
})();
