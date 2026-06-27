const fs = require("fs");
const path = require("path");
const { toLakhs, toCrores } = require("../utilities/currency");
const bidEngine = require("./bid.engine");
const timerService = require("./timer.service");
const undoStack = require("./undo.stack");
const retentionLogic = require("./retention.logic");
const {
  PLAYER_STATUS,
  ROOM_STATUS,
  RECALL_MULTIPLIERS,
  BASE_PRICE_FLOOR,
  DEFAULT_SETTINGS,
  MODES,
} = require("../config/constants");

const Room = require("../database/models/room.model");
const RoomPlayer = require("../database/models/roomPlayer.model");
const AuctionLog = require("../database/models/auctionLog.model");
const ChatMessage = require("../database/models/chatMessage.model");
const AuctionResult = require("../database/models/auctionResult.model");

// In-memory auction state. Single-process only: do NOT horizontally scale
// Node.js instances handling live auctions until a distributed store (Redis)
// is introduced. All auction state (bids, timers, results) lives here.
const auctionRegistry = new Map();
const playerDatasetCache = new Map();

function loadPlayerDataset(mode) {
  if (playerDatasetCache.has(mode)) return playerDatasetCache.get(mode);
  const modeConfig = MODES[mode];
  if (!modeConfig) throw new Error(`Unknown mode: ${mode}`);
  const filepath = path.join(
    __dirname,
    "..",
    "data",
    "players",
    modeConfig.dataset
  );
  if (!fs.existsSync(filepath))
    throw new Error(`Player dataset not found: ${modeConfig.dataset}`);
  const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  playerDatasetCache.set(mode, data);
  return data;
}

function createMachine(roomCode, mode, settings, roomPlayers) {
  const existing = auctionRegistry.get(roomCode);
  if (existing) return existing;

  const dataset = loadPlayerDataset(mode);
  const playerPool = dataset.players || dataset;
  let sortedPool = [...playerPool];

  const modeConfig = MODES[mode];
  if (modeConfig.hasSets) {
    sortedPool.sort((a, b) => (a.set || 0) - (b.set || 0));
  } else {
    sortedPool = shuffleArray(sortedPool);
  }

  let startingPurse = settings.basePurse || DEFAULT_SETTINGS.basePurse;
  const teamPlayerMap = new Map();

  for (const rp of roomPlayers) {
    const playerObj = {
      userId: rp.userId,
      team: rp.team,
      purseRemaining: startingPurse,
      overseasUsed: 0,
      totalPlayers: 0,
      rtmCards: settings.rtmCards || 0,
      squad: [],
      joinDoc: rp,
    };

    if (modeConfig.hasRetentions && retentionLogic) {
      const retained = retentionLogic.getRetainedPlayers(dataset, rp.team);
      if (retained.length > 0) {
        for (const r of retained) {
          retentionLogic.applyRetention(playerObj, r);
        }
      }
    }

    teamPlayerMap.set(rp.userId, playerObj);
  }

  const allIds = new Set(sortedPool.map((p) => p.id));
  const teamPlayerIds = new Set();
  for (const [, tp] of teamPlayerMap) {
    for (const p of tp.squad) {
      teamPlayerIds.add(p.id);
    }
  }
  const unsoldPool = [...allIds].filter((id) => !teamPlayerIds.has(id));

  const machine = {
    roomCode,
    mode,
    settings: { ...settings },
    playerPool: sortedPool,
    setQueue: buildSetQueue(sortedPool, modeConfig.hasSets),
    currentSetIndex: 0,
    currentPlayerIndex: 0,
    round: 0,
    currentPlayerId: null,
    currentBid: 0,
    currentHighBidder: null,
    currentPlayerState: null,
    bidderHistory: [],
    timerRemaining: 0,
    playerResults: new Map(),
    unsoldPool,
    rtmQueue: [],
    auditSeq: 0,
    lastFlushedSeq: 0,
    undoHistory: undoStack.createUndoStack(5),
  };

  auctionRegistry.set(roomCode, { machine, teamPlayerMap });
  return { machine, teamPlayerMap };
}

function buildSetQueue(playerPool, hasSets) {
  if (!hasSets) return [0];
  const sets = new Set();
  for (const p of playerPool) {
    sets.add(p.set || 0);
  }
  return [...sets].sort((a, b) => a - b);
}

function getAuction(roomCode) {
  return auctionRegistry.get(roomCode) || null;
}

