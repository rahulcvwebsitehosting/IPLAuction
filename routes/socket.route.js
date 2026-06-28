const Room = require("../database/models/room.model");
const RoomPlayer = require("../database/models/roomPlayer.model");
const ChatMessage = require("../database/models/chatMessage.model");
const aService = require("../controller/auction.service");
const hostMigration = require("../controller/host.migration");
const {
  shouldProcess,
  getLastSeq,
  clearSocket,
} = require("../utilities/idempotency");
const {
  ROOM_CODE_REGEX,
  ROOM_STATUS,
  BID_ERROR_MESSAGES,
} = require("../config/constants");

const socketBindings = new Map();
const pendingBidTimes = new Map();
const pendingChatTimes = new Map();

function getRoomAuction(roomCode) {
  return aService.getAuction(roomCode);
}

async function isAdmin(binding) {
  if (!binding) return false;
  try {
    const room = await Room.findOne({ roomCode: binding.roomCode });
    return room && room.adminUserId === binding.userId;
  } catch {
    return false;
  }
}

function rateLimitCheck(map, key, limitMs) {
  const last = map.get(key) || 0;
  const now = Date.now();
  if (now - last < limitMs) return false;
  map.set(key, now);
  return true;
}

function registerSocket(io, socket, data) {
  socket.join(data.roomCode);
  socketBindings.set(socket.id, {
    roomCode: data.roomCode,
    userId: data.userId,
    team: data.team,
  });
  sendFullState(socket, data.roomCode);
}

function unregisterSocket(socket, io) {
  const binding = socketBindings.get(socket.id);
  if (!binding) return;
  const roomCode = binding.roomCode;

  socketBindings.delete(socket.id);

  const stillInRoom = [...socketBindings.values()].some(
    (b) => b.roomCode === roomCode
  );
  if (!stillInRoom) {
    hostMigration.startHostMigration(roomCode, async () => {
      const room = await Room.findOne({ roomCode }).lean();
      if (!room || room.status === ROOM_STATUS.ENDED) return;

      io.to(roomCode).emit("host_migration_vote", {
        message: "Admin disconnected. Anyone can claim host.",
      });
    });
  }
}

async function sendFullState(socket, roomCode) {
  try {
    const room = await Room.findOne({ roomCode }).lean();
    if (!room) {
      return socket.emit("full_state", { error: "Room not found" });
    }

    const players = await RoomPlayer.find({ roomCode }).lean();
    const chatMessages = await ChatMessage.find({ roomCode })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    const auction = getRoomAuction(roomCode);
    const isAdminUser =
      room.adminUserId === socketBindings.get(socket.id)?.userId;

    socket.emit("full_state", {
      room: {
        roomCode: room.roomCode,
        mode: room.mode,
        status: room.status,
        adminUserId: room.adminUserId,
        settings: room.settings,
      },
      players:
        auction && auction.machine
          ? [...auction.teamPlayerMap.entries()].map(([userId, tp]) => ({
              userId,
              team: tp.team,
              purseRemaining: tp.purseRemaining,
              overseasUsed: tp.overseasUsed,
              totalPlayers: tp.totalPlayers,
              rtmCards: tp.rtmCards,
            }))
          : players.map((p) => ({
              userId: p.userId,
              team: p.team,
              purseRemaining: p.purseRemaining,
              overseasUsed: p.overseasUsed,
              totalPlayers: p.totalPlayers,
              rtmCards: p.rtmCardsRemaining,
            })),
      isAdmin: isAdminUser,
      chatMessages: chatMessages.reverse(),
      auctionState: auction
        ? aService.getFullState(auction.machine, auction.teamPlayerMap)
        : null,
    });
  } catch (err) {
    socket.emit("full_state", { error: "Failed to load room state" });
  }
}

