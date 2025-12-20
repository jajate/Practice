(() => {
onSet(v);
syncRightPanel();
applyValidationUi();
});
}


function clampInt(v, min, max) {
if (!Number.isFinite(v)) return min;
return Math.max(min, Math.min(max, Math.round(v)));
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


function updateModeButtons() {
el.modeBtns.forEach((b) => {
const m = String(b.dataset.mode || "").toUpperCase();
b.hidden = m === mode;
});
}


function sleep(ms) {
return new Promise((r) => setTimeout(r, ms));
}


updateModeButtons();
renderScores();
hardResetForMode(mode);
requestAnimationFrame(tick);
})();
