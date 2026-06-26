// Scenario: joiner joins AFTER game already started (the common real case).
// Also tests: joiner who refreshes mid-game (check-user -> existing-user -> play).

const { io } = require("socket.io-client");
const URL = "http://localhost:8000";
const ROOM = "late-" + Date.now();
const log = (w, ...a) => console.log(`[${w}]`, ...a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function track(socket, who) {
  [
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
  ].forEach((e) =>
    socket.on(e, (d) =>
      log(
        who,
        `<< "${e}"`,
        d === undefined ? "(no payload)" : JSON.stringify(d).slice(0, 80)
      )
    )
  );
}

(async () => {
  const creator = io(URL, { transports: ["websocket"] });
  track(creator, "CREATOR");
  await new Promise((r) => creator.on("connect", r));
  await wait(200);

  // Creator creates + immediately starts a game with themselves (simulate
  // a friend arriving late, after Start was pressed).
  creator.emit("createAuction", { username: "alice", room: ROOM });
  await wait(400);
  creator.emit("start", { room: ROOM });
  await wait(800);

  // NOW the joiner arrives — game is already running.
  console.log("\n=== JOINER ARRIVES AFTER GAME STARTED ===");
  const joiner = io(URL, { transports: ["websocket"] });
  track(joiner, "JOINER");
  await new Promise((r) => joiner.on("connect", r));
  await wait(200);

  log("JOINER", ">> check-user (fresh user, never joined)");
  joiner.emit("check-user", { user: { username: "bob" } });
  await wait(400);

  log("JOINER", ">> joinAuction (game already in progress)");
  joiner.emit("joinAuction", { username: "bob", room: ROOM });
  await wait(800);

  console.log("\n=== KEY QUESTION ===");
  console.log(
    "Did JOINER receive the current 'player' and ongoing 'display' (timer)?"
  );
  console.log("If not, late-joiners are stuck on a blank/broken screen.\n");

  creator.disconnect();
  joiner.disconnect();
  process.exit(0);
})();
