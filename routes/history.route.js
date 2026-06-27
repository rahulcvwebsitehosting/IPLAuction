const express = require("express");
const router = express.Router();
const AuctionResult = require("../database/models/auctionResult.model");

router.get("/api/history/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const rooms = await AuctionResult.find({
      "teams.userId": username,
    })
      .sort({ completedAt: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, auctions: rooms });
  } catch (err) {
    console.error("History fetch error:", err.message);
    res.status(500).json({ success: false, error: "Failed to fetch history" });
  }
});

router.get("/api/rooms/:code/export", async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const format = req.query.format || "json";

    const result = await AuctionResult.findOne({ roomCode: code }).lean();
    if (!result) {
      return res
        .status(404)
        .json({ success: false, error: "Auction results not found" });
    }

    if (format === "csv") {
      const headers =
        "Player Name,Role,Nationality,Base Price (L),Sold To,Sold Amount (L),Status\n";
      const rows = result.players
        .map(
          (p) =>
            `"${p.name}",${p.role},${p.nationality},${p.basePrice},${
              p.soldTo || "Unsold"
            },${p.soldAmount || 0},${p.status}`
        )
        .join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=auction_${code}.csv`
      );
      return res.send(headers + rows);
    }

    res.json({ success: true, result });
  } catch (err) {
    console.error("Export error:", err.message);
    res.status(500).json({ success: false, error: "Export failed" });
  }
});

module.exports = router;