function destroyAuction(roomCode) {
  timerService.stopTimer(roomCode);
  auctionRegistry.delete(roomCode);
}

function findPlayerById(machine, playerId) {
  return machine.playerPool.find((p) => p.id === playerId);
}

function getCurrentPlayer(machine) {
  if (!machine.currentPlayerId) return null;
  return findPlayerById(machine, playerId) || null;
}

function nextPlayerId(machine) {
  const currentSet = machine.setQueue[machine.currentSetIndex];
  const setPlayers = machine.playerPool.filter(
    (p) => (p.set || 0) === currentSet
  );
  if (machine.currentPlayerIndex < setPlayers.length) {
    return setPlayers[machine.currentPlayerIndex].id;
  }
  return null;
}

function servePlayer(machine, teamPlayerMap, io) {
  if (!machine || !io) return;

  const currentSet = machine.setQueue[machine.currentSetIndex];
  const setPlayers = machine.playerPool.filter(
    (p) => (p.set || 0) === currentSet
  );

  let pid = null;
  if (machine.round === 0) {
    if (machine.currentPlayerIndex < setPlayers.length) {
      pid = setPlayers[machine.currentPlayerIndex].id;
    }
  } else {
    const unsoldForRound = machine.unsoldPool.filter((id) => {
      const res = machine.playerResults.get(id);
      return res && res.status === "unsold" && !res.permanentlyUnsold;
    });
    if (machine.currentPlayerIndex < unsoldForRound.length) {
      pid = unsoldForRound[machine.currentPlayerIndex];
    }
  }

  if (!pid) return;

  const player = findPlayerById(machine, pid);
  if (!player) return;

  const multiplier =
    machine.round < RECALL_MULTIPLIERS.length
      ? RECALL_MULTIPLIERS[machine.round]
      : RECALL_MULTIPLIERS[RECALL_MULTIPLIERS.length - 1];
  const basePrice = Math.max(
    BASE_PRICE_FLOOR,
    Math.floor((player.basePrice || 20) * multiplier)
  );

  machine.currentPlayerId = pid;
  machine.currentBid = 0;
  machine.currentHighBidder = null;
  machine.currentPlayerState = PLAYER_STATUS.OPEN;
  machine.bidderHistory = [];
  machine.timerRemaining = machine.settings.timerDuration;

  logEvent(machine, "player_served", "system", {
    playerId: pid,
    basePrice,
    round: machine.round,
  });

  broadcastPlayers(io, machine.roomCode, teamPlayerMap);
  io.to(machine.roomCode).emit("player_served", {
    player,
    basePrice,
    round: machine.round,
    timer: machine.timerRemaining,
    seq: machine.auditSeq,
  });

  timerService.startTimer(
    machine.roomCode,
    machine.timerRemaining,
    (remaining) => {
      machine.timerRemaining = remaining;
      io.to(machine.roomCode).emit("timer_tick", {
        remaining,
        seq: machine.auditSeq,
      });
    },
    () => resolveBid(machine, teamPlayerMap, io)
  );
}

function resolveBid(machine, teamPlayerMap, io) {
  timerService.stopTimer(machine.roomCode);

  if (machine.currentHighBidder && machine.currentBid > 0) {
    markSoldInternal(machine, teamPlayerMap, io);
  } else {
    markUnsoldInternal(machine, teamPlayerMap, io, "timer_expired");
  }
}

// Bid application is intentionally synchronous: validate, mutate state, emit
// events, and append the log all happen in one contiguous tick. No `await`
// between reads and writes prevents interleaved async operations from
// corrupting auction state. All state-mutating paths follow this pattern.
function applyBid(machine, teamPlayerMap, userId, io) {
  const tp = teamPlayerMap.get(userId);
  if (!tp) return { success: false, errorCode: "PLAYER_NOT_OPEN" };

  const player = getCurrentPlayer(machine);
  const isOverseas = player ? player.nationality === "overseas" : false;

  const { valid, errorCode } = bidEngine.validateBid(machine, tp, isOverseas);
  if (!valid) return { success: false, errorCode };

  const newBid = bidEngine.applyIncrement(machine.currentBid);
  machine.currentBid = newBid;
  machine.currentHighBidder = userId;
  machine.currentPlayerState = PLAYER_STATUS.BIDDING_ACTIVE;
  machine.bidderHistory.push({ userId, amount: newBid });

  timerService.resetTimer(
    machine.roomCode,
    machine.settings.timerReset,
    machine.settings.maxDuration
  );
  if (timerService.addTimerCallbacks) {
    timerService.addTimerCallbacks(
      machine.roomCode,
      (remaining) => {
        machine.timerRemaining = remaining;
        io.to(machine.roomCode).emit("timer_tick", {
          remaining,
          seq: machine.auditSeq,
        });
      },
      () => resolveBid(machine, teamPlayerMap, io)
    );
  }

  logEvent(machine, "bid_placed", userId, {
    playerId: machine.currentPlayerId,
    amount: newBid,
  });

  io.to(machine.roomCode).emit("bid_placed", {
    bidderId: userId,
    amount: newBid,
    newTimer: machine.timerRemaining,
    seq: machine.auditSeq,
  });

  return { success: true };
}

