const schedule = require("node-schedule");
const squadData = require("../data/squads.json");
const getSquads = require("../utilities/players");
const Auction = require("./auction");

const liveAuctions = new Map();
let squads = squadData;

schedule.scheduleJob("fetching-squads", "0 0 * * *", () => {
  getSquads()
    .then((response) => {
      squads = response;
    })
    .catch((error) => {
      console.log(
        "Failed to fetch squads, falling back to local data.",
        error.message || error
      );
      squads = squadData;
    });
});

// Called while creating a game
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
  const auction = new Auction(io.to(data.room));
  auction.addUser(data.username);
  liveAuctions.set(data.room, auction);
  io.to(data.room).emit("users", {
    users: auction.users,
  });
  socket.emit("create-result", {
    success: true,
    room: data.room,
  });
};

// Called while joining a game
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
  socket.emit("join-result", {
    success: true,
    room: data.room,
    error: "",
  });
  io.to(data.room).emit("users", {
    users: auction.users,
  });
};

const start = (io, data) => {
  io.to(data.room).emit("start");
};

const play = (data) => {
  const auction = liveAuctions.get(data.room);
  if (!auction) {
    return;
  }
  auction.startAuction();
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
    socket.emit("existing-user", {
      room: room,
      users: auction.fetchPlayers(),
      initial: auction.getCurrentPlayer(),
      started: auction.getStatus(),
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
  io.to(room).emit("users", {
    users: auction.users,
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
  start,
  play,
  bid,
  next,
  checkUser,
  serverUsers,
  exitUser,
};
