(() => {
  // Debug marker: ini harus muncul di DevTools Console kalau file terbaru kebaca
  console.info("[JAJATE] app.js loaded", new Date().toISOString());

  // =========================
  // Mobile gate (lebih aman)
  // =========================
  // NOTE: banyak laptop punya touchscreen → jangan pakai (pointer:coarse) buat nge-block.
  // Kita block hanya device yang benar-benar mobile/tablet.
  const ua = navigator.userAgent || "";
  const uaMobile = /Android|iPhone|iPod/i.test(ua) || (/iPad/i.test(ua) && (navigator.maxTouchPoints || 0) > 1);

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
    btnEditKey: document.getElementById("btnEditKey"),
    modeBtns: Array.from(document.querySelectorAll(".modeBtn")),

    boardMessage: document.getElementById("boardMessage"),
    boardMessageTitle: document.getElementById("boardMessageTitle"),
    boardMessageSub: document.getElementById("boardMessageSub"),
    btnStart: document.getElementById("btnStart"),
    btnPlayAgain: document.getElementById("btnPlayAgain"),

    srLive: document.getElementById("srLive"),

    // modal
    keyModal: document.getElementById("keyModal"),
    kbdRows: document.getElementById("kbdRows"),
    tabBasic: document.getElementById("tabBasic"),
    tabAddon: document.getElementById("tabAddon"),
    btnKeyClose: document.getElementById("btnKeyClose"),
    btnKeyReset: document.getElementById("btnKeyReset"),
    btnKeyCancel: document.getElementById("btnKeyCancel"),
    btnKeySave: document.getElementById("btnKeySave"),
    keyModalError: document.getElementById("keyModalError"),
    selBasic: document.getElementById("selBasic"),
    selAddon: document.getElementById("selAddon"),
    inpSeqLen: document.getElementById("inpSeqLen"),
    inpBasicCount: document.getElementById("inpBasicCount"),
    inpAddonCount: document.getElementById("inpAddonCount"),
    btnDupToggle: document.getElementById("btnDupToggle"),
  };

  if (uaMobile) {
    el.mobileBlock.hidden = false;
    // stop: user memang nggak mau mobile.
    return;
  } else {
    el.mobileBlock.hidden = true;
  }

  // =========================
  // Key registry
  // =========================
  /** @typedef {{id:string,label:string,icon?:string,kind:'char'|'special', match:(e:KeyboardEvent)=>boolean, displayHtml:()=>string, displayText:()=>string}} KeyDef */

  const SPECIAL = {
    SPACE: {
      id: "SPACE",
      label: "SPACE",
      icon: "⎵",
      kind: "special",
      match: (e) => e.key === " ",
      displayHtml: () => `<span class="spaceIcon" aria-hidden="true">⎵</span><span class="srOnly">Space</span>`,
      displayText: () => " ",
    },
    ENTER: {
      id: "ENTER",
      label: "ENTER",
      icon: "⏎",
      kind: "special",
      match: (e) => e.key === "Enter",
      displayHtml: () => `<span class="keyIcon" aria-hidden="true">⏎</span><span class="srOnly">Enter</span>`,
      displayText: () => "ENTER",
    },
    SHIFT: {
      id: "SHIFT",
      label: "SHIFT",
      icon: "⇧",
      kind: "special",
      match: (e) => e.key === "Shift",
      displayHtml: () => `<span class="keyIcon" aria-hidden="true">SHIFT</span><span class="srOnly">Shift</span>`,
      displayText: () => "SHIFT",
    },
    CTRL: {
      id: "CTRL",
      label: "CTRL",
      icon: "⌃",
      kind: "special",
      match: (e) => e.key === "Control",
      displayHtml: () => `<span class="keyIcon" aria-hidden="true">CTRL</span><span class="srOnly">Control</span>`,
      displayText: () => "CTRL",
    },
    ALT: {
      id: "ALT",
      label: "ALT",
      icon: "ALT",
      kind: "special",
      match: (e) => e.key === "Alt",
      displayHtml: () => `<span class="keyIcon" aria-hidden="true">ALT</span><span class="srOnly">Alt</span>`,
      displayText: () => "ALT",
    },
    CAPSLOCK: {
      id: "CAPSLOCK",
      label: "CAPS",
      icon: "⇪",
      kind: "special",
      match: (e) => e.key === "CapsLock",
      displayHtml: () => `<span class="keyIcon" aria-hidden="true">CAPS</span><span class="srOnly">CapsLock</span>`,
      displayText: () => "CAPS",
    },
    ESC: {
      id: "ESC",
      label: "ESC",
      icon: "ESC",
      kind: "special",
      match: (e) => e.key === "Escape",
      displayHtml: () => `<span class="keyIcon" aria-hidden="true">ESC</span><span class="srOnly">Escape</span>`,
      displayText: () => "ESC",
    },
  };

  /** @type {Record<string, KeyDef>} */
  const KEYMAP = {};

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function addCharKey(ch) {
    const isLetter = /^[a-zA-Z]$/.test(ch);
    const id = isLetter ? ch.toUpperCase() : ch;
    KEYMAP[id] = {
      id,
      label: isLetter ? ch.toUpperCase() : ch,
      kind: "char",
      match: (e) => {
        if (!e.key || e.key.length !== 1) return false;
        const k = e.key;
        if (/^[a-zA-Z]$/.test(k)) return k.toUpperCase() === id;
        return k === id;
      },
      displayHtml: () => escapeHtml(isLetter ? ch.toUpperCase() : ch),
      displayText: () => (isLetter ? ch.toUpperCase() : ch),
    };
  }

  for (let c = 65; c <= 90; c++) addCharKey(String.fromCharCode(c));
  for (let c = 48; c <= 57; c++) addCharKey(String.fromCharCode(c));
  ["`", "-", "=", "[", "]", ";", "'", ",", ".", "/", "\\"].forEach(addCharKey);
  Object.values(SPECIAL).forEach((k) => (KEYMAP[k.id] = k));

  function keyLabel(id) {
    const k = KEYMAP[id];
    if (!k) return id;
    return k.displayText();
  }

  // =========================
  // Config (2 groups)
  // =========================
  const CFG_KEY = "jajate_keycfg_v2";

  const DEFAULT_CFG = {
    seqLen: 7,
    basicCount: 5,
    addonCount: 2,
    allowDup: true,
    basicSelected: ["Q", "W", "E", "A", "S", "D"],
    addonSelected: ["SPACE"],
  };

  let keyCfg = loadCfg();

  function loadCfg() {
    try {
      const raw = localStorage.getItem(CFG_KEY);
      if (!raw) return { ...DEFAULT_CFG };
      const p = JSON.parse(raw);
      return {
        ...DEFAULT_CFG,
        ...p,
        basicSelected: Array.isArray(p.basicSelected) ? p.basicSelected : DEFAULT_CFG.basicSelected,
        addonSelected: Array.isArray(p.addonSelected) ? p.addonSelected : DEFAULT_CFG.addonSelected,
      };
    } catch {
      return { ...DEFAULT_CFG };
    }
  }

  function saveCfg(cfg) {
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  }

  // =========================
  // Mode rules
  // =========================
  const LIMIT_MS = {
    EASY: Infinity,
    MEDIUM: 4000,
    HARD: 3000,
  };
  const SESSION_ROUNDS = 10;
  const READY_MS = 1500;
  const GO_MS = 500;

  // =========================
  // Audio (mute)
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
  let mode = (localStorage.getItem("mode") || "EASY").toUpperCase();
  if (!["EASY", "MEDIUM", "HARD"].includes(mode)) mode = "EASY";

  /** @type {'IDLE'|'COUNTDOWN'|'PLAYING'|'FINISHED'} */
  let state = "IDLE";

  /** @type {string[]} */
  let target = [];
  let idx = 0;
  let failCount = 0;
  let seqStartMs = 0;

  /** @type {{id:string, ok:boolean}[]} */
  let inputTokens = [];

  let wrongFlashActive = false;
  let round = 1;

  /** @type {{round:number, mode:'EASY'|'MEDIUM'|'HARD', kpm:number, timeMs:number, fail:number, status:'BAD'|'GOOD'|'PERFECT', inputTokens:{id:string,ok:boolean}[]}[]} */
  let easyHistory = [];

  /** @type {{round:number, mode:'EASY'|'MEDIUM'|'HARD', kpm:number, timeMs:number, fail:number, status:'BAD'|'GOOD'|'PERFECT', inputTokens:{id:string,ok:boolean}[]}[]} */
  let sessionHistory = [];

  let sessionPoints = 0;

  function nowMs() { return Date.now(); }
  function limitMs() { return LIMIT_MS[mode]; }
  function elapsedMs() { return Math.max(0, nowMs() - seqStartMs); }

  function calcKpm(correct, ms) {
    const minutes = Math.max(ms / 60000, 1 / 60);
    return Math.round(correct / minutes);
  }

  function activeHistory() {
    return mode === "EASY" ? easyHistory : sessionHistory;
  }

  function modeBadge(m) {
    const cls = m === "EASY" ? "mode-easy" : m === "MEDIUM" ? "mode-medium" : "mode-hard";
    return `<span class="badge ${cls}">${m}</span>`;
  }

  function statusBadge(s) {
    const cls = s === "BAD" ? "status-bad" : s === "GOOD" ? "status-good" : "status-perfect";
    return `<span class="badge ${cls}">${s}</span>`;
  }

  function renderInput(tokens) {
    return tokens
      .map((t) => {
        const k = KEYMAP[t.id];
        const isSpace = t.id === "SPACE";
        const inner = isSpace ? "&nbsp;" : escapeHtml(k ? k.displayText() : t.id);

        if (t.ok) {
          const okText = isSpace ? " " : escapeHtml(k ? k.displayText() : t.id);
          return `<span class="inOk">${okText}</span>`;
        }
        return `<span class="inFailGroup">(${inner})</span>`;
      })
      .join("");
  }

  function renderHud() {
    const ms = elapsedMs();
    el.timeText.textContent = `${(ms / 1000).toFixed(2)}s`;
    el.kpmText.textContent = String(calcKpm(idx, ms));
    el.failText.textContent = String(failCount);

    if (mode === "EASY") el.roundText.textContent = `${round}/∞`;
    else el.roundText.textContent = `${round}/${SESSION_ROUNDS}`;

    el.srLive.textContent = `Mode ${mode}. Round ${el.roundText.textContent}. Time ${(ms / 1000).toFixed(2)}. KPM ${calcKpm(idx, ms)}. Fail ${failCount}.`;
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

    const seqLen = Math.max(1, keyCfg.seqLen);
    const failRate = (sumFail / (seqLen * n)) * 100;

    el.avgKpm.textContent = String(avgKpm);
    el.avgTime.textContent = `${(avgTimeMs / 1000).toFixed(2)}s`;
    el.avgFailRate.textContent = `${failRate.toFixed(1)}%`;

    el.historyBody.innerHTML = items
      .map((r) => {
        const title = r.inputTokens.map((t) => keyLabel(t.id)).join("");
        return `
          <tr>
            <td>#${r.round}</td>
            <td>${modeBadge(r.mode)}</td>
            <td class="num">${r.kpm}</td>
            <td class="num">${(r.timeMs / 1000).toFixed(2)}s</td>
            <td class="num">${r.fail}</td>
            <td>${statusBadge(r.status)}</td>
            <td class="inputCell" title="${escapeHtml(title)}">${renderInput(r.inputTokens)}</td>
          </tr>
        `;
      })
      .join("");
  }

  // =========================
  // Sequence generation
  // =========================

  function drawFrom(pool, n, allowDup) {
    const src = pool.slice(0);
    if (allowDup) {
      const out = [];
      for (let i = 0; i < n; i++) out.push(src[Math.floor(Math.random() * src.length)]);
      return out;
    }
    const out = [];
    const bag = src.slice(0);
    for (let i = 0; i < n; i++) {
      const j = Math.floor(Math.random() * bag.length);
      out.push(bag[j]);
      bag.splice(j, 1);
    }
    return out;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generateSequence() {
    const basicPool = keyCfg.basicSelected.filter((id) => KEYMAP[id]);
    const addonPool = keyCfg.addonSelected.filter((id) => KEYMAP[id]);

    const seqLen = keyCfg.seqLen;
    const b = keyCfg.basicCount;
    const a = keyCfg.addonCount;

    if (basicPool.length === 0) basicPool.push("Q");
    if (addonPool.length === 0) addonPool.push("SPACE");

    const basicPicks = drawFrom(basicPool, b, keyCfg.allowDup);
    const addonPicks = drawFrom(addonPool, a, keyCfg.allowDup);
    return shuffle([...basicPicks, ...addonPicks]).slice(0, seqLen);
  }

  function renderBoard() {
    const tiles = [];
    for (let i = 0; i < target.length; i++) {
      const id = target[i];
      const cls = ["tile"];
      const k = KEYMAP[id];

      if (k && k.kind === "special" && id !== "SPACE") cls.push("specialKey");

      if (i < idx) cls.push("done", "ok");
      if (i === idx) cls.push("current");
      if (i === idx && wrongFlashActive) cls.push("wrong");

      const display = k ? k.displayHtml() : escapeHtml(id);
      tiles.push(`<div class="${cls.join(" ")}">${display}</div>`);
    }
    el.board.innerHTML = tiles.join("");
  }

  function resetSequence() {
    target = generateSequence();
    idx = 0;
    failCount = 0;
    inputTokens = [];
    wrongFlashActive = false;
    seqStartMs = nowMs();
    renderBoard();
    renderHud();
  }

  // =========================
  // Overlay message
  // =========================

  function setBoardMessage({ title, sub = "", showStart = false, showPlayAgain = false, stateKey = "idle", tone = "" }) {
    el.boardMessageTitle.textContent = title;
    el.boardMessageSub.innerHTML = sub;
    el.btnStart.hidden = !showStart;
    el.btnPlayAgain.hidden = !showPlayAgain;
    el.boardMessage.dataset.state = stateKey;
    if (tone) el.boardMessage.dataset.tone = tone;
    else delete el.boardMessage.dataset.tone;
    el.boardMessage.hidden = false;
  }

  function hideBoardMessage() {
    el.boardMessage.hidden = true;
  }

  function pointsForStatus(status) {
    if (status === "PERFECT") return 1;
    if (status === "GOOD") return 0.5;
    return 0;
  }

  function statusForRound({ timeSec, fail, timeout }) {
    if (timeout) return "BAD";

    if (mode === "EASY") {
      if (timeSec < 4 && fail === 0) return "PERFECT";
      if (timeSec >= 10 || fail >= 4) return "BAD";
      return "GOOD";
    }

    if (mode === "MEDIUM") {
      if (timeSec < 3 && fail === 0) return "PERFECT";
      if (fail >= 3) return "BAD";
      return "GOOD";
    }

    // HARD
    if (timeSec < 1.5 && fail === 0) return "PERFECT";
    if (fail >= 1) return "BAD";
    return "GOOD";
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function countdownThenStart() {
    state = "COUNTDOWN";

    setBoardMessage({ title: "Get Ready!", sub: "2", showStart: false, showPlayAgain: false, stateKey: "countdown" });
    await sleep(READY_MS / 2);

    setBoardMessage({ title: "Get Ready!", sub: "1", showStart: false, showPlayAgain: false, stateKey: "countdown" });
    await sleep(READY_MS / 2);

    setBoardMessage({ title: "GO!!!", sub: "", showStart: false, showPlayAgain: false, stateKey: "countdown" });
    beep(880, 120, 0.05);
    await sleep(GO_MS);

    hideBoardMessage();
    state = "PLAYING";
    resetSequence();
  }

  function finishSession() {
    state = "FINISHED";

    let tone = "green";
    if (sessionPoints < 5) tone = "red";
    if (Math.abs(sessionPoints - SESSION_ROUNDS) < 1e-9) tone = "orange";

    setBoardMessage({
      title: "Session Complete",
      sub: `Score: ${sessionPoints.toFixed(1)} / ${SESSION_ROUNDS}`,
      showStart: false,
      showPlayAgain: true,
      stateKey: "finished",
      tone,
    });
  }

  function recordRound({ timeout }) {
    const lim = limitMs();
    const ms = timeout && Number.isFinite(lim) ? lim : elapsedMs();
    const timeMs = Number.isFinite(ms) ? ms : elapsedMs();
    const timeSec = timeMs / 1000;

    const kpm = calcKpm(idx, Math.max(1, timeMs));
    const status = statusForRound({ timeSec, fail: failCount, timeout });

    const rec = {
      round,
      mode,
      kpm,
      timeMs,
      fail: failCount,
      status,
      inputTokens: inputTokens.slice(0),
    };

    if (mode === "EASY") {
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
    if (mode === "EASY") {
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
    recordRound({ timeout: true });
    advanceRoundAfterFinish();
  }

  function flashWrongTile() {
    wrongFlashActive = true;
    renderBoard();
    setTimeout(() => {
      if (state !== "PLAYING") return;
      wrongFlashActive = false;
      renderBoard();
    }, 260);
  }

  function findPressedKeyId(e) {
    for (const sp of Object.values(SPECIAL)) {
      if (sp.match(e)) return sp.id;
    }
    if (!e.key || e.key.length !== 1) return null;
    const k = e.key;
    if (/^[a-zA-Z]$/.test(k)) return k.toUpperCase();
    if (KEYMAP[k]) return k;
    return null;
  }

  function preventBrowserShortcuts(e) {
    const hardPrevent = new Set([" ", "Tab", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    // Backspace sengaja tidak ditangkap (nggak dipakai di pool)
    if (hardPrevent.has(e.key)) e.preventDefault();
  }

  function onKeyDown(e) {
    if (state === "PLAYING") preventBrowserShortcuts(e);
    if (state !== "PLAYING") return;

    const pressedId = findPressedKeyId(e);
    if (!pressedId) return;

    const expectedId = target[idx];
    if (!expectedId) return;

    const ok = pressedId === expectedId;
    inputTokens.push({ id: pressedId, ok });

    if (ok) {
      idx += 1;
      beep(520, 35, 0.035);
      if (idx >= target.length) {
        onSuccess();
        return;
      }
    } else {
      failCount += 1;
      beep(160, 70, 0.04);
      flashWrongTile();
    }

    renderBoard();
    renderHud();
  }

  function tick() {
    if (state === "PLAYING") {
      const lim = limitMs();
      if (Number.isFinite(lim) && elapsedMs() >= lim) onTimeout();
      else renderHud();
    }
    requestAnimationFrame(tick);
  }

  function updateModeButtons() {
    el.modeBtns.forEach((b) => {
      const m = String(b.dataset.mode || "").toUpperCase();
      b.hidden = m === mode;
    });
  }

  function hardResetForMode(newMode) {
    mode = newMode;
    localStorage.setItem("mode", mode);

    round = 1;
    idx = 0;
    failCount = 0;
    inputTokens = [];

    sessionHistory = [];
    sessionPoints = 0;

    updateModeButtons();
    renderScores();

    if (mode === "EASY") {
      state = "PLAYING";
      hideBoardMessage();
      resetSequence();
    } else {
      state = "IDLE";
      el.board.innerHTML = "";
      setBoardMessage({ title: "Ready?", sub: `${mode} • ${SESSION_ROUNDS} rounds`, showStart: true, showPlayAgain: false, stateKey: "idle" });
      renderHud();
    }
  }

  // =========================
  // EDIT KEY Modal
  // =========================

  let activeGroup = "BASIC";
  let draft = null;

  // Layout mirip keyboard asli (BACKSPACE dihapus dari pilihan)
  const KB_LAYOUT = [
    {
      cls: "kbdRow",
      keys: [
        { id: "ESC", label: "ESC", w: "wide" },
        { id: "`", label: "`" },
        ..."1234567890".split("").map((k) => ({ id: k, label: k })),
        { id: "-", label: "-" },
        { id: "=", label: "=" },
      ],
    },
    {
      cls: "kbdRow offsetQ",
      keys: [
        ..."QWERTYUIOP".split("").map((k) => ({ id: k, label: k })),
        { id: "[", label: "[" },
        { id: "]", label: "]" },
        { id: "\\", label: "\\", w: "wide" },
      ],
    },
    {
      cls: "kbdRow offset1",
      keys: [
        { id: "CAPSLOCK", label: "CAPS", w: "wide" },
        ..."ASDFGHJKL".split("").map((k) => ({ id: k, label: k })),
        { id: ";", label: ";" },
        { id: "'", label: "'" },
        { id: "ENTER", label: "ENTER", w: "wider" },
      ],
    },
    {
      cls: "kbdRow offset2",
      keys: [
        { id: "SHIFT", label: "SHIFT", w: "wider" },
        ..."ZXCVBNM".split("").map((k) => ({ id: k, label: k })),
        { id: ",", label: "," },
        { id: ".", label: "." },
        { id: "/", label: "/" },
        { id: "SHIFT", label: "SHIFT", w: "wider", dup: true },
      ],
    },
    {
      cls: "kbdRow offset3",
      keys: [
        { id: "CTRL", label: "CTRL", w: "wide" },
        { id: "ALT", label: "ALT", w: "wide" },
        { id: "SPACE", label: "SPACE", w: "space" },
        { id: "ALT", label: "ALT", w: "wide", dup: true },
        { id: "CTRL", label: "CTRL", w: "wide", dup: true },
      ],
    },
  ];

  function openKeyModal() {
    draft = {
      seqLen: keyCfg.seqLen,
      basicCount: keyCfg.basicCount,
      addonCount: keyCfg.addonCount,
      allowDup: keyCfg.allowDup,
      basicSelected: new Set(keyCfg.basicSelected),
      addonSelected: new Set(keyCfg.addonSelected),
    };

    activeGroup = "BASIC";
    syncTabs();
    syncRightPanel();
    renderKeyboard();

    el.keyModal.hidden = false;
    setTimeout(() => el.btnKeyClose.focus({ preventScroll: true }), 0);
  }

  function closeKeyModal() {
    el.keyModal.hidden = true;
    draft = null;
    el.btnEditKey.focus({ preventScroll: true });
  }

  function syncTabs() {
    const isBasic = activeGroup === "BASIC";
    el.tabBasic.classList.toggle("isActive", isBasic);
    el.tabAddon.classList.toggle("isActive", !isBasic);
    el.tabBasic.setAttribute("aria-selected", String(isBasic));
    el.tabAddon.setAttribute("aria-selected", String(!isBasic));
  }

  function syncRightPanel() {
    el.inpSeqLen.value = String(draft.seqLen);
    el.inpBasicCount.value = String(draft.basicCount);
    el.inpAddonCount.value = String(draft.addonCount);
    el.btnDupToggle.setAttribute("aria-pressed", String(!!draft.allowDup));
    el.btnDupToggle.querySelector(".toggleText").textContent = draft.allowDup ? "ON" : "OFF";

    el.selBasic.textContent = String(draft.basicSelected.size);
    el.selAddon.textContent = String(draft.addonSelected.size);
  }

  function clampInt(v, min, max) {
    if (!Number.isFinite(v)) return min;
    return Math.max(min, Math.min(max, Math.round(v)));
  }

  function validateDraft() {
    const seqLen = Number(draft.seqLen);
    const b = Number(draft.basicCount);
    const a = Number(draft.addonCount);

    if (!Number.isFinite(seqLen) || seqLen < 1) return "SEQ LEN minimal 1";
    if (!Number.isFinite(b) || b < 0) return "BASIC picks minimal 0";
    if (!Number.isFinite(a) || a < 0) return "ADDON picks minimal 0";
    if (b + a !== seqLen) return "BASIC + ADDON harus sama dengan SEQ LEN";
    if (b > 0 && draft.basicSelected.size === 0) return "Pilih minimal 1 key di BASIC";
    if (a > 0 && draft.addonSelected.size === 0) return "Pilih minimal 1 key di ADDON";

    if (!draft.allowDup) {
      if (b > draft.basicSelected.size) return "No-duplicate: BASIC picks lebih besar dari jumlah key BASIC";
      if (a > draft.addonSelected.size) return "No-duplicate: ADDON picks lebih besar dari jumlah key ADDON";
    }

    return "";
  }

  function applyValidationUi() {
    const msg = validateDraft();
    el.keyModalError.textContent = msg;
    el.btnKeySave.disabled = !!msg;
    el.btnKeySave.style.opacity = msg ? "0.6" : "1";
  }

  function renderKeyboard() {
    const sel = activeGroup === "BASIC" ? draft.basicSelected : draft.addonSelected;

    el.kbdRows.innerHTML = KB_LAYOUT.map((row) => {
      const keysHtml = row.keys
        .map((k) => {
          const isSel = sel.has(k.id);
          const extra = k.w ? ` ${k.w}` : "";
          const cls = `keycap${isSel ? " isSel" : ""}${extra ? " " + extra : ""}`;
          return `<div class="${cls}" role="button" tabindex="0" data-keyid="${escapeHtml(k.id)}"><span class="keycapLabel">${escapeHtml(k.label)}</span></div>`;
        })
        .join("");

      return `<div class="${row.cls}">${keysHtml}</div>`;
    }).join("");

    el.kbdRows.querySelectorAll(".keycap").forEach((node) => {
      node.addEventListener("click", () => toggleKey(node.dataset.keyid));
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleKey(node.dataset.keyid);
        }
      });
    });

    applyValidationUi();
  }

  function toggleKey(keyId) {
    if (!KEYMAP[keyId]) return;
    const sel = activeGroup === "BASIC" ? draft.basicSelected : draft.addonSelected;
    if (sel.has(keyId)) sel.delete(keyId);
    else sel.add(keyId);

    syncRightPanel();
    renderKeyboard();
  }

  function resetDraftToDefault() {
    draft.seqLen = DEFAULT_CFG.seqLen;
    draft.basicCount = DEFAULT_CFG.basicCount;
    draft.addonCount = DEFAULT_CFG.addonCount;
    draft.allowDup = DEFAULT_CFG.allowDup;
    draft.basicSelected = new Set(DEFAULT_CFG.basicSelected);
    draft.addonSelected = new Set(DEFAULT_CFG.addonSelected);

    activeGroup = "BASIC";
    syncTabs();
    syncRightPanel();
    renderKeyboard();
  }

  function commitDraft() {
    const msg = validateDraft();
    if (msg) {
      applyValidationUi();
      return;
    }

    keyCfg = {
      seqLen: Number(draft.seqLen),
      basicCount: Number(draft.basicCount),
      addonCount: Number(draft.addonCount),
      allowDup: !!draft.allowDup,
      basicSelected: Array.from(draft.basicSelected),
      addonSelected: Array.from(draft.addonSelected),
    };

    saveCfg(keyCfg);

    easyHistory = [];
    sessionHistory = [];
    sessionPoints = 0;
    round = 1;
    renderScores();

    if (mode === "EASY") {
      state = "PLAYING";
      hideBoardMessage();
      resetSequence();
    } else {
      state = "IDLE";
      el.board.innerHTML = "";
      setBoardMessage({ title: "Ready?", sub: `${mode} • ${SESSION_ROUNDS} rounds`, showStart: true, showPlayAgain: false, stateKey: "idle" });
      renderHud();
    }

    closeKeyModal();
  }

  // =========================
  // UI events
  // =========================

  el.modeBtns.forEach((b) => {
    b.addEventListener("click", () => {
      const m = String(b.dataset.mode || "").toUpperCase();
      if (!["EASY", "MEDIUM", "HARD"].includes(m)) return;
      hardResetForMode(m);
    });
  });

  el.btnMute.addEventListener("click", () => {
    muted = !muted;
    localStorage.setItem("muted", muted ? "1" : "0");
    el.btnMute.setAttribute("aria-pressed", String(muted));
    el.btnMute.textContent = muted ? "Unmute" : "Mute";
  });

  el.btnStart.addEventListener("click", () => {
    if (state !== "IDLE") return;
    countdownThenStart();
  });

  el.btnPlayAgain.addEventListener("click", () => {
    if (state !== "FINISHED") return;
    round = 1;
    sessionHistory = [];
    sessionPoints = 0;
    renderScores();
    countdownThenStart();
  });

  el.main.addEventListener("pointerdown", () => {
    el.main.focus({ preventScroll: true });
  });

  el.btnEditKey.addEventListener("click", openKeyModal);
  el.btnKeyClose.addEventListener("click", closeKeyModal);
  el.btnKeyCancel.addEventListener("click", closeKeyModal);
  el.btnKeyReset.addEventListener("click", resetDraftToDefault);
  el.btnKeySave.addEventListener("click", commitDraft);

  el.keyModal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close === "1") closeKeyModal();
  });

  el.tabBasic.addEventListener("click", () => {
    activeGroup = "BASIC";
    syncTabs();
    renderKeyboard();
  });
  el.tabAddon.addEventListener("click", () => {
    activeGroup = "ADDON";
    syncTabs();
    renderKeyboard();
  });

  function wireNumberInput(inp, onSet) {
    inp.addEventListener("input", () => {
      const v = Number(inp.value);
      onSet(v);
      syncRightPanel();
      applyValidationUi();
    });
  }

  wireNumberInput(el.inpSeqLen, (v) => (draft.seqLen = clampInt(v, 1, 20)));
  wireNumberInput(el.inpBasicCount, (v) => (draft.basicCount = clampInt(v, 0, 20)));
  wireNumberInput(el.inpAddonCount, (v) => (draft.addonCount = clampInt(v, 0, 20)));

  el.btnDupToggle.addEventListener("click", () => {
    draft.allowDup = !draft.allowDup;
    syncRightPanel();
    applyValidationUi();
  });

  window.addEventListener("keydown", (e) => {
    if (!el.keyModal.hidden && e.key === "Escape") {
      e.preventDefault();
      closeKeyModal();
      return;
    }
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