function markSoldInternal(machine, teamPlayerMap, io) {
  const pid = machine.currentPlayerId;
  const buyerId = machine.currentHighBidder;
  const amount = machine.currentBid;
  const player = getCurrentPlayer(machine);

  machine.playerResults.set(pid, { status: "sold", soldTo: buyerId, amount });
  machine.currentPlayerState = PLAYER_STATUS.SOLD;

  const tp = teamPlayerMap.get(buyerId);
  if (tp && player) {
    tp.purseRemaining -= amount;
    tp.totalPlayers++;
    tp.squad.push({
      id: player.id,
      name: player.name,
      role: player.role,
      amount,
    });
    if (player.nationality === "overseas") tp.overseasUsed++;

    if (machine.settings.bidIncrementMode !== "free") {
      tp.purseSpent = (tp.purseSpent || 0) + amount;
    }
  }

  logEvent(machine, "player_sold", buyerId, { playerId: pid, amount });
  machine.undoHistory.push({
    type: "player_sold",
    data: { playerId: pid, buyerId, amount, player },
    inverse: () =>
      undoPlayerSold(machine, teamPlayerMap, pid, buyerId, amount, player),
  });

  const rtmInfo = checkRTM(machine, teamPlayerMap, pid, buyerId);

  broadcastPlayers(io, machine.roomCode, teamPlayerMap);
  io.to(machine.roomCode).emit("player_sold", {
    playerId: pid,
    buyerId,
    buyerTeam: tp ? tp.team : null,
    amount,
    rtm: rtmInfo,
    seq: machine.auditSeq,
  });

  if (rtmInfo) {
    startRTMWindow(machine, teamPlayerMap, io, rtmInfo);
  } else if (machine.settings.autoAdvance) {
    setTimeout(() => advanceAndServe(machine, teamPlayerMap, io), 3000);
  }
}

function markUnsoldInternal(machine, teamPlayerMap, io, reason) {
  const pid = machine.currentPlayerId;
  machine.playerResults.set(pid, {
    status: "unsold",
    soldTo: null,
    amount: null,
  });
  machine.currentPlayerState = PLAYER_STATUS.UNSOLD;

  if (!machine.unsoldPool.includes(pid)) {
    machine.unsoldPool.push(pid);
  }

  logEvent(machine, "player_unsold", "system", { playerId: pid, reason });

  broadcastPlayers(io, machine.roomCode, teamPlayerMap);
  io.to(machine.roomCode).emit("player_unsold", {
    playerId: pid,
    reason,
    seq: machine.auditSeq,
  });

  if (machine.settings.autoAdvance) {
    setTimeout(() => advanceAndServe(machine, teamPlayerMap, io), 3000);
  }
}

function advanceAndServe(machine, teamPlayerMap, io) {
  if (advanceToNextPlayer(machine, teamPlayerMap, io)) {
    servePlayer(machine, teamPlayerMap, io);
  }
}

