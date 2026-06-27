import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";
import { UserContext } from "../hooks/UserContext";
import News from "../components/News";
import API from "../services/api.service";

export default function Home() {
  const { user } = useContext(UserContext);
  const history = useHistory();
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    if (!user) return history.push("/signup");
    setJoining(true);
    setJoinError("");
    try {
      const res = await API.getRoom(joinCode.trim().toUpperCase());
      if (res.success) {
        history.push(`/room/${joinCode.trim().toUpperCase()}`);
      } else {
        setJoinError(res.error || "Room not found");
      }
    } catch {
      setJoinError("Room not found");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="home-page">
      <div className="home-hero">
        <h1 className="home-title">IPL Auction</h1>
        <p className="home-subtitle">Real-time multiplayer auction platform</p>
      </div>

      <div className="home-cta-section">
        <div className="cta-buttons">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => history.push(user ? "/create-room" : "/signup")}
          >
            Create Auction Room
          </button>
        </div>

        <div className="join-section">
          <div className="join-divider">
            <span>or join existing room</span>
          </div>
          <form onSubmit={handleJoin} className="join-form">
            <input
              type="text"
              className="join-input"
              placeholder="Enter room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              disabled={joining}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={!joinCode.trim() || joining}
            >
              {joining ? "Joining..." : "Join"}
            </button>
          </form>
          {joinError && <div className="join-error">{joinError}</div>}
        </div>
      </div>

      {user && (
        <div className="home-user-info">
          Welcome back, <strong>{user.username}</strong>
        </div>
      )}

      <div className="home-features">
        <div className="feature-card">
          <div className="feature-icon">🏏</div>
          <div className="feature-title">Real-Time Bidding</div>
          <div className="feature-desc">
            Server-authoritative bids with drift-proof timers and instant
            updates
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">👥</div>
          <div className="feature-title">Multiplayer Rooms</div>
          <div className="feature-desc">
            Create or join rooms with up to 10 teams, each with a full IPL purse
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <div className="feature-title">4 Auction Modes</div>
          <div className="feature-desc">
            Mega Auction, IPL 2026 Mock, Legends Upgraded, and Legends Top 100
          </div>
        </div>
      </div>

      <div className="home-news-section">
        <News />
      </div>
    </div>
  );
}
