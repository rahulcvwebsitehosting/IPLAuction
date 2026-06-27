const mongoose = require("mongoose");

const roomPlayerSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    team: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    purseRemaining: { type: Number, default: 12000 },
    overseasUsed: { type: Number, default: 0 },
    totalPlayers: { type: Number, default: 0 },
    rtmCardsRemaining: { type: Number, default: 3 },
    squad: [{ type: mongoose.Schema.Types.Mixed }],
  },
  { timestamps: true }
);

roomPlayerSchema.index({ roomCode: 1, userId: 1 }, { unique: true });
roomPlayerSchema.index({ roomCode: 1, team: 1 }, { unique: true });

module.exports = mongoose.model("RoomPlayer", roomPlayerSchema);