function advanceToNextPlayer(machine, teamPlayerMap, io) {
  timerService.stopTimer(machine.roomCode);

  if (machine.round === 0) {
    machine.currentPlayerIndex++;
    const currentSet = machine.setQueue[machine.currentSetIndex];
    const setPlayers = machine.playerPool.filter(
      (p) => (p.set || 0) === currentSet
    );

    if (machine.currentPlayerIndex >= setPlayers.length) {
      machine.currentSetIndex++;
      machine.currentPlayerIndex = 0;

      if (machine.currentSetIndex >= machine.setQueue.length) {
        if (machine.unsoldPool.length > 0) {
          beginRecallRound(machine, teamPlayerMap, io);
          return false;
        }
        endAuctionInternal(machine, teamPlayerMap, io);
        return false;
      }
    }
  } else {
    machine.currentPlayerIndex++;
    const unsoldForRound = machine.unsoldPool.filter((id) => {
      const res = machine.playerResults.get(id);
      return res && res.status === "unsold" && !res.permanentlyUnsold;
    });

    if (machine.currentPlayerIndex >= unsoldForRound.length) {
      machine.round++;
      if (machine.round > machine.settings.maxRecallRounds) {
        for (const id of machine.unsoldPool) {
          const res = machine.playerResults.get(id);
          if (res && res.status === "unsold") {
            res.permanentlyUnsold = true;
          }
        }
        endAuctionInternal(machine, teamPlayerMap, io);
        return false;
      }
      machine.currentPlayerIndex = 0;
      io.to(machine.roomCode).emit("recall_round_started", {
        round: machine.round,
        basePriceMultiplier: RECALL_MULTIPLIERS[machine.round] || 0.25,
        playerCount: unsoldForRound.length,
        seq: machine.auditSeq,
      });
      return true;
    }
  }

  return true;
}

function markSold(machine, teamPlayerMap, io) {
  timerService.stopTimer(machine.roomCode);
  if (!machine.currentHighBidder || machine.currentBid <= 0) return;
  markSoldInternal(machine, teamPlayerMap, io);
}

function markUnsold(machine, teamPlayerMap, io) {
  timerService.stopTimer(machine.roomCode);
  markUnsoldInternal(machine, teamPlayerMap, io, "admin_marked");
}

function beginRecallRound(machine, teamPlayerMap, io) {
  machine.round = 1;
  machine.currentPlayerIndex = 0;

  const unsoldForRound = machine.unsoldPool.filter((id) => {
    const res = machine.playerResults.get(id);
    return res && res.status === "unsold";
  });

  logEvent(machine, "round_started", "system", {
    round: machine.round,
    playerCount: unsoldForRound.length,
  });

  io.to(machine.roomCode).emit("recall_round_started", {
    round: machine.round,
    basePriceMultiplier: RECALL_MULTIPLIERS[machine.round],
    playerCount: unsoldForRound.length,
    seq: machine.auditSeq,
  });
}

function checkRTM(machine, teamPlayerMap, soldPlayerId, buyerId) {
  if (!MODES[machine.mode] || !MODES[machine.mode].hasRTM) return null;

  const player = findPlayerById(machine, soldPlayerId);
  if (!player || !player.retainedBy) return null;

  const retainedTeam = player.retainedBy;
  if (retainedTeam === teamPlayerMap.get(buyerId)?.team) return null;

  for (const [, tp] of teamPlayerMap) {
    if (tp.team === retainedTeam && (tp.rtmCards || 0) > 0) {
      const requiredPurse = player.retentionCost || machine.currentBid;
      if (tp.purseRemaining >= requiredPurse) {
        return {
          teamId: retainedTeam,
          userId: tp.userId,
          amount: machine.currentBid,
        };
      }
    }
  }

  return null;
}

let rtmTimeouts = new Map();

function startRTMWindow(machine, teamPlayerMap, io, rtmInfo) {
  io.to(machine.roomCode).emit("rtm_window", {
    playerId: machine.currentPlayerId,
    matchedTeam: rtmInfo.teamId,
    amount: rtmInfo.amount,
    windowSeconds: 15,
    seq: machine.auditSeq,
  });

  const key = machine.roomCode + "_" + machine.currentPlayerId;
  if (rtmTimeouts.has(key)) clearTimeout(rtmTimeouts.get(key));

  rtmTimeouts.set(
    key,
    setTimeout(() => {
      rtmTimeouts.delete(key);
      io.to(machine.roomCode).emit("rtm_declined", {
        playerId: machine.currentPlayerId,
        teamId: rtmInfo.teamId,
        seq: machine.auditSeq,
      });
      if (machine.settings.autoAdvance) {
        advanceAndServe(machine, teamPlayerMap, io);
      }
    }, 15000)
  );
}

