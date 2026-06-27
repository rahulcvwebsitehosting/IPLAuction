const mongoose = require("mongoose");

const auctionResultSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, unique: true, index: true },
    mode: { type: String, required: true },
    completedAt: { type: Date, default: Date.now },
    players: [
      {
        playerId: String,
        name: String,
        role: String,
        nationality: String,
        basePrice: Number,
        soldTo: { type: String, default: null },
        soldAmount: { type: Number, default: null },
        status: {
          type: String,
          enum: ["sold", "unsold", "retained", "rtm"],
          required: true,
        },
      },
    ],
    teams: [
      {
        userId: String,
        team: String,
        purseSpent: Number,
        playersBought: Number,
        finalSquad: [String],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuctionResult", auctionResultSchema);
