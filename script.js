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

function updateStats(){
  streakEl.textContent = String(streak);
  const a = total ? Math.round((correct/total)*100) : 100;
  accEl.textContent = `${a}%`;
  levelVal.textContent = String(level);
}

function nextSingle(){
  const ks = keySet();
  target = randomKey(ks);
  big.textContent = target;
  seqEl.textContent = "";
  hint.textContent = "Tekan tombol yang muncul.";
  setHighlight(target);
}

function buildSequence(){
  const ks = keySet();
  // level influences length (beginner-friendly)
  const len = Math.min(3 + level, 10); // 4..10
  seq = Array.from({length: len}, ()=> randomKey(ks));
  seqIdx = 0;
  seqEl.textContent = seq.join(" ");
  big.textContent = seq[0];
  hint.textContent = "Ikuti urutan (sequence) sampai habis.";
  setHighlight(seq[0]);
}

function bumpLevel(){
  // naik level setiap 15 benar berturut (pemula tetap nyaman)
  if (streak > 0 && streak % 15 === 0) level++;
}

function start(){
  running = true;
  total = correct = streak = 0;
  level = 1;
  updateStats();
  if (modeSel.value === "sequence") buildSequence();
  else nextSingle();

  // optional metronome tick for rhythm feel
  const doTick = () => {
    if(!running) return;
    // if user terlalu lama tidak input, anggap miss (di mode single)
    if (modeSel.value === "single") {
      total++; streak = 0; updateStats(); flashKey(target, "miss");
      nextSingle();
    }
    tickHandle = setTimeout(doTick, Number(speed.value));
  };
  tickHandle = setTimeout(doTick, Number(speed.value));
}

function stop(){
  running = false;
  if (tickHandle) clearTimeout(tickHandle);
  tickHandle = null;
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
      correct++; streak++; bumpLevel();
      flashKey(k, "hit");
      nextSingle();
    } else {
      streak = 0;
      flashKey(k, "miss");
      // keep same target to reinforce learning
    }
    updateStats();
    return;
  }

  // sequence mode
  const expected = seq[seqIdx];
  if (k === expected){
    correct++; streak++; bumpLevel();
    flashKey(k, "hit");
    seqIdx++;
    if (seqIdx >= seq.length){
      buildSequence();
    } else {
      big.textContent = seq[seqIdx];
      setHighlight(seq[seqIdx]);
    }
  } else {
    streak = 0;
    flashKey(k, "miss");
  }
  updateStats();
}

speed.addEventListener("input", ()=> speedVal.textContent = `${speed.value}ms`);
startBtn.addEventListener("click", ()=> { if(!running) start(); });
stopBtn.addEventListener("click", stop);
document.addEventListener("keydown", handleKey);

// init
speedVal.textContent = `${speed.value}ms`;
hint.textContent = "Tekan Start untuk mulai.";
nextSingle();
stop();
