let seqCounter = 0;
const getSeq = () => ++seqCounter;

export const emitWithSeq = (socket, event, data = {}) => {
  if (!socket) return;
  socket.emit(event, { ...data, seq: getSeq() });
};

export const createRoom = (socket, { mode, team }) =>
  emitWithSeq(socket, "create_room", { mode, team });

export const joinRoom = (socket, { roomCode, team, userId }) =>
  emitWithSeq(socket, "join_room", { roomCode, team, userId });

export const leaveRoom = (socket, roomCode) =>
  emitWithSeq(socket, "leave_room", { roomCode });

export const startAuction = (socket, roomCode) =>
  emitWithSeq(socket, "start_auction", { roomCode });

export const placeBid = (socket, roomCode) =>
  emitWithSeq(socket, "place_bid", { roomCode });

export const advancePlayer = (socket, roomCode) =>
  emitWithSeq(socket, "advance_player", { roomCode });

export const markSold = (socket, roomCode) =>
  emitWithSeq(socket, "mark_sold", { roomCode });

export const markUnsold = (socket, roomCode) =>
  emitWithSeq(socket, "mark_unsold", { roomCode });

export const undo = (socket, roomCode) =>
  emitWithSeq(socket, "undo", { roomCode });

export const exerciseRTM = (socket, roomCode) =>
  emitWithSeq(socket, "exercise_rtm", { roomCode });

export const pauseAuction = (socket, roomCode) =>
  emitWithSeq(socket, "pause_auction", { roomCode });

export const resumeAuction = (socket, roomCode) =>
  emitWithSeq(socket, "resume_auction", { roomCode });

export const updateSettings = (socket, roomCode, settings) =>
  emitWithSeq(socket, "update_settings", { roomCode, settings });

export const sendChat = (socket, roomCode, message) =>
  emitWithSeq(socket, "chat_message", { roomCode, message });

export const claimHost = (socket, roomCode) =>
  emitWithSeq(socket, "claim_host", { roomCode });

export const fetchState = (socket, roomCode) =>
  emitWithSeq(socket, "fetch_state", { roomCode });

export const endAuction = (socket, roomCode) =>
  emitWithSeq(socket, "end_auction", { roomCode });
