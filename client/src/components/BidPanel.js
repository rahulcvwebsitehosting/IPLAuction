import React from "react";
import { formatCurrency } from "../utilities/currency";

const TIERS = [
  { maxBid: 20, increment: 5 },
  { maxBid: 75, increment: 5 },
  { maxBid: 100, increment: 10 },
  { maxBid: 200, increment: 25 },
  { maxBid: Infinity, increment: 50 },
];

function getIncrement(currentBid) {
  for (const tier of TIERS) {
    if (currentBid < tier.maxBid) return tier.increment;
  }
  return 50;
}

export default function BidPanel({
  currentBid,
  myPurse,
  myOverseasUsed,
  myTotalPlayers,
  overseasLimit,
  maxSquadSize,
  player,
  isLive,
  isPaused,
  playerState,
  onBid,
  error,
  rtmActive,
  onRTM,
  rtmCards,
}) {
  const increment = getIncrement(currentBid);
  const nextBid = currentBid + increment;

  const canBid =
    isLive &&
    !isPaused &&
    playerState === "OPEN" &&
    player &&
    myPurse >= nextBid &&
    myTotalPlayers < maxSquadSize &&
    (!(player?.nationality === "overseas") || myOverseasUsed < overseasLimit);

  const canRTM = rtmActive && onRTM && rtmCards > 0 && myPurse >= currentBid;

  return (
    <div className="bid-panel">
      <div className="purse-display">
        <span>
          Purse: <strong>{formatCurrency(myPurse)}</strong>
        </span>
        <span>
          Squad: {myTotalPlayers}/{maxSquadSize}
        </span>
        <span>
          OS: {myOverseasUsed}/{overseasLimit}
        </span>
      </div>
      {rtmCards > 0 && <div className="rtm-count">RTM Cards: {rtmCards}</div>}
      {error && <div className="bid-error">{error.message || error}</div>}
      <div className="bid-controls">
        {canRTM && (
          <button className="btn btn-rtm" onClick={onRTM}>
            RTM Match ({formatCurrency(currentBid)})
          </button>
        )}
        <button className="btn btn-bid" disabled={!canBid} onClick={onBid}>
          {canBid ? `Bid ${formatCurrency(nextBid)}` : "Cannot Bid"}
        </button>
      </div>
    </div>
  );
}