const socketRouter = (io) => {
  io.on("connection", (socket) => {
    socket.on("join_room", async (data) => {
      try {
        const { roomCode, team, userId } = data;
        if (!roomCode || !team || !userId) {
          return socket.emit("join_result", {
            success: false,
            error: "Missing required fields",
          });
        }

        const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
        if (!room) {
          return socket.emit("join_result", {
            success: false,
            error: "Room not found",
          });
        }

        registerSocket(io, socket, {
          roomCode: roomCode.toUpperCase(),
          userId,
          team,
        });

        socket.emit("join_result", {
          success: true,
          roomCode: roomCode.toUpperCase(),
        });

        const players = await RoomPlayer.find({
          roomCode: roomCode.toUpperCase(),
        }).lean();
        io.to(roomCode.toUpperCase()).emit("player_joined", {
          players: players.map((p) => ({ userId: p.userId, team: p.team })),
        });
      } catch (err) {
        socket.emit("join_result", { success: false, error: "Join failed" });
      }
    });

    socket.on("leave_room", async (data) => {
      const { roomCode } = data || {};
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      if (binding) {
        const rc = binding.roomCode;
        socket.leave(rc);
        socketBindings.delete(socket.id);
        io.to(rc).emit("player_left", { userId: binding.userId });
      }
    });

    socket.on("start_auction", async (data) => {
      const { roomCode } = data;
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      if (!binding || !(await isAdmin(binding))) {
        return socket.emit("error", {
          message: "Only the admin can start the auction",
          code: "NOT_ADMIN",
        });
      }

      try {
        const room = await Room.findOne({ roomCode });
        if (!room) return;
        const roomPlayers = await RoomPlayer.find({ roomCode }).lean();

        await Room.findOneAndUpdate(
          { roomCode },
          { $set: { status: ROOM_STATUS.LIVE } }
        );

        const { machine, teamPlayerMap } = aService.createMachine(
          roomCode,
          room.mode,
          room.settings,
          roomPlayers
        );

        io.to(roomCode).emit("auction_started", {
          mode: room.mode,
          settings: room.settings,
          totalPlayers: machine.playerPool.length,
        });

        aService.servePlayer(machine, teamPlayerMap, io);
      } catch (err) {
        console.error("Start auction error:", err.message);
        socket.emit("error", {
          message: "Failed to start auction",
          code: "SERVER_ERROR",
        });
      }
    });

    socket.on("place_bid", async (data) => {
      const { roomCode, seq } = data;
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      if (!binding) return;
      if (!shouldProcess(socket.id, seq)) return;

      if (!rateLimitCheck(pendingBidTimes, socket.id, 500)) {
        return socket.emit("bid_error", {
          message: "Please wait before bidding again",
          code: "RATE_LIMITED",
        });
      }

      const auction = getRoomAuction(roomCode);
      if (!auction) {
        return socket.emit("bid_error", {
          message: "Auction not active",
          code: "AUCTION_NOT_LIVE",
        });
      }

      const result = aService.applyBid(
        auction.machine,
        auction.teamPlayerMap,
        binding.userId,
        io
      );
      if (!result.success) {
        socket.emit("bid_error", {
          message: BID_ERROR_MESSAGES[result.errorCode] || result.errorCode,
          code: result.errorCode,
        });
      }
    });

    socket.on("advance_player", async (data) => {
      const { roomCode } = data;
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      if (!binding || !(await isAdmin(binding))) return;

      const auction = getRoomAuction(roomCode);
      if (!auction) return;

      aService.advanceAndServe(auction.machine, auction.teamPlayerMap, io);
    });

    socket.on("mark_sold", async (data) => {
      const { roomCode } = data;
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      if (!binding || !(await isAdmin(binding))) return;

      const auction = getRoomAuction(roomCode);
      if (!auction) return;

      aService.markSold(auction.machine, auction.teamPlayerMap, io);
    });

    socket.on("mark_unsold", async (data) => {
      const { roomCode } = data;
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      if (!binding || !(await isAdmin(binding))) return;

      const auction = getRoomAuction(roomCode);
      if (!auction) return;

      aService.markUnsold(auction.machine, auction.teamPlayerMap, io);
    });

    socket.on("undo", async (data) => {
      const { roomCode } = data;
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      if (!binding || !(await isAdmin(binding))) return;

      const auction = getRoomAuction(roomCode);
      if (!auction) return;

      const result = aService.undoLastAction(
        auction.machine,
        auction.teamPlayerMap,
        io
      );
      if (!result.success) {
        socket.emit("error", {
          message: result.error || "Undo failed",
          code: "UNDO_FAILED",
        });
      }
    });

    socket.on("exercise_rtm", async (data) => {
      const { roomCode } = data;
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      if (!binding) return;

      const auction = getRoomAuction(roomCode);
      if (!auction) return;

      const result = aService.exerciseRTM(
        auction.machine,
        auction.teamPlayerMap,
        binding.userId,
        io
      );
      if (!result.success) {
        socket.emit("rtm_error", { message: result.error || "RTM failed" });
      }
    });

    socket.on("pause_auction", async (data) => {
      const { roomCode } = data;
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      if (!binding || !(await isAdmin(binding))) return;

      const auction = getRoomAuction(roomCode);
      if (!auction) return;

      aService.pauseAuction(auction.machine, io);
      await Room.findOneAndUpdate(
        { roomCode },
        { $set: { status: ROOM_STATUS.PAUSED } }
      );
    });

    socket.on("resume_auction", async (data) => {
      const { roomCode } = data;
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      if (!binding || !(await isAdmin(binding))) return;

      const auction = getRoomAuction(roomCode);
      if (!auction) return;

      aService.resumeAuction(auction.machine, auction.teamPlayerMap, io);
      await Room.findOneAndUpdate(
        { roomCode },
        { $set: { status: ROOM_STATUS.LIVE } }
      );
    });

    socket.on("update_settings", async (data) => {
      const { roomCode, settings } = data;
      if (!roomCode || !settings) return;
      const binding = socketBindings.get(socket.id);
      if (!binding || !(await isAdmin(binding))) return;

      const auction = getRoomAuction(roomCode);
      if (auction) {
        aService.updateSettings(auction.machine, settings, io);
      }

      try {
        await Room.findOneAndUpdate(
          { roomCode },
          { $set: { settings: { ...settings } } }
        );
      } catch (err) {
        console.error("Settings update DB error:", err.message);
      }
    });

    socket.on("chat_message", async (data) => {
      const { roomCode, message } = data;
      if (!roomCode || !message) return;
      const binding = socketBindings.get(socket.id);
      if (!binding) return;

      if (!rateLimitCheck(pendingChatTimes, socket.id, 200)) return;

      const cleanMsg = String(message)
        .replace(/<[^>]*>/g, "")
        .substring(0, 500);
      if (!cleanMsg.trim()) return;

      const msgDoc = {
        roomCode,
        userId: binding.userId,
        userName: binding.userId,
        message: cleanMsg,
        type: "chat",
        timestamp: new Date(),
      };

      try {
        await ChatMessage.create(msgDoc);
      } catch (err) {
        console.error("Chat persist error:", err.message);
      }

      io.to(roomCode).emit("chat_message", msgDoc);
    });

    socket.on("claim_host", async (data) => {
      const { roomCode } = data;
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      if (!binding) return;

      const migrated = await hostMigration.migrateHost(
        roomCode,
        binding.userId,
        io
      );
      if (!migrated) {
        socket.emit("error", {
          message: "Host migration failed",
          code: "MIGRATION_FAILED",
        });
      }
    });

    socket.on("fetch_state", async (data) => {
      const { roomCode } = data || {};
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      let rc = roomCode;
      if (binding && binding.roomCode) rc = binding.roomCode;

      await sendFullState(socket, rc);
    });

    socket.on("end_auction", async (data) => {
      const { roomCode } = data;
      if (!roomCode) return;
      const binding = socketBindings.get(socket.id);
      if (!binding || !(await isAdmin(binding))) return;

      const auction = getRoomAuction(roomCode);
      if (!auction) return;

      await aService.endAuctionInternal(
        auction.machine,
        auction.teamPlayerMap,
        io
      );
    });

    socket.on("disconnect", () => {
      try {
        unregisterSocket(socket, io);
        clearSocket(socket.id);
      } catch (e) {
        console.error("Socket disconnect handler error:", e.message);
      }
    });
  });
};

module.exports = socketRouter;
