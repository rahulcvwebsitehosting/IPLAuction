const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;

const ROOM_STATUS = {
  WAITING: "WAITING",
  LIVE: "LIVE",
  PAUSED: "PAUSED",
  ENDED: "ENDED",
};

const PLAYER_STATUS = {
  PENDING: "PENDING",
  OPEN: "OPEN",
  BIDDING_ACTIVE: "BIDDING_ACTIVE",
  SOLD: "SOLD",
  UNSOLD: "UNSOLD",
};

const INCREMENT_TIERS = [
  { maxBid: 20, increment: 5 },
  { maxBid: 75, increment: 5 },
  { maxBid: 100, increment: 10 },
  { maxBid: 200, increment: 25 },
  { maxBid: Infinity, increment: 50 },
];

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

const RECALL_MULTIPLIERS = [1.0, 0.75, 0.5, 0.25];

const BASE_PRICE_FLOOR = 10;

const MAX_PLAYERS_PER_ROOM = 10;

const UNDO_MAX_DEPTH = 5;

const BID_RATE_LIMIT_MS = 500;

const CHAT_RATE_LIMIT_PER_SEC = 5;

const HOST_MIGRATION_GRACE_SEC = 30;

const RTM_WINDOW_SEC = 15;

const MODES = {
  mock_2026: {
    name: "IPL 2026 Mock Auction",
    description: "350 players, 42 sets, real retentions, accurate base prices",
    dataset: "mock_2026.json",
    hasRetentions: true,
    hasRTM: true,
    hasSets: true,
  },
  legends_upgraded: {
    name: "IPL Legends Upgraded",
    description: "248 legends, 26 sets, Marquee to spinners",
    dataset: "legends_upgraded.json",
    hasRetentions: false,
    hasRTM: false,
    hasSets: true,
  },
  legends_top100: {
    name: "IPL Legends Top 100",
    description: "Top 100 batters & bowlers, IPL history 2008-2025",
    dataset: "legends_top100.json",
    hasRetentions: false,
    hasRTM: false,
    hasSets: false,
  },
  mega: {
    name: "Mega Auction",
    description: "230+ players, clean slate, full 120 Cr budget",
    dataset: "mega.json",
    hasRetentions: false,
    hasRTM: false,
    hasSets: false,
  },
};

const BID_ERROR_CODES = {
  AUCTION_NOT_LIVE: "AUCTION_NOT_LIVE",
  PLAYER_NOT_OPEN: "PLAYER_NOT_OPEN",
  TIMER_EXPIRED: "TIMER_EXPIRED",
  SELF_BID: "SELF_BID",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  SQUAD_FULL: "SQUAD_FULL",
  OVERSEAS_FULL: "OVERSEAS_FULL",
};

const BID_ERROR_MESSAGES = {
  AUCTION_NOT_LIVE: "Auction is not currently active",
  PLAYER_NOT_OPEN: "Cannot bid on this player right now",
  TIMER_EXPIRED: "Bidding time has expired",
  SELF_BID: "You are already the highest bidder",
  INSUFFICIENT_FUNDS: "You don't have enough budget for this bid",
  SQUAD_FULL: "Your squad is at maximum capacity (25)",
  OVERSEAS_FULL: "You have reached the overseas player limit (8)",
};

module.exports = {
  ROOM_CODE_REGEX,
  ROOM_STATUS,
  PLAYER_STATUS,
  INCREMENT_TIERS,
  DEFAULT_SETTINGS,
  RECALL_MULTIPLIERS,
  BASE_PRICE_FLOOR,
  MAX_PLAYERS_PER_ROOM,
  UNDO_MAX_DEPTH,
  BID_RATE_LIMIT_MS,
  CHAT_RATE_LIMIT_PER_SEC,
  HOST_MIGRATION_GRACE_SEC,
  RTM_WINDOW_SEC,
  MODES,
  BID_ERROR_CODES,
  BID_ERROR_MESSAGES,
};
