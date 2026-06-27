const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const socketio = require("socket.io");
const http = require("http");
const userRouter = require("./routes/user.route");
const newsRouter = require("./routes/news.route");
const auctionRouter = require("./routes/auction.route");
const roomRouter = require("./routes/room.route");
const historyRouter = require("./routes/history.route");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
require("./database/connection");

// Client origin is environment-driven so the backend can serve a frontend
// hosted on Vercel (or anywhere else). Falls back to the local dev server.
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const app = express();
const server = http.createServer(app);

const io = socketio(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});

//Middleware
app.use(cookieParser());
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));
app.use(express.json());

//Routes
app.use(userRouter);
app.use(newsRouter);
app.use(auctionRouter);
app.use(roomRouter);
app.use(historyRouter);

// Health check — Render pings this path after every deploy to confirm the
// service is up. It must return 200 even when the client build is absent
// (e.g. when only the backend is deployed and the frontend lives on Vercel).
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", service: "ipl-auction-backend" });
});

const clientBuildPath = path.resolve(
  __dirname,
  "client",
  "build",
  "index.html"
);
if (process.env.NODE_ENV === "production" && fs.existsSync(clientBuildPath)) {
  // Only serve the bundled frontend when it actually exists. When the
  // backend is deployed standalone, this block is skipped so unknown routes
  // fall through to the health/json response above instead of 404ing.
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(clientBuildPath);
  });
}

require("./routes/socket.route")(io);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
