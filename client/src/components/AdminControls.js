import React from "react";

export default function AdminControls({
  isAdmin,
  isLive,
  isPaused,
  isEnded,
  currentPlayerState,
  canAdvance,
  onStart,
  onAdvance,
  onSold,
  onUnsold,
  onUndo,
  onPause,
  onResume,
  onEnd,
}) {
  if (!isAdmin) return null;

  return (
    <div className="admin-controls">
      <h4 className="admin-label">Admin Controls</h4>
      <div className="admin-buttons">
        {!isLive && !isPaused && !isEnded && (
          <button className="btn btn-admin btn-start" onClick={onStart}>
            Start Auction
          </button>
        )}
        {isLive &&
          (currentPlayerState === "SOLD" || currentPlayerState === "UNSOLD") &&
          canAdvance && (
            <button className="btn btn-admin btn-advance" onClick={onAdvance}>
              Next Player
            </button>
          )}
        {isLive && currentPlayerState === "BIDDING_ACTIVE" && (
          <>
            <button className="btn btn-admin btn-sold" onClick={onSold}>
              Mark Sold
            </button>
            <button className="btn btn-admin btn-unsold" onClick={onUnsold}>
              Mark Unsold
            </button>
          </>
        )}
        {isLive && (
          <>
            {!isPaused ? (
              <button className="btn btn-admin btn-pause" onClick={onPause}>
                Pause
              </button>
            ) : (
              <button className="btn btn-admin btn-resume" onClick={onResume}>
                Resume
              </button>
            )}
          </>
        )}
        <button className="btn btn-admin btn-undo" onClick={onUndo}>
          Undo
        </button>
        {isLive && (
          <button className="btn btn-admin btn-end" onClick={onEnd}>
            End Auction
          </button>
        )}
      </div>
    </div>
  );
}
