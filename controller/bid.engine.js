const { INCREMENT_TIERS } = require("../config/constants");

function getIncrement(currentBidLakhs) {
  for (const tier of INCREMENT_TIERS) {
    if (currentBidLakhs < tier.maxBid) {
      return tier.increment;
    }
  }
  return INCREMENT_TIERS[INCREMENT_TIERS.length - 1].increment;
}

function getIncrementLabel(currentBidLakhs) {
  for (const tier of INCREMENT_TIERS) {
    if (currentBidLakhs < tier.maxBid) {
      return tier.label;
    }
  }
  return INCREMENT_TIERS[INCREMENT_TIERS.length - 1].label;
}

function applyIncrement(currentBidLakhs) {
  return currentBidLakhs + getIncrement(currentBidLakhs);
}

/**
 * @param {Object} opts
 * @param {Object} opts.machine - AuctionMachine instance
 * @param {Object} opts.teamPlayer - the bidding player's RoomPlayer doc (with purseRemaining, totalPlayers, overseasUsed)
 * @param {boolean} opts.isOverseasPlayer - whether the current player is overseas
 * @returns {{ valid: boolean, errorCode?: string }}
 */
function validateBid(machine, teamPlayer, isOverseasPlayer) {
  const roomSettings = machine.settings;

  if (machine.currentPlayerId == null) {
    return { valid: false, errorCode: "PLAYER_NOT_OPEN" };
  }

  if (
    machine.currentPlayerState !== "OPEN" &&
    machine.currentPlayerState !== "BIDDING_ACTIVE"
  ) {
    return { valid: false, errorCode: "PLAYER_NOT_OPEN" };
  }

  const timer = machine.timerRemaining;
  if (timer == null || timer <= 0) {
    return { valid: false, errorCode: "TIMER_EXPIRED" };
  }

  if (machine.currentHighBidder === teamPlayer.userId) {
    return { valid: false, errorCode: "SELF_BID" };
  }

  const increment = getIncrement(machine.currentBid);
  const nextBid = machine.currentBid + increment;

  if (teamPlayer.purseRemaining < nextBid) {
    return { valid: false, errorCode: "INSUFFICIENT_FUNDS" };
  }

  if (teamPlayer.totalPlayers >= roomSettings.maxSquadSize) {
    return { valid: false, errorCode: "SQUAD_FULL" };
  }

  if (
    isOverseasPlayer &&
    teamPlayer.overseasUsed >= roomSettings.overseasLimit
  ) {
    return { valid: false, errorCode: "OVERSEAS_FULL" };
  }

  return { valid: true };
}

module.exports = {
  getIncrement,
  getIncrementLabel,
  applyIncrement,
  validateBid,
};
