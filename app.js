(() => {
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


const LIMIT_MS = {
EASY: Infinity,
MEDIUM: 4000,
HARD: 3000,
};
const SESSION_ROUNDS = 10;
const READY_MS = 1500;
const GO_MS = 500;


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


let mode = (localStorage.getItem("mode") || "EASY").toUpperCase();
if (!["EASY", "MEDIUM", "HARD"].includes(mode)) mode = "EASY";


let state = "IDLE";


let target = [];
let idx = 0;
let failCount = 0;
let seqStartMs = 0;


let inputTokens = [];


let wrongFlashActive = false;
let round = 1;


let easyHistory = [];
let sessionHistory = [];


let sessionPoints = 0;


function nowMs() {
return Date.now();
}


function limitMs() {
return LIMIT_MS[mode];
}


function elapsedMs() {
return Math.max(0, nowMs() - seqStartMs);
}


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
})();