function exerciseRTM(machine, teamPlayerMap, userId, io) {
  const tp = teamPlayerMap.get(userId);
  if (!tp || (tp.rtmCards || 0) <= 0)
    return { success: false, error: "No RTM cards remaining" };

  const amount = machine.playerResults.get(machine.currentPlayerId)?.amount;
  if (!amount || tp.purseRemaining < amount)
    return { success: false, error: "Insufficient funds for RTM" };

  const player = getCurrentPlayer(machine);
  tp.purseRemaining -= amount;
  tp.rtmCards = (tp.rtmCards || 0) - 1;
  tp.totalPlayers++;
  tp.squad.push({
    id: player.id,
    name: player.name,
    role: player.role,
    amount,
    rtm: true,
  });
  if (player.nationality === "overseas") tp.overseasUsed++;

  machine.playerResults.set(machine.currentPlayerId, {
    status: "rtm",
    soldTo: userId,
    amount,
  });
  logEvent(machine, "rtm_exercised", userId, {
    playerId: machine.currentPlayerId,
    amount,
  });

  const key = machine.roomCode + "_" + machine.currentPlayerId;
  if (rtmTimeouts.has(key)) {
    clearTimeout(rtmTimeouts.get(key));
    rtmTimeouts.delete(key);
  }

  broadcastPlayers(io, machine.roomCode, teamPlayerMap);
  io.to(machine.roomCode).emit("rtm_exercised", {
    playerId: machine.currentPlayerId,
    teamId: tp.team,
    amount,
    seq: machine.auditSeq,
  });

  if (machine.settings.autoAdvance) {
    setTimeout(() => advanceAndServe(machine, teamPlayerMap, io), 3000);
  }

  return { success: true };
}

function undoPlayerSold(
  machine,
  teamPlayerMap,
  playerId,
  buyerId,
  amount,
  player
) {
  const tp = teamPlayerMap.get(buyerId);
  if (tp) {
    tp.purseRemaining += amount;
    tp.totalPlayers--;
    tp.squad = tp.squad.filter((p) => p.id !== playerId);
    if (player && player.nationality === "overseas")
      tp.overseasUsed = Math.max(0, tp.overseasUsed - 1);
  }
  machine.playerResults.delete(playerId);
  machine.currentBid = 0;
  machine.currentHighBidder = null;
  machine.currentPlayerState = PLAYER_STATUS.OPEN;
  machine.bidderHistory = [];
}

function undoLastAction(machine, teamPlayerMap, io) {
  const action = machine.undoHistory.pop();
  if (!action) return { success: false, error: "Nothing to undo" };

  logEvent(machine, "undo", "admin", {
    undoneType: action.type,
    undoneData: action.data,
  });
  action.inverse();
  broadcastPlayers(io, machine.roomCode, teamPlayerMap);
  io.to(machine.roomCode).emit("state_reverted", {
    snapshot: buildFullSnapshot(machine, teamPlayerMap),
    seq: machine.auditSeq,
  });
  return { success: true };
}

function pauseAuction(machine, io) {
  timerService.pauseTimer(machine.roomCode);
  machine._pausedTimerRemaining = timerService.getRemaining(machine.roomCode);
  logEvent(machine, "auction_paused", "admin", {});
  io.to(machine.roomCode).emit("auction_paused", {
    remaining: machine._pausedTimerRemaining,
    seq: machine.auditSeq,
  });
}

function resumeAuction(machine, teamPlayerMap, io) {
  timerService.resumeTimer(
    machine.roomCode,
    (remaining) => {
      machine.timerRemaining = remaining;
      io.to(machine.roomCode).emit("timer_tick", {
        remaining,
        seq: machine.auditSeq,
      });
    },
    () => resolveBid(machine, teamPlayerMap, io)
  );
  logEvent(machine, "auction_resumed", "admin", {});
  io.to(machine.roomCode).emit("auction_resumed", {
    remaining: machine.timerRemaining,
    seq: machine.auditSeq,
  });
}

function updateSettings(machine, newSettings, io) {
  const old = { ...machine.settings };
  Object.assign(machine.settings, newSettings);
  logEvent(machine, "settings_changed", "admin", {
    old,
    new: machine.settings,
  });
  io.to(machine.roomCode).emit("settings_updated", {
    settings: machine.settings,
    seq: machine.auditSeq,
  });
}

