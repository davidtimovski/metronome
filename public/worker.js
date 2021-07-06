let isRunning = false;
let msPerBeat, intervalId;

postMessage(true);

function tick() {
  postMessage(true);
}

onmessage = (e) => {
  msPerBeat = e.data.msPerBeat;

  if (e.data.action === "toggleStartStop") {
    if (isRunning) {
      clearInterval(intervalId);
      isRunning = false;
    } else {
      tick();
      intervalId = setInterval(tick, msPerBeat);
      isRunning = true;
    }
  } else if (e.data.action === "tempoChange" && isRunning) {
    clearInterval(intervalId);
    intervalId = setInterval(tick, msPerBeat);
  }
};
