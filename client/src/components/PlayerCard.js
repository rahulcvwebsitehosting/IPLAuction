import React from "react";
import TimerDisplay from "./TimerDisplay";
import { formatCurrency } from "../utilities/currency";

export default function PlayerCard({
  player,
  currentBid,
  timerRemaining,
  maxTimer,
  playerState,
  bidderTeam,
  round,
}) {
  if (!player) {
    return (
      <div className="player-card empty">
        <div className="player-waiting">Waiting for next player...</div>
      </div>
    );
  }

  const statusClass = (playerState || "").toLowerCase().replace("_", "-");

  return (
    <div className="player-card">
      <div className="player-card-inner">
        <div className="player-image-wrapper">
          {player.image ? (
            <img
              src={player.image}
              alt={player.name}
              className="player-image"
            />
          ) : (
            <div className="player-image-placeholder">
              {player.name?.charAt(0)}
            </div>
          )}
          <div className={`player-status-ring ${statusClass}`} />
        </div>
        <div className="player-info">
          <h2 className="player-name">{player.name}</h2>
          <div className="player-meta">
            <span className="player-role">{player.role}</span>
            <span className="player-nationality">{player.nationality}</span>
          </div>
          <div className="player-base">
            Base: {formatCurrency(player.basePrice || 20)}
          </div>
          {currentBid > 0 && (
            <div className="player-current-bid">
              Current Bid: <strong>{formatCurrency(currentBid)}</strong>
              {bidderTeam && (
                <span className="bidder-label"> by {bidderTeam}</span>
              )}
            </div>
          )}
        </div>
        <div className="player-status-section">
          <TimerDisplay remaining={timerRemaining} max={maxTimer} />
          <div className={`player-status-badge ${statusClass}`}>
            {playerState === "SOLD"
              ? "SOLD"
              : playerState === "UNSOLD"
              ? "UNSOLD"
              : playerState === "BIDDING_ACTIVE"
              ? "BIDDING"
              : "OPEN"}
          </div>
          {round > 0 && <div className="recall-badge">Recall R{round}</div>}
        </div>
      </div>
    </div>
  );
}
