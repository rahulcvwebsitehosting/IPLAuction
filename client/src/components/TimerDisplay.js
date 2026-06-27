import React from "react";

export default function TimerDisplay({ remaining, max }) {
  const seconds = Math.max(0, Math.ceil(remaining || 0));
  const pct = max ? (seconds / max) * 100 : 100;
  const urgent = seconds <= 3;

  return (
    <div className={`timer-display ${urgent ? "urgent" : ""}`}>
      <div className="timer-bar-track">
        <div className="timer-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="timer-value">{seconds}s</div>
    </div>
  );
}
