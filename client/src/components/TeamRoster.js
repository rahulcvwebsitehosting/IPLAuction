import React from "react";

function formatCurrency(lakhs) {
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(1)} Cr`;
  return `₹${lakhs} L`;
}

export default function TeamRoster({ players, currentUserId }) {
  const myTeam = players.find((p) => p.userId === currentUserId);

  return (
    <div className="team-roster">
      <h3>My Team</h3>
      {myTeam ? (
        <div className="roster-card">
          <div
            className="roster-header"
            style={{ borderLeftColor: myTeam.team ? undefined : "#ccc" }}
          >
            <span className="roster-team">{myTeam.team || "No Team"}</span>
            <span className="roster-purse">
              {formatCurrency(myTeam.purseRemaining)}
            </span>
          </div>
          <div className="roster-stats">
            <div>Players: {myTeam.totalPlayers || 0}</div>
            <div>Overseas: {myTeam.overseasUsed || 0}</div>
            <div>RTM: {myTeam.rtmCards || 0}</div>
          </div>
        </div>
      ) : (
        <div className="roster-empty">Join a room to see your team</div>
      )}
    </div>
  );
}
