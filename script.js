const big = document.getElementById("big");


seqEl.textContent = seq.join(" ");
big.textContent = seq[0];
hint.textContent = "Ikuti urutan sampai habis.";
setHighlight(seq[0]);


shownAt = performance.now();
}


function startRun(){
total = 0;
correct = 0;
misses = 0;
hitTimes = [];
runStart = performance.now();


newSequence();
updateTopStats();
}


function finishRun(){
const elapsed = (performance.now() - runStart) / 1000;
const kpm = elapsed > 0 ? Math.round((correct / elapsed) * 60) : 0;


const avgTimeMs = avg(hitTimes);
const failRate = total ? (misses / total) * 100 : 0;


const run = {
when: Date.now(),
runNo,
keys: keysSel.value,
correct,
total,
misses,
score: `${kpm} KPM`,
avgTimeMs,
avgTimeLabel: fmtMs(avgTimeMs),
failRateLabel: `${failRate.toFixed(1)}%`,
};


runHistory.unshift(run);
runHistory = runHistory.slice(0,10);
localStorage.setItem("runHistory", JSON.stringify(runHistory));
renderHistory();


runNo += 1;
updateTopStats();
}


function handleKey(e){
if(!running) return;


const k = e.key.toUpperCase();
if(!keySet().includes(k)) return;


total++;


const expected = seq[seqIdx];
if (k === expected){
correct++;
streak++;


hitTimes.push(performance.now() - shownAt);
flashKey(k, "hit");


seqIdx++;
if (seqIdx >= seq.length){
finishRun();
startRun();
return;
} else {
big.textContent = seq[seqIdx];
setHighlight(seq[seqIdx]);
shownAt = performance.now();
}
} else {
streak = 0;
misses++;
flashKey(k, "miss");
}


updateTopStats();
}


speed.addEventListener("input", ()=> {
speedVal.textContent = `${speed.value}ms`;
});


keysSel.addEventListener("change", ()=> {
startRun();
});


document.addEventListener("keydown", handleKey);


// init
speedVal.textContent = `${speed.value}ms`;
renderHistory();
startRun();
