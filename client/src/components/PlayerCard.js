import React from "react";
import TimerDisplay from "./TimerDisplay";

function formatCurrency(lakhs) {
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(1)} Cr`;
  return `₹${lakhs} L`;
}

export default function PlayerCard({
  player,
  basePrice,
  currentBid,
  timerRemaining,
  maxTimer,
  playerState,
  highBidderId,
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

  return (
    <div className="player-card">
      <div className="player-image-wrapper">
        {player.image ? (
          <img src={player.image} alt={player.name} className="player-image" />
        ) : (
          <div className="player-image-placeholder">
            {player.name?.charAt(0)}
          </div>
        )}
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
        <div
          className={`player-status-badge ${(playerState || "").toLowerCase()}`}
        >
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
  );
}
