import React, { useState } from "react";

const DEFAULT_SETTINGS = {
  timerDuration: 10,
  timerReset: 5,
  maxDuration: 20,
  bidIncrementMode: "tiered",
  maxSquadSize: 25,
  minSquadSize: 18,
  overseasLimit: 8,
  basePurse: 12000,
  rtmCards: 3,
  maxRecallRounds: 3,
  autoAdvance: false,
};

export default function SettingsPanel({ settings, isAdmin, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);

  const current = settings || DEFAULT_SETTINGS;
  const local = draft || current;

  if (!isAdmin) return null;

  const handleChange = (key, value) => {
    setDraft((prev) => ({ ...(prev || current), [key]: value }));
  };

  const handleSave = () => {
    if (onUpdate && draft) {
      onUpdate(draft);
      setDraft(null);
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setDraft(null);
    setOpen(false);
  };

  return (
    <div className="settings-panel">
      <button
        className="btn btn-settings-toggle"
        onClick={() => setOpen(!open)}
      >
        {open ? "Close Settings" : "Settings"}
      </button>
      {open && (
        <div className="settings-form">
          <div className="setting-row">
            <label>Timer Duration (s)</label>
            <input
              type="number"
              min={5}
              max={120}
              value={local.timerDuration}
              onChange={(e) => handleChange("timerDuration", +e.target.value)}
            />
          </div>
          <div className="setting-row">
            <label>Timer Reset (s)</label>
            <input
              type="number"
              min={0}
              max={30}
              value={local.timerReset}
              onChange={(e) => handleChange("timerReset", +e.target.value)}
            />
          </div>
          <div className="setting-row">
            <label>Max Duration (s)</label>
            <input
              type="number"
              min={10}
              max={120}
              value={local.maxDuration}
              onChange={(e) => handleChange("maxDuration", +e.target.value)}
            />
          </div>
          <div className="setting-row">
            <label>Max Squad Size</label>
            <input
              type="number"
              min={11}
              max={40}
              value={local.maxSquadSize}
              onChange={(e) => handleChange("maxSquadSize", +e.target.value)}
            />
          </div>
          <div className="setting-row">
            <label>Overseas Limit</label>
            <input
              type="number"
              min={0}
              max={15}
              value={local.overseasLimit}
              onChange={(e) => handleChange("overseasLimit", +e.target.value)}
            />
          </div>
          <div className="setting-row">
            <label>RTM Cards</label>
            <input
              type="number"
              min={0}
              max={10}
              value={local.rtmCards}
              onChange={(e) => handleChange("rtmCards", +e.target.value)}
            />
          </div>
          <div className="setting-row">
            <label>Max Recall Rounds</label>
            <input
              type="number"
              min={0}
              max={5}
              value={local.maxRecallRounds}
              onChange={(e) => handleChange("maxRecallRounds", +e.target.value)}
            />
          </div>
          <div className="setting-row">
            <label>Auto Advance</label>
            <input
              type="checkbox"
              checked={local.autoAdvance}
              onChange={(e) => handleChange("autoAdvance", e.target.checked)}
            />
          </div>
          <div className="setting-actions">
            <button className="btn btn-save" onClick={handleSave}>
              Save
            </button>
            <button className="btn btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
