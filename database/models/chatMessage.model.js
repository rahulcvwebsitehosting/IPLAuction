const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ["chat", "system", "bid_alert"],
    default: "chat",
  },
  timestamp: { type: Date, default: Date.now },
});

chatMessageSchema.index({ roomCode: 1, timestamp: 1 });
chatMessageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
