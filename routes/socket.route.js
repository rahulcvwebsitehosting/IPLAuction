const {
  create,
  join,
  play,
  bid,
  next,
  checkUser,
  serverUsers,
  exitUser,
  fetchState,
} = require("../controller/game");

const socketRouter = (io) => {
  io.on("connection", (socket) => {
    socket.on("check-user", ({ user }) => {
      checkUser(socket, user);
    });

    socket.on("createAuction", (data) => {
      create(io, socket, data);
    });

    socket.on("joinAuction", (data) => {
      join(io, socket, data);
    });

    socket.on("start", (data) => {
      play(data);
    });

    socket.on("bid", (data) => {
      bid(socket, data);
    });

    socket.on("next", (data) => {
      next(io, data);
    });

    socket.on("server-users", ({ room }) => {
      serverUsers(io, room);
    });

    socket.on("fetch-details", (data) => {
      fetchState(socket, data);
    });

    socket.on("exit", (data) => {
      exitUser(io, data);
    });
  });
};

module.exports = socketRouter;
