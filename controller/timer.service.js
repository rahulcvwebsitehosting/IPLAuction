const timerRegistry = new Map();

function startTimer(roomCode, durationSec, onTick, onExpire) {
  stopTimer(roomCode);

  const expiresAt = Date.now() + durationSec * 1000;
  let remaining = durationSec;

  const intervalId = setInterval(() => {
    remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

    if (onTick) onTick(remaining);

    if (remaining <= 0) {
      stopTimer(roomCode);
      if (onExpire) onExpire();
    }
  }, 1000);

  const handle = { intervalId, remaining: durationSec, expiresAt };
  timerRegistry.set(roomCode, handle);
  return handle;
}

function resetTimer(roomCode, addedSec, maxDurationSec) {
  const handle = timerRegistry.get(roomCode);
  if (!handle) return null;

  const newRemaining = Math.min(handle.remaining + addedSec, maxDurationSec);
  stopTimer(roomCode);
  return startTimer(roomCode, newRemaining, null, null);
}

function addTimerCallbacks(roomCode, onTick, onExpire) {
  const handle = timerRegistry.get(roomCode);
  if (!handle) return;
  handle._onTick = onTick;
  handle._onExpire = onExpire;

  const oldInterval = handle.intervalId;
  if (oldInterval) clearInterval(oldInterval);

  const remaining = Math.max(
    0,
    Math.ceil((handle.expiresAt - Date.now()) / 1000)
  );
  handle.remaining = remaining;

  handle.intervalId = setInterval(() => {
    handle.remaining = Math.max(
      0,
      Math.ceil((handle.expiresAt - Date.now()) / 1000)
    );
    if (handle._onTick) handle._onTick(handle.remaining);
    if (handle.remaining <= 0) {
      stopTimer(roomCode);
      if (handle._onExpire) handle._onExpire();
    }
  }, 1000);
}

function pauseTimer(roomCode) {
  const handle = timerRegistry.get(roomCode);
  if (!handle) return 0;

  const remaining = Math.max(
    0,
    Math.ceil((handle.expiresAt - Date.now()) / 1000)
  );
  clearInterval(handle.intervalId);
  handle.remaining = remaining;
  handle.intervalId = null;
  return remaining;
}

function resumeTimer(roomCode, onTick, onExpire) {
  const handle = timerRegistry.get(roomCode);
  if (!handle) return;
  startTimer(roomCode, handle.remaining, onTick, onExpire);
}

function stopTimer(roomCode) {
  const handle = timerRegistry.get(roomCode);
  if (!handle) return;
  clearInterval(handle.intervalId);
  timerRegistry.delete(roomCode);
}

function getRemaining(roomCode) {
  const handle = timerRegistry.get(roomCode);
  if (!handle) return 0;
  return Math.max(0, Math.ceil((handle.expiresAt - Date.now()) / 1000));
}

module.exports = {
  startTimer,
  resetTimer,
  addTimerCallbacks,
  pauseTimer,
  resumeTimer,
  stopTimer,
  getRemaining,
};
