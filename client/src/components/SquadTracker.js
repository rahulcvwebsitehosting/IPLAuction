import React from "react";

export default function SquadTracker({ players }) {
  if (!players || players.length === 0) {
    return (
      <div className="squad-tracker">
        <h3>All Teams</h3>
        <p className="squad-empty">No teams in room yet</p>
      </div>
    );
  }

  return (
    <div className="squad-tracker">
      <h3>All Teams</h3>
      <div className="squad-list">
        {players.map((p) => (
          <div key={p.userId} className="squad-item">
            <div className="squad-team">{p.team || "?"}</div>
            <div className="squad-details">
              <span className="squad-purse">
                {p.purseRemaining?.toFixed(0)}
              </span>
              <span className="squad-count">{p.totalPlayers || 0} players</span>
              <span className="squad-overseas">{p.overseasUsed || 0} OS</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
