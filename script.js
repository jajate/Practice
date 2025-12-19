const big = document.getElementById("big");
const seqEl = document.getElementById("seq");
const hint = document.getElementById("hint");

const keysSel = document.getElementById("keys");
const speed = document.getElementById("speed");       // tetap ada di UI, tapi tidak dipakai buat auto
const speedVal = document.getElementById("speedVal"); // cuma display

const runNoEl = document.getElementById("runNo");
const streakEl = document.getElementById("streak");
const accEl = document.getElementById("acc");
const avgTimeEl = document.getElementById("avgTime");
const failRateEl = document.getElementById("failRate");

const historyList = document.getElementById("historyList");
const seqLenEl = document.getElementById("seqLen");

const SEQ_LEN = 7;
if (seqLenEl) seqLenEl.textContent = String(SEQ_LEN);

let seq = [];
let seqIdx = 0;
let shownAt = 0;

// per-run stats
let total = 0;
let correct = 0;
let misses = 0;
let hitTimes = [];
let runStart = 0;

// global stats
let streak = 0;
let runNo = 1;

// rolling history max 10
let runHistory = JSON.parse(localStorage.getItem("runHistory") || "[]");

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

function fmtMs(ms){
  if (!Number.isFinite(ms)) return "-";
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms/1000).toFixed(2)}s`;
}
function avg(arr){
  if(!arr.length) return NaN;
  return arr.reduce((a,b)=>a+b,0) / arr.length;
}

function calcRollingAvgTime(){
  const vals = runHistory.slice(0,10).map(r => r.avgTimeMs).filter(v => Number.isFinite(v));
  return avg(vals);
}
function calcRollingFailRate(){
  const last = runHistory.slice(0,10);
  const t = last.reduce((s,r)=>s + (r.total||0), 0);
  const m = last.reduce((s,r)=>s + (r.misses||0), 0);
  return t ? (m / t) * 100 : 0;
}

function updateTopStats(){
  if (runNoEl) runNoEl.textContent = String(runNo);
  if (streakEl) streakEl.textContent = String(streak);

  const a = total ? Math.round((correct/total)*100) : 100;
  if (accEl) accEl.textContent = `${a}%`;

  if (avgTimeEl) avgTimeEl.textContent = fmtMs(calcRollingAvgTime());
  if (failRateEl) failRateEl.textContent = `${calcRollingFailRate().toFixed(1)}%`;
}

function renderHistory(){
  if(!historyList) return;
  if(!runHistory.length){
    historyList.innerHTML = `<div class="run"><small>No runs yet</small></div>`;
    return;
  }
  historyList.innerHTML = runHistory.slice(0,10).map(r => `
    <div class="run">
      <div>
        <b>RUN #${r.runNo}</b> • <small>${r.keys}</small><br/>
        <small>${new Date(r.when).toLocaleString()}</small>
      </div>
      <div style="text-align:right">
        <b>${r.score}</b><br/>
        <small>avg ${r.avgTimeLabel} • fail ${r.failRateLabel}</small>
      </div>
    </div>
  `).join("");
}

function newSequence(){
  const ks = keySet();
  seq = Array.from({length: SEQ_LEN}, ()=> randomKey(ks));
  seqIdx = 0;

  seqEl.textContent = seq.join(" ");
  big.textContent = seq[0];
  hint.textContent = "Tekan tombol yang disorot / yang tampil di tengah.";
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
  const k = String(e.key).toUpperCase();
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
    }

    big.textContent = seq[seqIdx];
    setHighlight(seq[seqIdx]);
    shownAt = performance.now();
  } else {
    streak = 0;
    misses++;
    flashKey(k, "miss");
    // tetap di expected yang sama
  }

  updateTopStats();
}

document.addEventListener("keydown", handleKey);

keysSel.addEventListener("change", ()=> startRun());

// tempo slider sekarang cuma display (nggak bikin auto gerak)
if (speed && speedVal) {
  speedVal.textContent = `${speed.value}ms`;
  speed.addEventListener("input", ()=> speedVal.textContent = `${speed.value}ms`);
}

// init
renderHistory();
startRun();
