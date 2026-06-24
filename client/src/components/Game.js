import { useEffect, useState, useRef } from "react";
import PlayerCard from "./PlayerCard";
import UserAccordian from "./UserAccordian";
import { useHistory } from "react-router-dom";
import { saveAuction } from "../services/auction.service";

const Game = ({ users, socket, room, user, initial }) => {
  const [timer, setTimer] = useState(-1);
  const [bidder, setBidder] = useState("");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState(0);
  const [player, setPlayer] = useState(initial);
  const [displayNext, setNext] = useState(false);
  let history = useHistory();

  // Keep the latest users/user in refs so one-time listeners can read current
  // values without re-registering on every render.
  const usersRef = useRef(users);
  usersRef.current = users;
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    socket.emit("fetch-details");
    const onServerDetails = (data) => {
      setBidder(data.bidder);
      setAmount(data.amount);
    };
    socket.on("server-details", onServerDetails);
    return () => {
      socket.off("server-details", onServerDetails);
    };
  }, [socket]);

  useEffect(() => {
    const onDisplay = (data) => {
      setTimer(data.time);
    };

    const onBid = (data) => {
      setBidder(data.currentBidder.bidder);
      setAmount(data.currentBidder.bid);
    };

    const onBidError = (data) => {
      setError(data.message);
    };

    const onPlayer = (data) => {
      setPlayer(data.player);
    };

    const onGameOver = () => {
      // Persist the finished auction to localStorage for the logged-in
      // user (replaces the old backend save keyed by username).
      const finalUsers = usersRef.current;
      const currentUser = userRef.current;
      if (currentUser && currentUser.username && finalUsers.length > 0) {
        saveAuction(currentUser.username, finalUsers);
      }
      history.push("/auctions/played");
    };

    socket.on("display", onDisplay);
    socket.on("bid", onBid);
    socket.on("bid-error", onBidError);
    socket.on("player", onPlayer);
    socket.on("game-over", onGameOver);

    return () => {
      socket.off("display", onDisplay);
      socket.off("bid", onBid);
      socket.off("bid-error", onBidError);
      socket.off("player", onPlayer);
      socket.off("game-over", onGameOver);
    };
  }, [socket, history]);

  useEffect(() => {
    if (timer === 0) {
      setBidder("");
      setAmount(0);
      setNext(true);
    } else {
      setNext(false);
    }
  }, [timer]);

  const bid = () => {
    if (timer > 0 && user && user.username) {
      socket.emit("bid", {
        room,
        user: user.username,
      });
    }
  };

  const next = () => {
    if (!user || !user.username) return;
    socket.emit("next", {
      room,
      user: user.username,
    });
    setNext(false);
  };

  return (
    <div className="game">
      <div className="game-main">
        {player ? <PlayerCard {...player} /> : ""}
        <div className="game-main-content">
          <div
            className={`game-timer ${timer > 0 ? "animate-timer" : ""} 
          ${
            timer < 7 && timer >= 4
              ? "timer-yellow"
              : timer < 4
              ? "timer-red"
              : ""
          }`}
          >
            {timer >= 0 ? timer : ""}
          </div>
          <div className="game-info">
            <div className="game-info-bidder">
              <div className="same-line">
                <p>Highest Bidder :</p> <p className="bidder">{bidder}</p>
              </div>
              <div className="same-line">
                <p>Bid Amount :</p> <p className="amount">{amount}cr</p>
              </div>
            </div>
            <div className="game-info-budgets">
              Budgets Remaining :
              {users.map((user, index) => {
                return (
                  <div className="same-line" key={index}>
                    <p className="bidder">{user.user}</p>{" "}
                    <p className="amount">{user.budget}cr</p>
                  </div>
                );
              })}
            </div>
            <div className="game-buttons">
              <button
                onClick={() => {
                  bid();
                }}
                className="button"
              >
                Bid
              </button>
              {displayNext ? (
                <button
                  onClick={() => {
                    next();
                  }}
                  className="button"
                >
                  Next
                </button>
              ) : (
                ""
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="users-info">
        {users.map((user) => {
          return <UserAccordian key={user.user} {...user} />;
        })}
      </div>
      {error ? <div className="error">{error}</div> : ""}
    </div>
  );
};

export default Game;
