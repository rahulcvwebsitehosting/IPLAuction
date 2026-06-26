// Clean test: fresh backend, fresh room, late joiner. No stale state.

const { io } = require("socket.io-client");
const URL = "http://localhost:8000";
const ROOM = "fresh-" + Date.now();
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

  creator.emit("createAuction", { username: "alice", room: ROOM });
  await wait(400);
  creator.emit("start", { room: ROOM });
  await wait(600);

  console.log("\n=== JOINER (fresh name 'newguy', game already running) ===");
  const joiner = io(URL, { transports: ["websocket"] });
  track(joiner, "JOINER");
  await new Promise((r) => joiner.on("connect", r));
  await wait(200);

  // Skip check-user (use a brand-new username that's in no room) and go
  // straight to join — this isolates the join() resync code.
  joiner.emit("joinAuction", { username: "newguy", room: ROOM });
  await wait(1000);

  console.log(
    "\n=== EXPECT: JOINER received 'start' AND 'player' from resync ==="
  );

  creator.disconnect();
  joiner.disconnect();
  process.exit(0);
})();
