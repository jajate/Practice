const big = document.getElementById("big");
const seqEl = document.getElementById("seq");
const hint = document.getElementById("hint");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const modeSel = document.getElementById("mode");
const keysSel = document.getElementById("keys");
const speed = document.getElementById("speed");
const speedVal = document.getElementById("speedVal");

const streakEl = document.getElementById("streak");
const accEl = document.getElementById("acc");
const levelVal = document.getElementById("levelVal");
const avgTimeEl = document.getElementById("avgTime");
const failRateEl = document.getElementById("failRate");
const historyList = document.getElementById("historyList");

let startTime = 0;
let shownAt = 0;
let misses = 0;
let hitTimes = [];
let runHistory = JSON.parse(localStorage.getItem("runHistory") || "[]");

let running = false;
let target = "W";
let seq = [];
let seqIdx = 0;

let total = 0;
let correct = 0;
let streak = 0;
let level = 1;
let tickHandle = null;

function keySet() {
  const v = keysSel.value;
  if (v === "wasd") return ["W","A","S","D"];
  if (v === "wasdqe") return ["W","A","S","D","Q","E"];
  return ["W","A","S","D","Q","E","R","T"];
}

function randomKey(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function setHighlight(k){
  document.querySelectorAll(".k").forEach(el=>{
    el.classList.toggle("on", el.dataset.k === k);
  });
}

function flashKey(k, cls){
  const el = document.querySelector(`.k[data-k="${k}"]`);
  if(!el) return;
  el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls), 220);
}

/* ===== metrics helpers (MUST be outside handleKey) ===== */
function fmtMs(ms){
  if (!Number.isFinite(ms)) return "-";
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms/1000).toFixed(2)}s`;
}

function calcAvgTime(){
  if (!hitTimes.length) return NaN;
  return hitTimes.reduce((a,b)=>a+b,0) / hitTimes.length;
}

function calcFailRate(){
  return total ? (misses / total) * 100 : 0;
}

function renderHistory(){
  if(!historyList) return;
  if(!runHistory.length){
    historyList.innerHTML = `<div class="run"><small>No runs yet</small></div>`;
    return;
  }
  historyList.innerHTML = runHistory
    .slice(0,10)
    .map(r => `
      <div class="run">
        <div>
          <b>${r.mode.toUpperCase()}</b> • <small>${r.keys}</small><br/>
          <small>${new Date(r.when).toLocaleString()}</small>
        </div>
        <div style="text-align:right">
          <b>${r.score}</b><br/>
          <small>avg ${r.avgTime} • fail ${r.failRate}</small>
        </div>
      </div>
    `).join("");
}
/* ======================================================= */

function updateStats(){
  streakEl.textContent = String(streak);
  const a = total ? Math.round((correct/total)*100) : 100;
  accEl.textContent = `${a}%`;
  levelVal.textContent = String(level);

  if (avgTimeEl) avgTimeEl.textContent = fmtMs(calcAvgTime());
  if (failRateEl) failRateEl.textContent = `${calcFailRate().toFixed(1)}%`;
}

function nextSingle(){
  const ks = keySet();
  target = randomKey(ks);
  big.textContent = target;
  seqEl.textContent = "";
  hint.textContent = "Tekan tombol yang muncul.";
  setHighlight(target);
  shownAt = performance.now();
}

function buildSequence(){
  const ks = keySet();
  const len = Math.min(3 + level, 10);
  seq = Array.from({length: len}, ()=> randomKey(ks));
  seqIdx = 0;
  seqEl.textContent = seq.join(" ");
  big.textContent = seq[0];
  hint.textContent = "Ikuti urutan (sequence) sampai habis.";
  setHighlight(seq[0]);
  shownAt = performance.now();
}

function bumpLevel(){
  if (streak > 0 && streak % 15 === 0) level++;
}

function start(){
  running = true;

  total = 0;
  correct = 0;
  streak = 0;
  level = 1;

  misses = 0;
  hitTimes = [];
  startTime = performance.now();

  updateStats();

  if (modeSel.value === "sequence") buildSequence();
  else nextSingle();

  const doTick = () => {
    if(!running) return;

    // auto-miss untuk mode single kalau kelamaan
    if (modeSel.value === "single") {
      total++;
      misses++;
      streak = 0;
      updateStats();
      flashKey(target, "miss");
      nextSingle();
    }
    tickHandle = setTimeout(doTick, Number(speed.value));
  };

  tickHandle = setTimeout(doTick, Number(speed.value));
}

function stop(){
  if (!running) return;
  running = false;

  if (tickHandle) clearTimeout(tickHandle);
  tickHandle = null;

  // save run summary
  const elapsed = (performance.now() - startTime) / 1000;
  const kpm = elapsed > 0 ? Math.round((correct / elapsed) * 60) : 0;

  const run = {
    when: Date.now(),
    mode: modeSel.value,
    keys: keysSel.value,
    correct,
    total,
    misses,
    score: `${kpm} KPM`,
    avgTime: fmtMs(calcAvgTime()),
    failRate: `${calcFailRate().toFixed(1)}%`,
  };

  runHistory.unshift(run);
  runHistory = runHistory.slice(0,10);
  localStorage.setItem("runHistory", JSON.stringify(runHistory));
  renderHistory();

  hint.textContent = "Tekan Start untuk mulai.";
  setHighlight("");
}

function handleKey(e){
  if(!running) return;

  const k = e.key.toUpperCase();
  if(!keySet().includes(k)) return;

  total++;

  if (modeSel.value === "single") {
    if (k === target){
      correct++;
      streak++;
      bumpLevel();

      hitTimes.push(performance.now() - shownAt);
      flashKey(k, "hit");
      nextSingle();
    } else {
      streak = 0;
      misses++;
      flashKey(k, "miss");
      // keep same target
    }
    updateStats();
    return;
  }

  // sequence mode
  const expected = seq[seqIdx];
  if (k === expected){
    correct++;
    streak++;
    bumpLevel();

    hitTimes.push(performance.now() - shownAt);
    flashKey(k, "hit");

    seqIdx++;
    if (seqIdx >= seq.length){
      buildSequence();
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

  updateStats();
}

/* events */
speed.addEventListener("input", ()=> speedVal.textContent = `${speed.value}ms`);
startBtn.addEventListener("click", ()=> { if(!running) start(); });
stopBtn.addEventListener("click", stop);
document.addEventListener("keydown", handleKey);

/* init */
speedVal.textContent = `${speed.value}ms`;
hint.textContent = "Tekan Start untuk mulai.";
renderHistory();
stop();     // ensure stopped state
nextSingle();
