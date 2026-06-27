import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";
import { UserContext } from "../hooks/UserContext";
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
    } catch (err) {
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
      <div className="home-actions">
        <button
          className="btn btn-primary btn-lg"
          onClick={() => history.push(user ? "/create-room" : "/signup")}
        >
          Create Room
        </button>
        <div className="join-section">
          <span className="join-or">or</span>
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
              {joining ? "Joining..." : "Join Room"}
            </button>
          </form>
          {joinError && <div className="join-error">{joinError}</div>}
        </div>
      </div>
      {user && (
        <div className="home-user-info">
          Logged in as <strong>{user.username}</strong>
        </div>
      )}
    </div>
  );
}
