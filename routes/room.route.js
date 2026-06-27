const express = require("express");
const router = express.Router();
const Room = require("../database/models/room.model");
const RoomPlayer = require("../database/models/roomPlayer.model");
const {
  generateRoomCode,
  releaseRoomCode,
} = require("../utilities/generateCode");
const {
  DEFAULT_SETTINGS,
  MODES,
  ROOM_CODE_REGEX,
  MAX_PLAYERS_PER_ROOM,
} = require("../config/constants");

router.post("/api/rooms/create", async (req, res) => {
  try {
    const { mode, team, username } = req.body;
    if (!mode || !MODES[mode]) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid auction mode" });
    }
    if (!team) {
      return res
        .status(400)
        .json({ success: false, error: "Team is required" });
    }
    if (!username) {
      return res
        .status(400)
        .json({ success: false, error: "Username is required" });
    }

    const roomCode = generateRoomCode();

    await Room.create({
      roomCode,
      adminUserId: username,
      mode,
      status: "WAITING",
      settings: { ...DEFAULT_SETTINGS },
    });

    await RoomPlayer.create({
      roomCode,
      userId: username,
      team,
      purseRemaining: DEFAULT_SETTINGS.basePurse,
      rtmCardsRemaining: DEFAULT_SETTINGS.rtmCards,
    });

    res.json({ success: true, roomCode });
  } catch (err) {
    console.error("Room creation error:", err.message);
    if (err.code === 11000) {
      releaseRoomCode(err.keyValue?.roomCode);
      return res
        .status(409)
        .json({
          success: false,
          error: "Room code collision, please try again",
        });
    }
    res.status(500).json({ success: false, error: "Failed to create room" });
  }
});

router.get("/api/rooms/:code", async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    if (!ROOM_CODE_REGEX.test(code)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid room code format" });
    }

    const room = await Room.findOne({ roomCode: code }).lean();
    if (!room) {
      return res.status(404).json({ success: false, error: "Room not found" });
    }

    const players = await RoomPlayer.find({ roomCode: code }).lean();
    const teamsTaken = players.map((p) => p.team);

    res.json({
      success: true,
      room: {
        roomCode: room.roomCode,
        mode: room.mode,
        status: room.status,
        settings: room.settings,
      },
      players: players.map((p) => ({ userId: p.userId, team: p.team })),
      teamsTaken,
    });
  } catch (err) {
    console.error("Room fetch error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch room" });
  }
});

router.post("/api/rooms/:code/join", async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { team, username } = req.body;

    if (!ROOM_CODE_REGEX.test(code)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid room code format" });
    }
    if (!team || !username) {
      return res
        .status(400)
        .json({ success: false, error: "Team and username are required" });
    }

    const room = await Room.findOne({ roomCode: code });
    if (!room) {
      return res.status(404).json({ success: false, error: "Room not found" });
    }
    if (room.status !== "WAITING") {
      return res
        .status(400)
        .json({ success: false, error: "Room is not accepting players" });
    }

    const playerCount = await RoomPlayer.countDocuments({ roomCode: code });
    if (playerCount >= MAX_PLAYERS_PER_ROOM) {
      return res
        .status(400)
        .json({ success: false, error: "Room is full (max 10 players)" });
    }

    const existingTeam = await RoomPlayer.findOne({ roomCode: code, team });
    if (existingTeam) {
      return res
        .status(409)
        .json({ success: false, error: `${team} is already taken` });
    }

    await RoomPlayer.create({
      roomCode: code,
      userId: username,
      team,
      purseRemaining: room.settings.basePurse || DEFAULT_SETTINGS.basePurse,
      rtmCardsRemaining: room.settings.rtmCards || DEFAULT_SETTINGS.rtmCards,
    });

    res.json({ success: true, roomCode: code });
  } catch (err) {
    console.error("Room join error:", err.message);
    res.status(500).json({ success: false, error: "Failed to join room" });
  }
});

router.get("/api/rooms/:code/validate-team", async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const team = req.query.team;
    if (!team)
      return res
        .status(400)
        .json({ success: false, error: "Team query parameter required" });

    const existing = await RoomPlayer.findOne({ roomCode: code, team });
    if (existing) {
      return res.json({
        available: false,
        message: `${team} is already taken`,
      });
    }
    res.json({ available: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Validation failed" });
  }
});

router.get("/api/modes", (_req, res) => {
  res.json({ success: true, modes: MODES });
});

module.exports = router;
