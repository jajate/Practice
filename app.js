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
    status: document.getElementById("status"),
    hint: document.getElementById("hint"),
    overlay: document.getElementById("overlay"),
    penaltyCountdown: document.getElementById("penaltyCountdown"),
    mobileBlock: document.getElementById("mobileBlock"),

    timerText: document.getElementById("timerText"),
    kpmText: document.getElementById("kpmText"),
    okText: document.getElementById("okText"),
    penText: document.getElementById("penText"),
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
  // Config (Vykas-ish)
  // =========================
  const PENALTY_FREEZE_MS = 3000;

  const TIME_LIMIT_HARD_SEC = 4;
  const TIME_LIMIT_EASY_SEC = 6;

  // "Vykas-like" sequences (boleh kamu ganti agar lebih sesuai)
  const SEQUENCES = [
    "ASDFJKL",
    "QWERASDF",
    "ASDJKLQW",
    "DFJKASL",
    "QWEASDJKL",
    "ASDFQWER",
    "JKLASDF",
    "QWERJKLASD",
    "ASDFJKLQWE",
    "QWASDJKL",
  ];

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

  let target = "";
  let idx = 0;

  // Score
  let startAtMs = null;
  let correctKeys = 0;
  let penaltyMs = 0;

  // Timer (per round)
  let roundStartMs = null;
  let timeLimitSec = TIME_LIMIT_HARD_SEC;

  // Penalty freeze
  let penaltyUntilMs = 0;

  // UI state
  let lastBadFlashAt = 0;

  function pickSequence() {
    return SEQUENCES[Math.floor(Math.random() * SEQUENCES.length)];
  }

  function setStatus(msg) {
    el.status.textContent = msg;
  }

  function getNow() {
    return Date.now();
  }

  function isPenaltyActive(now) {
    return now < penaltyUntilMs;
  }

  // FIX: overlay dikontrol hanya lewat .hidden
  function showOverlay(show) {
    el.overlay.hidden = !show;
  }

  function applyPenalty(now) {
    penaltyUntilMs = now + PENALTY_FREEZE_MS;
    penaltyMs += PENALTY_FREEZE_MS;
    lastBadFlashAt = now;
    setStatus("Salah! Penalti 3 detik…");
    showOverlay(true);
    beep(160, 90, 0.045);
  }

  function resetRound() {
    target = pickSequence();
    idx = 0;
    roundStartMs = null;
    penaltyUntilMs = 0;
    lastBadFlashAt = 0;
    showOverlay(false);
    setStatus("Ready. Klik area game lalu ketik untuk mulai.");
    renderBoard();
    renderHud();
  }

  function resetAll() {
    round = 1;

    startAtMs = null;
    correctKeys = 0;
    penaltyMs = 0;

    timeLimitSec = el.toggleEasy.checked ? TIME_LIMIT_EASY_SEC : TIME_LIMIT_HARD_SEC;

    resetRound();
  }

  function elapsedMsForKpm(now) {
    if (!startAtMs) return 0;
    return (now - startAtMs) + penaltyMs;
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
    setStatus("Nice! Lanjut round berikutnya.");
    round += 1;
    resetRound();
  }

  function failRound(now) {
    beep(220, 140, 0.05);
    setStatus("Waktu habis. Ulang round (skor tetap).");
    resetRound();
  }

  // =========================
  // Render
  // =========================
  function renderBoard() {
    const now = getNow();
    const badFlash = now - lastBadFlashAt < 180;

    const tiles = [];
    for (let i = 0; i < target.length; i++) {
      const ch = target[i];
      const cls = ["tile"];
      if (i < idx) cls.push("done", "ok");
      if (i === idx) cls.push("current");
      if (badFlash && i === idx) cls.push("badFlash");

      tiles.push(`<div class="${cls.join(" ")}" aria-hidden="true">${escapeHtml(ch)}</div>`);
    }
    el.board.innerHTML = tiles.join("");
  }

  function renderHud() {
    const now = getNow();

    // Timer
    const rem = remainingMs(now);
    const remSec = (rem / 1000).toFixed(1);
    el.timerText.textContent = `${remSec}s`;

    // Score
    el.kpmText.textContent = String(calcKpm(now));
    el.okText.textContent = String(correctKeys);
    el.penText.textContent = `${Math.floor(penaltyMs / 1000)}s`;
    el.roundText.textContent = String(round);

    // Overlay countdown
    if (isPenaltyActive(now)) {
      const left = Math.max(0, Math.ceil((penaltyUntilMs - now) / 1000));
      el.penaltyCountdown.textContent = String(left);
      showOverlay(true);
    } else {
      // FIX: pastikan overlay dimatikan ketika penalty selesai
      showOverlay(false);
    }

    // SR live text
    el.srLive.textContent =
      `Round ${round}. Time ${remSec} detik. KPM ${calcKpm(now)}. ` +
      `Benar ${correctKeys}. Penalti ${Math.floor(penaltyMs / 1000)} detik.`;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // =========================
  // Input
  // =========================
  function onKeyDown(e) {
    const now = getNow();

    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }

    if (startAtMs === null) startAtMs = now;
    if (roundStartMs === null) roundStartMs = now;

    if (isTimeUp(now)) {
      failRound(now);
      return;
    }

    if (isPenaltyActive(now)) {
      return;
    }

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
      applyPenalty(now);
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
    setStatus(`Mode: ${el.toggleEasy.checked ? "Easy" : "Hard"} (${timeLimitSec}s).`);
    resetRound();
  });

  el.btnMute.addEventListener("click", () => {
    muted = !muted;
    localStorage.setItem("muted", muted ? "1" : "0");
    el.btnMute.setAttribute("aria-pressed", String(muted));
    el.btnMute.textContent = muted ? "Unmute" : "Mute";
    setStatus(muted ? "Muted." : "Unmuted.");
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
