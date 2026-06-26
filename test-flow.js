// Deeper test: simulates EXACTLY what the React app does, including the
// "check-user" emit on mount (which the joiner does before joining a room).
// This reproduces the real client lifecycle.

const { io } = require("socket.io-client");

const URL = "http://localhost:8000";
const ROOM = "room-" + Date.now();
const log = (who, ...a) => console.log(`[${who}]`, ...a);

function track(socket, who) {
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
  events.forEach((e) =>
    socket.on(e, (d) => log(who, `<< "${e}"`, JSON.stringify(d).slice(0, 90)))
  );
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const creator = io(URL, { transports: ["websocket"] });
  const joiner = io(URL, { transports: ["websocket"] });
  track(creator, "CREATOR");
  track(joiner, "JOINER");

  await Promise.all([
    new Promise((r) => creator.on("connect", r)),
    new Promise((r) => joiner.on("connect", r)),
  ]);
  await wait(200);

  // ===== CREATOR lifecycle (matches React CreateAuction -> newAuction) =====
  log("CREATOR", ">> check-user (on mount, like React does)");
  creator.emit("check-user", { user: { username: "creator" } });
  await wait(300);
  log("CREATOR", ">> createAuction");
  creator.emit("createAuction", { username: "creator", room: ROOM });
  await wait(400);

  // ===== JOINER lifecycle (matches React: mount -> check-user -> Join button) =====
  log("JOINER", ">> check-user (on mount — joiner NOT in a room yet)");
  joiner.emit("check-user", { user: { username: "joiner" } });
  await wait(400); // backend says no-existing-user

  log("JOINER", ">> joinAuction (user clicked Join, typed room code)");
  joiner.emit("joinAuction", { username: "joiner", room: ROOM });
  await wait(500);

  // ===== CREATOR starts the game (Lobby Start button) =====
  log("CREATOR", ">> start");
  creator.emit("start", { room: ROOM });
  await wait(1500);

  console.log("\n=== DONE ===");
  creator.disconnect();
  joiner.disconnect();
  process.exit(0);
})();
