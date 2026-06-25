const User = require("./user");
const dbUser = require("../database/models/user.model");

class Auction {
  constructor(io, roomName) {
    this.users = [];
    this.currentBidder = "";
    this.currentBid = 0;
    this.currentPlayer = "";
    this.timer = 10;
    this.interval = null;
    this.io = io;
    this.roomName = roomName;
    this.squad = 0;
    this.player = 0;
    this.confirm = 0;
    this.started = false;
  }

  // Broadcast to everyone in the room. io.to(room).emit() is the correct,
  // reliable way to reach all sockets in a room in socket.io (including the
  // sender's own socket, since every player is a separate connection here).
  emitToRoom(event, data) {
    this.io.to(this.roomName).emit(event, data);
  }

  // Send to a single socket (used for errors that should only reach the
  // bidder who triggered them).
  emitToSocket(socket, event, data) {
    if (socket && socket.emit) {
      socket.emit(event, data);
    }
  }

  startAuction() {
    this.started = true;
  }

  getStatus() {
    return this.started;
  }

  bid(socket, bidder) {
    if (this.currentBidder === bidder) {
      return;
    }

    const user = this.findUser(bidder);
    if (!user) {
      return this.emitToSocket(socket, "bid-error", {
        message: "Bidder not found.",
      });
    }

    if (this.currentBid >= 5) {
      if (user.budget < this.currentBid + 1) {
        return this.emitToSocket(socket, "bid-error", {
          message: "The current bid exceeds your budget.",
        });
      }
      this.currentBid += 1;
    } else {
      if (user.budget < this.currentBid + 0.5) {
        return this.emitToSocket(socket, "bid-error", {
          message: "The current bid exceeds your budget.",
        });
      }
      this.currentBid += 0.5;
    }
    this.currentBidder = bidder;
    this.resetTimer();
  }

  findUser(user) {
    const currentUser = this.users.find((u) => {
      return u.user === user;
    });
    return currentUser;
  }

  servePlayer(squads) {
    const squad = squads[this.squad];
    if (!squad || !squad.players || !squad.players[this.player]) {
      // Squad/player index is out of range — this would silently leave
      // joiners staring at a blank screen. Emit a clear error instead.
      console.error(
        `servePlayer: no player at squad[${this.squad}].players[${this.player}]`
      );
      this.emitToRoom("bid-error", {
        message: "No more players available.",
      });
      return;
    }
    const player = squad.players[this.player];
    this.currentPlayer = player;
    this.emitToRoom("player", { player });
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getCurrentBid() {
    const bidder = {
      bidder: this.currentBidder,
      bid: this.currentBid,
    };
    return bidder;
  }

  displayBidder() {
    const currentBidder = this.getCurrentBid();
    this.emitToRoom("bid", { currentBidder });
  }

  resetBid() {
    this.currentBidder = "";
    this.currentBid = 0;
  }

  resetTimer() {
    this.timer = 10;
    this.confirm = 0;
  }

  clearTimer() {
    clearInterval(this.interval);
  }

  startInterval() {
    const currObj = this;
    this.interval = setInterval(() => {
      currObj.decrementClock();
    }, 1000);
  }

  decrementClock() {
    if (this.timer === 0) {
      if (this.currentBidder) {
        this.addPlayer(this.currentPlayer, this.currentBid);
      }
      this.clearTimer();
      this.resetBid();
    }
    const time = this.timer;
    this.emitToRoom("display", { time });
    this.timer--;
  }

  async gameOver(squads, liveAuctions, room) {
    this.player++;
    const currentSquad = squads[this.squad];
    if (!currentSquad || currentSquad.players.length === this.player) {
      this.player = 0;
      this.squad++;
      if (this.squad >= squads.length) {
        this.emitToRoom("game-over");
        if (dbUser && dbUser.findOneAndUpdate) {
          try {
            for (const u of this.users) {
              await dbUser.findOneAndUpdate(
                { username: u.user },
                { $push: { auctions: { auction: this.users } } }
              );
            }
          } catch (error) {
            console.log(error);
          }
        }
        liveAuctions.delete(room);
        return true;
      }
    }
    return false;
  }

  addUser(user) {
    if (!this.dupUser(user)) this.users.push(new User(user));
  }

  removeUser(user) {
    this.users = this.users.filter((u) => user !== u.user);
  }

  dupUser(user) {
    const dup = this.users.filter((u) => user === u.user);
    if (dup.length === 0) {
      return false;
    }
    return true;
  }

  async next(squads, liveAuctions, room) {
    this.confirm++;
    if (this.confirm >= this.users.length) {
      if (!(await this.gameOver(squads, liveAuctions, room))) {
        this.resetTimer();
        this.resetBid();
        this.startInterval();
        this.servePlayer(squads);
      }
    }
  }

  addPlayer(player, amount) {
    const currentUser = this.findUser(this.currentBidder);
    if (!currentUser) {
      return;
    }
    currentUser.addPlayer(player);
    currentUser.deduct(amount);
    this.confirm = 0;
    this.emitToRoom("users", { users: this.users });
  }

  fetchPlayers() {
    return this.users;
  }
}

module.exports = Auction;
