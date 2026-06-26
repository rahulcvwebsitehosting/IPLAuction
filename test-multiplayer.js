// Integration test: connects a creator + joiner socket to the running backend
// and logs every event each receives. Run the backend on :8000 first:
//   NODE_ENV=production PORT=8000 node app.js
// then in another terminal: node test-multiplayer.js

const { io } = require("socket.io-client");

const URL = "http://localhost:8000";
const ROOM = "test-room-" + Date.now();

const log = (who, ...args) => console.log(`[${who}]`, ...args);

// Listen for the events the Game/Lobby components care about
function attach(socket, who) {
  const received = [];
  const events = [
    "users",
    "create-result",
    "join-result",
    "start",
    "player",
    "display",
    "bid",
    "bid-error",
    "game-over",
    "server-details",
    "existing-user",
    "no-existing-user",
  ];
  events.forEach((evt) => {
    socket.on(evt, (data) => {
      received.push(evt);
      log(who, `RECEIVED "${evt}"`, JSON.stringify(data).slice(0, 120));
    });
  });
  socket.on("disconnect", (r) => log(who, "disconnected:", r));
  socket.on("connect_error", (e) => log(who, "connect_error:", e.message));
  return received;
}

(async () => {
  console.log("=== connecting sockets ===");
  const creator = io(URL, { transports: ["websocket"] });
  const joiner = io(URL, { transports: ["websocket"] });

  attach(creator, "CREATOR");
  attach(joiner, "JOINER");

  // Wait for both to connect
  await Promise.all([
    new Promise((r) => creator.on("connect", r)),
    new Promise((r) => joiner.on("connect", r)),
  ]);
  log("SYSTEM", "both connected");
  await wait(300);

  // 1. Creator creates the room
  console.log("\n=== STEP 1: creator creates room ===");
  creator.emit("createAuction", { username: "creator", room: ROOM });
  await wait(500);

  // 2. Joiner joins the room
  console.log("\n=== STEP 2: joiner joins room ===");
  joiner.emit("joinAuction", { username: "joiner", room: ROOM });
  await wait(500);

  // 3. Creator starts the game
  console.log("\n=== STEP 3: creator starts game ===");
  creator.emit("start", { room: ROOM });
  await wait(1500);

  console.log("\n=== RESULTS ===");
  console.log("Backend running at:", URL, "room:", ROOM);
  console.log(
    "If JOINER did not receive 'start' and 'player', that's the bug.\n"
  );

  creator.disconnect();
  joiner.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error("TEST ERROR:", e);
  process.exit(1);
});

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
