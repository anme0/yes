let startTime = null;
let elapsed = 0;
let timer = null;
let running = false;

function updateDisplay() {
  const total = elapsed + (running ? Date.now() - startTime : 0);
  const hrs = Math.floor(total / 3600000);
  const mins = Math.floor((total % 3600000) / 60000);
  const secs = Math.floor((total % 60000) / 1000);
  document.getElementById("time").textContent =
    `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function start() {
  if (!running) {
    startTime = Date.now();
    timer = setInterval(updateDisplay, 1000);
    running = true;
  }
}

function stop() {
  if (running) {
    elapsed += Date.now() - startTime;
    clearInterval(timer);
    running = false;
    updateDisplay();
  }
}

function reset() {
  elapsed = 0;
  startTime = null;
  clearInterval(timer);
  running = false;
  updateDisplay();
}

// Pause when screen goes off or tab is hidden
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
});
