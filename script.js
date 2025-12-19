const big = document.getElementById("big");
<b>RUN #${r.runNo ?? "-"}</b> • <small>${r.keys ?? "-"}</small><br/>
<small>${r.when ? new Date(r.when).toLocaleString() : ""}</small>
</div>


<div style="text-align:right">
<div class="metrics">
<span class="kpm">kpm: ${kpmLabel}</span>
<span class="avg">avg: ${avgLabel}</span>
<span class="fail">fail: ${failLabel}</span>
</div>
</div>
</div>
`;
}).join("");
}


function newSequence(){
const ks = keySet();
seq = Array.from({length: SEQ_LEN}, ()=> randomKey(ks));
seqIdx = 0;
updatePrompt();
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
kpm,
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
const k = String(e.key).toUpperCase();
if(!keySet().includes(k)) return;


total++;


const expected = seq[seqIdx];
if (k === expected){
correct++;
streak++;
hitTimes.push(performance.now() - shownAt);
flashBig("hit");


seqIdx++;
if (seqIdx >= seq.length){
finishRun();
startRun();
return;
}
updatePrompt();
} else {
streak = 0;
misses++;
flashBig("miss");
// tetap di expected yang sama
}


updateTopStats();
}


document.addEventListener("keydown", handleKey);
keysSel.addEventListener("change", ()=> startRun());


// init
renderHistory();
startRun();
