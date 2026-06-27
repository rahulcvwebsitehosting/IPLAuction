import React, { useState, useEffect } from "react";
import API from "../services/api.service";

export default function ModeSelector({ selectedMode, onSelect }) {
  const [modes, setModes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.getModes()
      .then((res) => {
        if (res.success) setModes(res.modes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <div className="mode-selector-loading">Loading modes...</div>;

  return (
    <div className="mode-selector">
      <h3>Select Auction Mode</h3>
      <div className="mode-list">
        {Object.entries(modes).map(([key, mode]) => (
          <div
            key={key}
            className={`mode-card ${selectedMode === key ? "selected" : ""}`}
            onClick={() => onSelect(key)}
          >
            <h4>{mode.name}</h4>
            <p>{mode.description}</p>
            <span className="mode-badges">
              {mode.hasRetentions && (
                <span className="badge retention">Retentions</span>
              )}
              {mode.hasRTM && <span className="badge rtm">RTM</span>}
              {mode.hasSets && <span className="badge sets">Sets</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
