let startTime = null;
let elapsed = 0;
let running = false;

function updateDisplay() {
  const now = Date.now();
  const total = elapsed + (running ? now - startTime : 0);
  const hrs = Math.floor(total / 3600000);
  const mins = Math.floor((total % 3600000) / 60000);
  const secs = Math.floor((total % 60000) / 1000);
  document.getElementById("time").textContent =
    `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function start() {
  if (!running) {
    startTime = Date.now();
    running = true;
    requestAnimationFrame(tick);
  }
}

function stop() {
  if (running) {
    elapsed += Date.now() - startTime;
    running = false;
  }
}

function reset() {
  elapsed = 0;
  startTime = null;
  running = false;
  updateDisplay();
}

function tick() {
  if (running) {
    updateDisplay();
    requestAnimationFrame(tick);
  }
}
