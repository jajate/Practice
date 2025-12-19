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

    seqText: document.getElementById("seqText"),
    timeText: document.getElementById("timeText"),
    kpmText: document.getElementById("kpmText"),
    failText: document.getElementById("failText"),
    roundText: document.getElementById("roundText"),

    avgKpm: document.getElementById("avgKpm"),
    avgTime: document.getElementById("avgTime"),
    avgFailRate: document.getElementById("avgFailRate"),
    historyBody: document.getElementById("historyBody"),

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

  // TIME limit mirip vibe Vykas (Hard 4s, Easy 6s)
  const TIME_LIMIT_HARD_MS = 4000;
  const TIME_LIMIT_EASY_MS = 6000;

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
  // State
  // =========================
  let round = 1;
  let target = ""; // length SEQ_LEN
  let idx = 0;

  // per-sequence stats (reset every new sequence)
  let seqStartMs = 0; // TIME mulai saat sequence muncul
  let failCount = 0;

  // history (max 10, newest on top)
  /** @type {{round:number, kpm:number, timeMs:number, fail:number}[]} */
  let history = [];

  function nowMs() {
    return Date.now();
  }

  function currentLimitMs() {
    return el.toggleEasy.checked ? TIME_LIMIT_EASY_MS : TIME_LIMIT_HARD_MS;
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

  function formatSeqForHud(seq) {
    // tampil ringkas: Q W E A ⎵ S D
    return seq
      .split("")
      .map((c) => (c === " " ? "⎵" : c))
      .join(" ");
  }

  function calcElapsedMs(t) {
    return Math.max(0, t - seqStartMs);
  }

  function calcKpm(correct, elapsedMs) {
    const minutes = Math.max(elapsedMs / 60000, 1 / 60);
    return Math.round(correct / minutes);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderBoard() {
    const t = nowMs();
    const badFlash = false; // simple: no global flash state here

    const tiles = [];
    for (let i = 0; i < target.length; i++) {
      const ch = target[i];
      const cls = ["tile"];
      const isSpace = ch === " ";

      if (i < idx) cls.push("done", "ok");
      if (i === idx) cls.push("current");
      if (badFlash && i === idx) cls.push("badFlash");

      const display = isSpace
        ? `<span class="spaceIcon" aria-hidden="true">⎵</span><span class="srOnly">Space</span>`
        : escapeHtml(ch);

      tiles.push(`<div class="${cls.join(" ")}">${display}</div>`);
    }
    el.board.innerHTML = tiles.join("");
  }

  function renderHud() {
    const t = nowMs();
    const elapsed = calcElapsedMs(t);
    const limit = currentLimitMs();

    // TIME: elapsed sejak sequence muncul
    el.timeText.textContent = `${(elapsed / 1000).toFixed(2)}s`;

    // KPM: per-sequence (berdasarkan idx benar saat ini)
    el.kpmText.textContent = String(calcKpm(idx, elapsed));

    // FAIL: per-sequence
    el.failText.textContent = String(failCount);

    el.roundText.textContent = String(round);
    el.seqText.textContent = formatSeqForHud(target);

    // SR live
    el.srLive.textContent =
      `Round ${round}. Time ${(elapsed / 1000).toFixed(2)} detik dari limit ${(limit / 1000).toFixed(0)}. ` +
      `KPM ${calcKpm(idx, elapsed)}. Fail ${failCount}.`;
  }

  function renderScores() {
    const items = history.slice(0, 10);
    const n = items.length;

    if (n === 0) {
      el.avgKpm.textContent = "0";
      el.avgTime.textContent = "0.00s";
      el.avgFailRate.textContent = "0.0%";
      el.historyBody.innerHTML = "";
      return;
    }

    const sumKpm = items.reduce((a, r) => a + r.kpm, 0);
    const sumTime = items.reduce((a, r) => a + r.timeMs, 0);
    const sumFail = items.reduce((a, r) => a + r.fail, 0);

    const avgKpm = Math.round(sumKpm / n);
    const avgTimeMs = sumTime / n;

    // fail rate%: totalFail / (SEQ_LEN * rounds) * 100
    const failRate = (sumFail / (SEQ_LEN * n)) * 100;

    el.avgKpm.textContent = String(avgKpm);
    el.avgTime.textContent = `${(avgTimeMs / 1000).toFixed(2)}s`;
    el.avgFailRate.textContent = `${failRate.toFixed(1)}%`;

    // History newest on top
    el.historyBody.innerHTML = items
      .map((r) => {
        const perRoundFailRate = (r.fail / SEQ_LEN) * 100;
        return `
          <tr>
            <td>#${r.round}</td>
            <td class="num">${r.kpm}</td>
            <td class="num">${(r.timeMs / 1000).toFixed(2)}s</td>
            <td class="num">${r.fail} (${perRoundFailRate.toFixed(1)}%)</td>
          </tr>
        `;
      })
      .join("");
  }

  function resetSequence() {
    target = generateSequence();
    idx = 0;
    failCount = 0;
    seqStartMs = nowMs(); // TIME mulai saat sequence muncul

    renderBoard();
    renderHud();
  }

  function finishSequence(reason) {
    const t = nowMs();
    const elapsed = calcElapsedMs(t);
    const limit = currentLimitMs();

    // TIME yang dicatat: elapsed, tapi di-cap ke limit biar konsisten jika timeout
    const timeMs = Math.min(elapsed, limit);

    const correct = idx; // jumlah benar di sequence ini (biasanya 7 saat sukses)
    const kpm = calcKpm(correct, Math.max(timeMs, 1));

    // kalau timeout, tambahin 1 fail biar keliatan "gagal round"
    const finalFail = reason === "timeout" ? failCount + 1 : failCount;

    history.unshift({ round, kpm, timeMs, fail: finalFail });
    history = history.slice(0, 10);

    round += 1;

    renderScores();
    resetSequence();
  }

  // =========================
  // Input
  // =========================
  function onKeyDown(e) {
    // prevent scroll for space
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }

    if (!e.key || e.key.length !== 1) return;

    const pressed = e.key.toUpperCase();
    const expected = (target[idx] || "").toUpperCase();
    if (!expected) return;

    if (pressed === expected) {
      idx += 1;
      beep(520, 35, 0.035);
      if (idx >= target.length) {
        // success
        finishSequence("success");
        return;
      }
    } else {
      failCount += 1;
      beep(160, 70, 0.04);
    }

    renderBoard();
    renderHud();
  }

  // =========================
  // Loop (TIME limit)
  // =========================
  function tick() {
    const t = nowMs();
    const elapsed = calcElapsedMs(t);

    if (elapsed >= currentLimitMs()) {
      // timeout (sequence belum selesai)
      if (idx < target.length) {
        finishSequence("timeout");
        requestAnimationFrame(tick);
        return;
      }
    }

    renderHud();
    requestAnimationFrame(tick);
  }

  // =========================
  // UI events
  // =========================
  el.toggleEasy.addEventListener("change", () => {
    // reset sequence supaya limit baru terasa langsung
    resetSequence();
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
  renderScores();
  resetSequence();
  requestAnimationFrame(tick);
})();
