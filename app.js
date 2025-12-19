(() => {
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
})();
