(() => {
// ==== Boot diagnostics & safe reset (fix "UI tampil tapi tidak bisa klik" jika JS crash / storage korup) ====
const QS = new URLSearchParams(location.search);
const CFG_KEY_BOOT = "jajate_keycfg_v2";
const STORAGE_KEYS = [CFG_KEY_BOOT, "muted", "mode"]; // hapus hanya key kita


function purgeStorage() {
try { STORAGE_KEYS.forEach((k) => localStorage.removeItem(k)); } catch {}
}


// Buka: /Practice/?reset=1 untuk reset config jika ada data lama yang bikin error
if (QS.has("reset")) {
purgeStorage();
}


function showFatal(err) {
const msg = (err && (err.stack || err.message)) ? String(err.stack || err.message) : String(err);
// coba tampilkan ke overlay boardMessage kalau ada
const boardMsg = document.getElementById("boardMessage");
const title = document.getElementById("boardMessageTitle");
const sub = document.getElementById("boardMessageSub");
const btnStart = document.getElementById("btnStart");
const btnPlayAgain = document.getElementById("btnPlayAgain");
if (boardMsg && title && sub) {
title.textContent = "Error (JS crash)";
sub.textContent = msg.slice(0, 400);
if (btnStart) btnStart.hidden = true;
if (btnPlayAgain) btnPlayAgain.hidden = true;
boardMsg.hidden = false;
boardMsg.dataset.state = "error";
boardMsg.dataset.tone = "red";
} else {
// fallback
alert("Error (JS crash):
" + msg);
}
}


window.addEventListener("error", (e) => showFatal(e.error || e.message || e));
window.addEventListener("unhandledrejection", (e) => showFatal(e.reason || e));


// NOTE: beberapa laptop/PC (bahkan tanpa touchscreen) bisa melaporkan maxTouchPoints > 0.
// Jadi: kita tampilkan warning untuk perangkat "mobile-like", tapi TIDAK mematikan game.
const isMobileLike =
(window.matchMedia && window.matchMedia("(pointer: coarse) and (hover: none)").matches) ||
/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "") ||
window.innerWidth < 820;


if (isMobileLike) {
el.mobileBlock.hidden = false;
}


})();
