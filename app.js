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
    mobileBlock: document.getElementById("mobileBlock"),

    timeText: document.getElementById("timeText"),
    kpmText: document.getElementById("kpmText"),
    failText: document.getElementById("failText"),
    roundText: document.getElementById("roundText"),

    avgKpm: document.getElementById("avgKpm"),
    avgTime: document.getElementById("avgTime"),
    avgFailRate: document.getElementById("avgFailRate"),
    historyBody: document.getElementById("historyBody"),

    btnMute: document.getElementById("btnMute"),
    modeBtns: Array.from(document.querySelectorAll(".modeBtn")),

    boardMessage: document.getElementById("boardMessage"),
    boardMessageTitle: document.getElementById("boardMessageTitle"),
    boardMessageSub: document.getElementById("boardMessageSub"),
    btnStart: document.getElementById("btnStart"),
    btnPlayAgain: document.getElementById("btnPlayAgain"),

    srLive: document.getElementById("srLive"),
  };

  if (isTouchLike) {
    el.mobileBlock.hidden = false;
    return;
  }

  // =========================
  // Level 1 — Fixed pool (QWEASD + Space), length 7
  // =========================
  const POOL = ["Q", "W", "E", "A", "S", "D", " "];
  const SEQ_LEN = 7;

  const LIMIT_MS = {
    EASY: Infinity,
    MEDIUM: 4000,
    HARD: 3000,
  };

  const SESSION_ROUNDS = 10;

  // countdown: Get Ready 1.5s (2→1), GO 0.5s
  const READY_MS = 1500;
  const GO_MS = 500;

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
  // State machine
  // =========================
  /** @type {'EASY'|'MEDIUM'|'HARD'} */
  let mode = (localStorage.getItem("mode") || "EASY").toUpperCase();
  if (!['EASY','MEDIUM','HARD'].includes(mode)) mode = 'EASY';

  /** @type {'IDLE'|'COUNTDOWN'|'PLAYING'|'FINISHED'} */
  let state = 'IDLE';

  // current sequence
  let target = "";
  let idx = 0;
  let failCount = 0;
  let seqStartMs = 0; // TIME mulai saat sequence muncul

  // rounds
  let round = 1; // 1-based

  // histories
  /** @type {{round:number, mode:'EASY'|'MEDIUM'|'HARD', kpm:number, timeMs:number, fail:number, status:'BAD'|'GOOD'|'PERFECT'}[]} */
  let easyHistory = [];
  /** @type {{round:number, mode:'EASY'|'MEDIUM'|'HARD', kpm:number, timeMs:number, fail:number, status:'BAD'|'GOOD'|'PERFECT'}[]} */
  let sessionHistory = [];

  // session points (MEDIUM/HARD)
  let sessionPoints = 0;

  function nowMs() { return Date.now(); }
  function limitMs() { return LIMIT_MS[mode]; }

  function generateSequence() {
    const out = [];
    for (let i = 0; i < SEQ_LEN; i++) {
      let c = POOL[Math.floor(Math.random() * POOL.length)];
      if (c === " " && out[i - 1] === " ") {
        c = POOL[Math.floor(Math.random() * POOL.length)];
      }
      out.push(c);
    }
    return out.join("");
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
    const tiles = [];
    for (let i = 0; i < target.length; i++) {
      const ch = target[i];
      const cls = ["tile"];
      const isSpace = ch === " ";

      if (i < idx) cls.push("done", "ok");
      if (i === idx) cls.push("current");

      const display = isSpace
        ? `<span class="spaceIcon" aria-hidden="true">⎵</span><span class="srOnly">Space</span>`
        : escapeHtml(ch);

      tiles.push(`<div class="${cls.join(" ")}">${display}</div>`);
    }
    el.board.innerHTML = tiles.join("");
  }

  function elapsedMs() {
    return Math.max(0, nowMs() - seqStartMs);
  }

  function calcKpm(correct, ms) {
    const minutes = Math.max(ms / 60000, 1 / 60);
    return Math.round(correct / minutes);
  }

  function renderHud() {
    const ms = elapsedMs();
    el.timeText.textContent = `${(ms / 1000).toFixed(2)}s`;
    el.kpmText.textContent = String(calcKpm(idx, ms));
    el.failText.textContent = String(failCount);

    if (mode === 'EASY') {
      el.roundText.textContent = `${round}/∞`;
    } else {
      el.roundText.textContent = `${round}/${SESSION_ROUNDS}`;
    }

    el.srLive.textContent =
      `Mode ${mode}. Round ${el.roundText.textContent}. Time ${(ms/1000).toFixed(2)}. KPM ${calcKpm(idx, ms)}. Fail ${failCount}.`;
  }

  function activeHistory() {
    return mode === 'EASY' ? easyHistory : sessionHistory;
  }

  function renderScores() {
    const items = activeHistory().slice(0, 10);
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

    el.historyBody.innerHTML = items
      .map((r) => {
        return `
          <tr>
            <td>#${r.round}</td>
            <td>${r.mode}</td>
            <td class="num">${r.kpm}</td>
            <td class="num">${(r.timeMs / 1000).toFixed(2)}s</td>
            <td class="num">${r.fail}</td>
            <td>${r.status}</td>
          </tr>
        `;
      })
      .join("");
  }

  function setBoardMessage({ title, sub = "", showStart = false, showPlayAgain = false }) {
    el.boardMessageTitle.textContent = title;
    el.boardMessageSub.textContent = sub;
    el.btnStart.hidden = !showStart;
    el.btnPlayAgain.hidden = !showPlayAgain;
    el.boardMessage.hidden = false;
  }

  function hideBoardMessage() {
    el.boardMessage.hidden = true;
  }

  function pointsForStatus(status) {
    if (status === 'PERFECT') return 1;
    if (status === 'GOOD') return 0.5;
    return 0;
  }

  function statusForRound({ timeSec, fail, timeout }) {
    if (timeout) return 'BAD';

    if (mode === 'EASY') {
      if (timeSec < 4 && fail === 0) return 'PERFECT';
      if (timeSec >= 10 || fail >= 4) return 'BAD';
      return 'GOOD';
    }

    if (mode === 'MEDIUM') {
      if (timeSec < 3 && fail === 0) return 'PERFECT';
      if (fail >= 3) return 'BAD';
      return 'GOOD';
    }

    // HARD
    if (timeSec < 1.5 && fail === 0) return 'PERFECT';
    if (fail >= 1) return 'BAD';
    return 'GOOD';
  }

  function resetSequence() {
    target = generateSequence();
    idx = 0;
    failCount = 0;
    seqStartMs = nowMs(); // TIME mulai saat sequence muncul
    renderBoard();
    renderHud();
  }

  async function countdownThenStart() {
    state = 'COUNTDOWN';

    setBoardMessage({ title: 'Get Ready!', sub: '2', showStart: false, showPlayAgain: false });
    await sleep(READY_MS / 2);
    // "2" -> "1"
    setBoardMessage({ title: 'Get Ready!', sub: '1', showStart: false, showPlayAgain: false });
    await sleep(READY_MS / 2);

    setBoardMessage({ title: 'GO!!!', sub: '', showStart: false, showPlayAgain: false });
    beep(880, 120, 0.05);
    await sleep(GO_MS);

    hideBoardMessage();
    state = 'PLAYING';
    resetSequence();
  }

  function finishSession() {
    state = 'FINISHED';
    // tampilkan skor 0-10
    setBoardMessage({
      title: `Session Complete`,
      sub: `Score: ${sessionPoints.toFixed(1)} / ${SESSION_ROUNDS}`,
      showStart: false,
      showPlayAgain: true,
    });
  }

  function recordRound({ timeout }) {
    const lim = limitMs();
    const ms = timeout && Number.isFinite(lim) ? lim : elapsedMs();
    const timeMs = Number.isFinite(ms) ? ms : elapsedMs();
    const timeSec = timeMs / 1000;

    const correct = idx;
    const kpm = calcKpm(correct, Math.max(1, timeMs));

    const status = statusForRound({ timeSec, fail: failCount, timeout });

    const rec = {
      round,
      mode,
      kpm,
      timeMs,
      fail: failCount,
      status,
    };

    if (mode === 'EASY') {
      easyHistory.unshift(rec);
      easyHistory = easyHistory.slice(0, 10);
    } else {
      sessionHistory.unshift(rec);
      sessionHistory = sessionHistory.slice(0, 10);
      sessionPoints += pointsForStatus(status);
    }

    renderScores();
  }

  function advanceRoundAfterFinish() {
    if (mode === 'EASY') {
      round += 1;
      resetSequence();
      return;
    }

    if (round >= SESSION_ROUNDS) {
      finishSession();
      return;
    }

    round += 1;
    resetSequence();
  }

  function onSuccess() {
    recordRound({ timeout: false });
    advanceRoundAfterFinish();
  }

  function onTimeout() {
    // time dicap ke limit & status BAD
    recordRound({ timeout: true });
    advanceRoundAfterFinish();
  }

  function canAcceptInput() {
    return state === 'PLAYING';
  }

  function onKeyDown(e) {
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }

    if (!canAcceptInput()) return;

    if (!e.key || e.key.length !== 1) return;

    const pressed = e.key.toUpperCase();
    const expected = (target[idx] || "").toUpperCase();
    if (!expected) return;

    if (pressed === expected) {
      idx += 1;
      beep(520, 35, 0.035);

      if (idx >= target.length) {
        onSuccess();
        return;
      }
    } else {
      failCount += 1;
      beep(160, 70, 0.04);
    }

    renderBoard();
    renderHud();
  }

  function tick() {
    if (state === 'PLAYING') {
      const lim = limitMs();
      if (Number.isFinite(lim) && elapsedMs() >= lim) {
        onTimeout();
      } else {
        renderHud();
      }
    }
    requestAnimationFrame(tick);
  }

  function updateModeButtons() {
    // tampilkan hanya 2 mode lain
    el.modeBtns.forEach((b) => {
      const m = String(b.dataset.mode || '').toUpperCase();
      b.hidden = (m === mode);
    });
  }

  function hardResetForMode(newMode) {
    mode = newMode;
    localStorage.setItem('mode', mode);

    // reset state
    round = 1;
    idx = 0;
    failCount = 0;

    sessionHistory = [];
    sessionPoints = 0;

    updateModeButtons();
    renderScores();

    if (mode === 'EASY') {
      state = 'PLAYING';
      hideBoardMessage();
      resetSequence();
    } else {
      state = 'IDLE';
      el.board.innerHTML = '';
      setBoardMessage({ title: 'Ready?', sub: `${mode} • ${SESSION_ROUNDS} rounds`, showStart: true, showPlayAgain: false });
      renderHud();
    }
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // =========================
  // UI events
  // =========================
  el.modeBtns.forEach((b) => {
    b.addEventListener('click', () => {
      const m = String(b.dataset.mode || '').toUpperCase();
      if (!['EASY','MEDIUM','HARD'].includes(m)) return;
      hardResetForMode(m);
    });
  });

  el.btnMute.addEventListener("click", () => {
    muted = !muted;
    localStorage.setItem("muted", muted ? "1" : "0");
    el.btnMute.setAttribute("aria-pressed", String(muted));
    el.btnMute.textContent = muted ? "Unmute" : "Mute";
  });

  el.btnStart.addEventListener('click', () => {
    if (state !== 'IDLE') return;
    countdownThenStart();
  });

  el.btnPlayAgain.addEventListener('click', () => {
    if (state !== 'FINISHED') return;
    // langsung countdown (tanpa start)
    round = 1;
    sessionHistory = [];
    sessionPoints = 0;
    renderScores();
    countdownThenStart();
  });

  el.main.addEventListener("pointerdown", () => {
    el.main.focus({ preventScroll: true });
  });

  window.addEventListener("keydown", onKeyDown);

  // =========================
  // Init
  // =========================
  updateModeButtons();
  renderScores();
  hardResetForMode(mode);
  requestAnimationFrame(tick);
})();
