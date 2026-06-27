const socketSeqTracker = new Map();

function shouldProcess(socketId, seq) {
  if (seq == null) return true;
  const lastSeen = socketSeqTracker.get(socketId) || -1;
  if (seq <= lastSeen) return false;
  socketSeqTracker.set(socketId, seq);
  return true;
}

function getLastSeq(socketId) {
  return socketSeqTracker.get(socketId) || -1;
}

function clearSocket(socketId) {
  socketSeqTracker.delete(socketId);
}

module.exports = { shouldProcess, getLastSeq, clearSocket };
