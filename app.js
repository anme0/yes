// State is computed from timestamps so it stays accurate even if timers are throttled.
const $ = (id) => document.getElementById(id);
const timeEl = $("time"), statusEl = $("status");
const startBtn = $("start"), lapBtn = $("lap"), pauseBtn = $("pause"), resetBtn = $("reset");
const lapsEl = $("laps"); const pauseOnLockEl = $("pauseOnLock");

const STORAGE_KEY = "pwa-stopwatch-state-v1";
let state = loadState() || {
  running: false,
  startEpochMs: 0,      // when the current run started (Date.now)
  accumulatedMs: 0,     // total time from previous runs
  laps: [],             // array of elapsedMs at lap time
  pauseOnLock: false
};

let rafId = null;
let idleDetector = null;

// Service worker for PWA/offline
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// Install prompt (Add to Home Screen)
let deferredPrompt = null;
const installPill = document.getElementById("installPill");
const installBtn = document.getElementById("installBtn");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installPill.hidden = false;
});
installBtn?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  installPill.hidden = true;
  deferredPrompt = null;
});

// ----- Core stopwatch logic -----
function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
  catch { return null; }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function format(ms) {
  const sign = ms < 0 ? "-" : "";
  ms = Math.abs(ms);
  const h = Math.floor(ms/3600000); ms %= 3600000;
  const m = Math.floor(ms/60000);   ms %= 60000;
  const s = Math.floor(ms/1000);
  const ms3 = (ms % 1000).toString().padStart(3,"0");
  return `${sign}${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${ms3}`;
}

function elapsedNow() {
  return state.accumulatedMs + (state.running ? (Date.now() - state.startEpochMs) : 0);
}

function render() {
  timeEl.textContent = format(elapsedNow());
  statusEl.textContent = state.running ? "Running" : "Paused";
  startBtn.disabled = state.running;
  pauseBtn.disabled = !state.running;
  lapBtn.disabled = !state.running;
  resetBtn.disabled = state.running && elapsedNow() > 0 ? false : !state.running && elapsedNow() === 0;

  // laps
  lapsEl.innerHTML = state.laps.map((ms, i) => `
    <div class="lap">
      <div>Lap ${i+1}</div>
      <div>${format(ms)}</div>
    </div>
  `).join("");
}

function tick() {
  render();
  rafId = requestAnimationFrame(tick);
}

function start() {
  if (state.running) return;
  state.running = true;
  state.startEpochMs = Date.now();
  saveState(); render();
}
function pause() {
  if (!state.running) return;
  state.accumulatedMs += Date.now() - state.startEpochMs;
  state.startEpochMs = 0;
  state.running = false;
  saveState(); render();
}
function reset() {
  state.running = false;
  state.startEpochMs = 0;
  state.accumulatedMs = 0;
  state.laps = [];
  saveState(); render();
}
function lap() {
  state.laps.push(elapsedNow());
  saveState(); render();
}

startBtn.addEventListener("click", start);
pauseBtn.addEventListener("click", pause);
resetBtn.addEventListener("click", reset);
lapBtn.addEventListener("click", lap);

// Keep display updating smoothly
tick();

// Persist on lifecycle changes and correct display on resume
document.addEventListener("visibilitychange", () => {
  // No pause on app switch: we *do not* stop here.
  // We just rerender when we become visible again to reflect real elapsed time.
  if (document.visibilityState === "visible") render();
  saveState();
});
window.addEventListener("pagehide", saveState);
window.addEventListener("pageshow", render);

// ----- Optional: Pause when device LOCKS (beta) -----
pauseOnLockEl.checked = state.pauseOnLock;
pauseOnLockEl.addEventListener("change", async (e) => {
  state.pauseOnLock = pauseOnLockEl.checked;
  saveState();
  if (state.pauseOnLock) await enableIdlePause();
  else disableIdlePause();
});

async function enableIdlePause() {
  if (!("IdleDetector" in window)) {
    statusEl.textContent = "Pause-on-lock unsupported on this browser.";
    return;
  }
  try {
    idleDetector = new IdleDetector();
    await IdleDetector.requestPermission();
    await idleDetector.start({ threshold: 60_000, // 1 min inactivity (minimum realistic)
                               signal: new AbortController().signal });
    idleDetector.addEventListener("change", () => {
      const user = idleDetector.userState;   // "active" | "idle" | "locked"
      if (user === "locked" && state.running) {
        pause();
        statusEl.textContent = "Paused (device locked)";
      }
    });
    statusEl.textContent = "Pause-on-lock enabled.";
  } catch (err) {
    statusEl.textContent = "Pause-on-lock failed or not permitted.";
  }
}
function disableIdlePause() {
  if (idleDetector?.abort) idleDetector.abort(); // some impls expose abort via signal controller; safe to ignore
  idleDetector = null;
  statusEl.textContent = "Pause-on-lock disabled.";
}

// Re-enable idle pause on load if user had it on
if (state.pauseOnLock) enableIdlePause();

// On first load, ensure UI reflects persisted state
render();
