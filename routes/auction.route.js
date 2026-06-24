const express = require("express");
const User = require("../database/models/user.model");
const router = express.Router();
const { auth } = require("../middleware/auth");

router.get("/played-auctions", auth, async (req, res) => {
  try {
    const user = await User.findById(req.id);
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found.",
      });
    }
    res.status(200).send({
      success: true,
      message: "Fetched Users",
      auctions: user.auctions,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
