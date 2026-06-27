import React, { useState, useEffect } from "react";
import API from "../services/api.service";

const teamList = [
  { id: "CSK", name: "Chennai Super Kings", color: "#FFCC00" },
  { id: "DC", name: "Delhi Capitals", color: "#0078BC" },
  { id: "GT", name: "Gujarat Titans", color: "#A8D8EA" },
  { id: "KKR", name: "Kolkata Knight Riders", color: "#3A225D" },
  { id: "LSG", name: "Lucknow Super Giants", color: "#A4D9E8" },
  { id: "MI", name: "Mumbai Indians", color: "#004A8F" },
  { id: "PBKS", name: "Punjab Kings", color: "#DD1F2D" },
  { id: "RR", name: "Rajasthan Royals", color: "#EA1A85" },
  { id: "RCB", name: "Royal Challengers Bengaluru", color: "#EC1C24" },
  { id: "SRH", name: "Sunrisers Hyderabad", color: "#FF8220" },
];

export default function TeamPicker({
  roomCode,
  selectedTeam,
  onSelect,
  disabled,
}) {
  const [takenTeams, setTakenTeams] = useState([]);

  useEffect(() => {
    if (roomCode) {
      API.getRoom(roomCode)
        .then((res) => {
          if (res.success) setTakenTeams(res.teamsTaken || []);
        })
        .catch(() => {});
    }
  }, [roomCode]);

  const isTaken = (teamId) => takenTeams.includes(teamId);

  return (
    <div className="team-picker">
      <h3>Select Your Team</h3>
      <div className="team-grid">
        {teamList.map((team) => {
          const taken = isTaken(team.id);
          return (
            <div
              key={team.id}
              className={`team-card ${
                selectedTeam === team.id ? "selected" : ""
              } ${taken ? "taken" : ""}`}
              style={{ borderColor: taken ? "#999" : team.color }}
              onClick={() => !taken && !disabled && onSelect(team.id)}
            >
              <div className="team-short" style={{ background: team.color }}>
                {team.id}
              </div>
              <div className="team-name">{team.name}</div>
              {taken && <div className="taken-label">Taken</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
