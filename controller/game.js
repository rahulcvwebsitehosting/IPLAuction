const squadData = require("../data/squads.json");
const Auction = require("./auction");

const squads = squadData;

const liveAuctions = new Map();

const registerSocket = (auction, socket) => {
  auction.addSocket(socket);
  socket.on("disconnect", () => {
    auction.removeSocket(socket.id);
  });
};

const create = (io, socket, data) => {
  if (!data.room || !data.username) {
    return socket.emit("create-result", {
      success: false,
      error: "Room and username are required.",
    });
  }

  if (liveAuctions.has(data.room)) {
    return socket.emit("create-result", {
      success: false,
      error: "Room already exists.",
    });
  }

  socket.join(data.room);
  const auction = new Auction(io, data.room);
  auction.creator = data.username;
  auction.addUser(data.username);
  registerSocket(auction, socket);
  liveAuctions.set(data.room, auction);
  auction.emitToRoom("users", {
    users: auction.users,
  });
  socket.emit("create-result", {
    success: true,
    room: data.room,
  });
};

const join = (io, socket, data) => {
  if (!data.room || !data.username) {
    return socket.emit("join-result", {
      success: false,
      error: "Room and username are required.",
    });
  }

  const auction = liveAuctions.get(data.room);
  if (!auction) {
    return socket.emit("join-result", {
      success: false,
      error: "Room does not exist!!",
    });
  }
  auction.addUser(data.username);
  socket.join(data.room);
  registerSocket(auction, socket);
  socket.emit("join-result", {
    success: true,
    room: data.room,
    error: "",
  });
  auction.emitToRoom("users", {
    users: auction.users,
  });

  if (auction.started) {
    socket.emit("start", { player: auction.getCurrentPlayer() });
  }
};

const play = (data) => {
  const auction = liveAuctions.get(data.room);
  if (!auction) {
    return;
  }
  if (data.user && auction.creator !== data.user) {
    return;
  }
  auction.startAuction();
  const firstSquad = squads[auction.squad];
  const firstPlayer = firstSquad && firstSquad.players[auction.player];
  if (firstPlayer) {
    auction.currentPlayer = firstPlayer;
  }
  auction.emitToRoom("start", { player: auction.getCurrentPlayer() });
  auction.servePlayer(squads);
  auction.startInterval();
};

const bid = (socket, data) => {
  if (!data.room || !data.user) {
    return socket.emit("bid-error", {
      message: "Invalid bid request.",
    });
  }

  const auction = liveAuctions.get(data.room);
  if (!auction) {
    return socket.emit("bid-error", {
      message: "Room does not exist.",
    });
  }

  auction.bid(socket, data.user);
  auction.displayBidder();
};

const next = (io, data) => {
  const auction = liveAuctions.get(data.room);
  if (!auction) {
    return;
  }
  auction.next(squads, liveAuctions, data.room);
};

const checkUser = (socket, user) => {
  if (!user || !user.username) {
    return socket.emit("no-existing-user");
  }

  let toBeFound = null;
  let room = null;

  for (let [key, value] of liveAuctions) {
    const find = value.findUser(user.username);
    if (find) {
      toBeFound = find;
      room = key;
      break;
    }
  }

  if (toBeFound && room) {
    const auction = liveAuctions.get(room);
    if (!auction) {
      return socket.emit("no-existing-user");
    }
    socket.join(room);
    registerSocket(auction, socket);
    socket.emit("existing-user", {
      room: room,
      users: auction.fetchPlayers(),
      initial: auction.getCurrentPlayer(),
      started: auction.getStatus(),
      starter: auction.creator === user.username,
    });
  } else {
    socket.emit("no-existing-user");
  }
};

const serverUsers = (io, room) => {
  const auction = liveAuctions.get(room);
  if (!auction) {
    return;
  }
  auction.emitToRoom("users", {
    users: auction.users,
  });
};

const fetchState = (socket, data) => {
  if (!data || !data.room) {
    return;
  }
  const auction = liveAuctions.get(data.room);
  if (!auction) {
    return;
  }
  const bid = auction.getCurrentBid();
  socket.emit("server-details", {
    bidder: bid.bidder,
    amount: bid.bid,
    player: auction.getCurrentPlayer(),
    timer: auction.timer,
  });
};

const exitUser = (io, data) => {
  if (!data || !data.room || !data.user) {
    return;
  }

  const auction = liveAuctions.get(data.room);
  if (!auction) {
    return;
  }

  auction.removeUser(data.user);
  if (auction.users.length === 0) {
    liveAuctions.delete(data.room);
  }
  serverUsers(io, data.room);
};

module.exports = {
  create,
  join,
  play,
  bid,
  next,
  checkUser,
  serverUsers,
  exitUser,
  fetchState,
};
