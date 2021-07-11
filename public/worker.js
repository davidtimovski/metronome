let isRunning = false;
let msPerBeat, intervalId;

postMessage(true);

function tick() {
  postMessage(true);
}

function start() {
  tick();
  intervalId = setInterval(tick, msPerBeat);
  isRunning = true;
}

function stop() {
  clearInterval(intervalId);
  isRunning = false;
}

onmessage = (e) => {
  if (e.data.action === "toggleStartStop") {
    if (isRunning) {
      stop();
    } else {
      msPerBeat = e.data.msPerBeat;
      start();
    }
  } else if (e.data.action === "tempoChange" && isRunning) {
    msPerBeat = e.data.msPerBeat;
    clearInterval(intervalId);
    intervalId = setInterval(tick, msPerBeat);
  }
};