async function endAuctionInternal(machine, teamPlayerMap, io) {
  timerService.stopTimer(machine.roomCode);

  const playerResults = [];
  for (const [playerId, result] of machine.playerResults) {
    const player = findPlayerById(machine, playerId);
    playerResults.push({
      playerId,
      name: player ? player.name : "Unknown",
      role: player ? player.role : "",
      nationality: player ? player.nationality : "",
      basePrice: player ? player.basePrice : 0,
      soldTo: result.soldTo
        ? teamPlayerMap.get(result.soldTo)?.team || result.soldTo
        : null,
      soldAmount: result.amount,
      status: result.status,
    });
  }

  const teams = [];
  for (const [, tp] of teamPlayerMap) {
    teams.push({
      userId: tp.userId,
      team: tp.team,
      purseSpent:
        tp.purseSpent || DEFAULT_SETTINGS.basePurse - tp.purseRemaining,
      playersBought: tp.totalPlayers,
      finalSquad: tp.squad.map((p) => p.id),
    });
  }

  try {
    await AuctionResult.create({
      roomCode: machine.roomCode,
      mode: machine.mode,
      completedAt: new Date(),
      players: playerResults,
      teams,
    });

    await Room.findOneAndUpdate(
      { roomCode: machine.roomCode },
      { $set: { status: ROOM_STATUS.ENDED } }
    );

    for (const [, tp] of teamPlayerMap) {
      if (tp.joinDoc && tp.joinDoc._id) {
        await RoomPlayer.findByIdAndUpdate(tp.joinDoc._id, {
          $set: {
            purseRemaining: tp.purseRemaining,
            overseasUsed: tp.overseasUsed,
            totalPlayers: tp.totalPlayers,
            squad: tp.squad,
            rtmCardsRemaining: tp.rtmCards,
          },
        });
      }
    }
  } catch (err) {
    console.error("Failed to persist auction results:", err.message);
  }

  logEvent(machine, "auction_ended", "system", {});

  io.to(machine.roomCode).emit("auction_ended", {
    summary: { playerResults, teams },
    seq: machine.auditSeq,
  });

  destroyAuction(machine.roomCode);
}

function logEvent(machine, event, actor, data) {
  machine.auditSeq++;

  const doc = {
    roomCode: machine.roomCode,
    seq: machine.auditSeq,
    event,
    actor,
    data,
    timestamp: new Date(),
  };

  AuctionLog.create(doc).catch((err) => {
    console.error(
      `Failed to persist auction log seq=${machine.auditSeq}:`,
      err.message
    );
  });
}

function broadcastPlayers(io, roomCode, teamPlayerMap) {
  const players = [];
  for (const [, tp] of teamPlayerMap) {
    players.push({
      userId: tp.userId,
      team: tp.team,
      purseRemaining: tp.purseRemaining,
      overseasUsed: tp.overseasUsed,
      totalPlayers: tp.totalPlayers,
      rtmCards: tp.rtmCards,
    });
  }
  io.to(roomCode).emit("budget_updated", {
    players,
    seq: auctionRegistry.get(roomCode)?.machine?.auditSeq || 0,
  });
}

function buildFullSnapshot(machine, teamPlayerMap) {
  const players = [];
  for (const [, tp] of teamPlayerMap) {
    players.push({
      userId: tp.userId,
      team: tp.team,
      purseRemaining: tp.purseRemaining,
      overseasUsed: tp.overseasUsed,
      totalPlayers: tp.totalPlayers,
      rtmCards: tp.rtmCards,
      squad: tp.squad,
    });
  }
  return {
    roomCode: machine.roomCode,
    mode: machine.mode,
    status: "LIVE",
    players,
    currentPlayer: machine.currentPlayerId
      ? findPlayerById(machine, machine.currentPlayerId)
      : null,
    currentBid: machine.currentBid,
    currentHighBidderId: machine.currentHighBidder,
    currentPlayerState: machine.currentPlayerState,
    timerRemaining: machine.timerRemaining,
    round: machine.round,
    currentSetIndex: machine.currentSetIndex,
    currentPlayerIndex: machine.currentPlayerIndex,
    lastSeq: machine.auditSeq,
  };
}

function getFullState(machine, teamPlayerMap) {
  return buildFullSnapshot(machine, teamPlayerMap);
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = {
  loadPlayerDataset,
  createMachine,
  getAuction,
  destroyAuction,
  servePlayer,
  resolveBid,
  applyBid,
  advanceToNextPlayer,
  advanceAndServe,
  markSold,
  markUnsold,
  beginRecallRound,
  exerciseRTM,
  undoLastAction,
  pauseAuction,
  resumeAuction,
  updateSettings,
  endAuctionInternal,
  getFullState,
  findPlayerById,
  getCurrentPlayer,
};
