import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";
import { UserContext } from "../hooks/UserContext";
import ModeSelector from "../components/ModeSelector";
import TeamPicker from "../components/TeamPicker";
import API from "../services/api.service";

export default function CreateRoom() {
  const { user } = useContext(UserContext);
  const history = useHistory();
  const [mode, setMode] = useState(null);
  const [team, setTeam] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    history.push("/signup");
    return null;
  }

  const handleCreate = async () => {
    if (!mode || !team) return;
    setCreating(true);
    setError("");
    try {
      const res = await API.createRoom({ mode, team, username: user.username });
      if (res.success) {
        history.push(`/room/${res.roomCode}`);
      } else {
        setError(res.error || "Failed to create room");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="create-room-page">
      <h2>Create Auction Room</h2>
      <ModeSelector selectedMode={mode} onSelect={setMode} />
      {mode && <TeamPicker selectedTeam={team} onSelect={setTeam} />}
      {error && <div className="create-error">{error}</div>}
      <div className="create-actions">
        <button
          className="btn btn-primary btn-lg"
          disabled={!mode || !team || creating}
          onClick={handleCreate}
        >
          {creating ? "Creating..." : "Create Room"}
        </button>
      </div>
    </div>
  );
}
