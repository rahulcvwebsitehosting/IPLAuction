const mongoose = require("mongoose");

const auctionLogSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, index: true },
  seq: { type: Number, required: true },
  event: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  actor: { type: String, default: "system" },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
});

auctionLogSchema.index({ roomCode: 1, seq: 1 }, { unique: true });
auctionLogSchema.index({ roomCode: 1, timestamp: 1 });

module.exports = mongoose.model("AuctionLog", auctionLogSchema);
