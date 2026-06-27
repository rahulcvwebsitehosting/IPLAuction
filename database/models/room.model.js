const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, unique: true, index: true },
    adminUserId: { type: String, required: true },
    status: {
      type: String,
      enum: ["WAITING", "LIVE", "PAUSED", "ENDED"],
      default: "WAITING",
    },
    mode: {
      type: String,
      enum: ["mock_2026", "legends_upgraded", "legends_top100", "mega"],
      required: true,
    },
    settings: {
      timerDuration: { type: Number, default: 10 },
      timerReset: { type: Number, default: 5 },
      maxDuration: { type: Number, default: 20 },
      bidIncrementMode: { type: String, default: "tiered" },
      maxSquadSize: { type: Number, default: 25 },
      minSquadSize: { type: Number, default: 18 },
      overseasLimit: { type: Number, default: 8 },
      basePurse: { type: Number, default: 12000 },
      rtmCards: { type: Number, default: 3 },
      maxRecallRounds: { type: Number, default: 3 },
      autoAdvance: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

roomSchema.index({ status: 1 });
roomSchema.index({ adminUserId: 1 });

module.exports = mongoose.model("Room", roomSchema);
