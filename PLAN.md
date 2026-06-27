# IPL Auction — Engineering Specification

## Table of Contents

1.  Architecture Overview
2.  State Separation Principle
3.  Folder Structure
4.  Database Schema (MongoDB)
5.  In-Memory State (Server RAM)
6.  Auction State Machine
7.  Socket.IO Event Architecture
8.  Backend Services
9.  Data Flow & Workflows
10. Reconnection Handling
11. Host Migration
12. Undo / Rollback System
13. RTM Logic
14. Retention Logic
15. Recall / Accelerated Rounds
16. Bid Engine & Validation
17. Timer System
18. Purse & Squad Constraints
19. Chat System
20. Multiple Auction Modes
21. Team Selection
22. Settings System
23. Analytics & Audit Trail
24. Export System
25. Error Handling
26. Security Considerations
27. Future Extensibility
28. Migration Strategy

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ BROWSER (React 17, socket.io-client 4)                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐       │
│ │  Lobby   │ │   Game   │ │  Chat    │ │ Settings  │       │
│ │  View    │ │   View   │ │  Panel   │ │  Panel    │       │
│ └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘       │
│      └────────────┴────────────┴─────────────┘              │
│                        │                                     │
│              useSocket() hook                                │
│              useAuction() hook (reducer)                     │
└────────────────────────┬────────────────────────────────────┘
                         │  WebSocket (WSS)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ SERVER (Node.js, Express, Socket.IO 4)                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Socket Router                           │   │
│  │  Maps client events → service calls                  │   │
│  │  Enforces admin-only actions                        │   │
│  │  Tracks socket ↔ user ↔ room bindings               │   │
│  └──────┬───────────────────────────────────────────────┘   │
│         │                                                    │
│  ┌──────┴───────────────────────────────────────────────┐   │
│  │              Auction Service                         │   │
│  │  Creates / mutates / queries auction state machines  │   │
│  │  Bid validation, squad constraints                   │   │
│  │  Persists results → MongoDB                          │   │
│  └──────┬───────────────────────────────────────────────┘   │
│         │                                                    │
│  ┌──────┴───────────────────────────────────────────────┐   │
│  │              Timer Service                           │   │
│  │  Manages per-room countdown intervals                │   │
│  │  Emits timer_tick; resolves via callback             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              In-Memory State                         │   │
│  │  auctionRegistry:  Map<roomCode, AuctionMachine>     │   │
│  │  socketBindings:    Map<socketId,  SocketBinding>    │   │
│  │  timerRegistry:     Map<roomCode, TimerHandle>       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │  Mongoose
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ MONGODB ATLAS                                               │
│  rooms            - Room metadata (code, admin, mode, ...)  │
│  room_players     - Player roster (who joined, which team)  │
│  auction_logs     - Append-only audit trail                 │
│  chat_messages    - Chat history (separate growing load)    │
│  auction_results  - Final sold/unsold outcomes              │
│  users            - Existing auth collection (unchanged)    │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

- **Server is the sole authority.** The frontend never decides bid validity, timer expiration, or player assignment. It only renders what the server tells it.
- **Mutable state lives in RAM.** Auction progress, current bids, and timers live only in server memory. They are never persisted to MongoDB during an active auction.
- **Immutable state lives in JSON files.** Player datasets per mode are static `.json` files loaded at startup and referenced by ID.
- **Results are appended, never updated in-place.** Every sold/unsold event is an append-only log entry. The final outcome is derived from the log.
- **Separate growing and static data.** Chat messages, auction logs, and player results each have their own collection. No single document grows unboundedly.

---

## 2. State Separation Principle

| Data                                       | Storage                      | Lifetime            | Mutation                        |
| ------------------------------------------ | ---------------------------- | ------------------- | ------------------------------- |
| Player datasets (per mode)                 | JSON files on disk           | Server process      | Never                           |
| Room metadata (code, admin, mode)          | MongoDB `rooms`              | Permanent           | Status only                     |
| Room roster (who joined)                   | MongoDB `room_players`       | Permanent           | Append on join, remove on leave |
| Auction state (current player, bid, timer) | Server RAM `auctionRegistry` | Per room session    | Continuously                    |
| Socket-to-user bindings                    | Server RAM `socketBindings`  | Per connection      | On connect / disconnect         |
| Timer handles                              | Server RAM `timerRegistry`   | Per active player   | Every second                    |
| Chat messages                              | MongoDB `chat_messages`      | Permanent (TTL 30d) | Append only                     |
| Auction event log                          | MongoDB `auction_logs`       | Permanent           | Append only                     |
| Final results                              | MongoDB `auction_results`    | Permanent           | Written once at auction end     |
| Frontend UI state (visible panels, etc.)   | React component state        | Browser session     | Freely                          |

**Recovery strategy on server restart:**

- Read `rooms` to find rooms marked `live`.
- Read `room_players` to repopulate the player list for each room.
- Read `auction_logs` for each room to rebuild the `playerResults` map and `auditSeq`.
- Transition those rooms to `paused` status (require admin to click Resume).
- Timers are NOT restored (they were live action-in-progress; the admin re-starts the current player).

---

## 3. Folder Structure

```
Ipl-Auction-master/
├── app.js                          # Express + Socket.IO entry point
├── server.js                       # listen() wrapper (testable without port bind)
├── config/
│   └── constants.js                # IPL rules, increment tiers, squad limits
├── controller/
│   ├── auction.service.js          # AuctionMachine factory + operations (NEW)
│   ├── bid.engine.js               # Tiered increment logic, budget validation (REWRITE)
│   ├── timer.service.js            # Per-room countdown, emits callbacks (NEW)
│   ├── undo.stack.js               # Bounded undo stack per room (NEW)
│   ├── host.migration.js           # Admin transfer logic (NEW)
│   └── retention.logic.js          # Retention + RTM deduction + prefill (NEW)
├── middleware/
│   └── auth.js                     # JWT auth (unchanged)
├── routes/
│   ├── socket.route.js             # Socket.IO event wiring (REWRITE)
│   ├── room.route.js               # REST: create, join, status (NEW)
│   ├── history.route.js            # REST: past auctions, export (NEW)
│   ├── user.route.js               # REST: auth (unchanged)
│   ├── news.route.js               # REST: RSS proxy (unchanged)
│   └── auction.route.js            # Deprecated (DELETE)
├── models/
│   ├── room.model.js               # Mongoose: rooms collection (NEW)
│   ├── roomPlayer.model.js         # Mongoose: room_players collection (NEW)
│   ├── auctionLog.model.js         # Mongoose: auction_logs collection (NEW)
│   ├── chatMessage.model.js        # Mongoose: chat_messages collection (NEW)
│   ├── auctionResult.model.js      # Mongoose: auction_results collection (NEW)
│   └── user.model.js               # Mongoose: users (unchanged)
├── data/
│   ├── players/
│   │   ├── mock_2026.json          # 350 players, 42 sets, real retentions
│   │   ├── legends_upgraded.json   # 248 legends, 26 sets
│   │   ├── legends_top100.json     # 100 players
│   │   └── mega.json               # 230+ players, no retentions
│   ├── teams.json                  # 10 franchise metadata (names, logos, colors)
│   ├── increment-tiers.json        # Bid increment rules (NEW)
│   └── squads.json                 # Legacy (DELETE after migration)
├── database/
│   └── connection.js               # MongoDB connection (unchanged)
├── utilities/
│   ├── generateCode.js             # nanoid(6) room codes (NEW)
│   ├── currency.js                 # Lakh↔Crore normalizer (NEW)
│   └── idempotency.js              # Sequence number validator (NEW)
├── client/
│   └── src/
│       ├── hooks/
│       │   ├── useSocket.js        # Socket lifecycle + reconnect (REWRITE)
│       │   └── useAuction.js       # Auction state reducer (NEW)
│       ├── pages/
│       │   ├── Home.js             # Landing + mode selection (REWRITE)
│       │   ├── SignUp.js           # Auth (unchanged)
│       │   ├── CreateRoom.js       # Create flow (NEW)
│       │   ├── RoomPage.js         # Join / view room (NEW)
│       │   ├── GamePage.js         # Live auction (NEW)
│       │   ├── PreviousAuctions.js # History (REWRITE)
│       │   └── About.js            # Static (unchanged)
│       ├── components/
│       │   ├── game/               # Game-specific components
│       │   │   ├── PlayerCard.js
│       │   │   ├── TimerDisplay.js
│       │   │   ├── BidPanel.js
│       │   │   ├── TeamRoster.js
│       │   │   ├── SquadTracker.js
│       │   │   └── AdminControls.js
│       │   ├── lobby/
│       │   │   ├── TeamSlot.js
│       │   │   └── ShareableCode.js
│       │   ├── room/
│       │   │   ├── ModeSelector.js
│       │   │   └── TeamPicker.js
│       │   ├── chat/
│       │   │   └── ChatPanel.js
│       │   ├── settings/
│       │   │   └── SettingsPanel.js
│       │   ├── Navbar.js
│       │   ├── Loading.js
│       │   └── Error.js
│       ├── services/
│       │   ├── socket.service.js   # Typed Socket.IO helpers (NEW)
│       │   └── api.service.js      # REST calls (NEW)
│       └── context/
│           └── AuctionContext.js   # Shared auction state (NEW)
```

---

## 4. Database Schema (MongoDB)

### 4.1 `rooms`

```yaml
Collection: rooms
Indexes:    { roomCode: 1 } unique
            { status: 1 }
            { adminUserId: 1 }

Document:
  roomCode:       String     # 6-char uppercase, unique
  adminUserId:    String     # username of creator
  status:         String     # WAITING | LIVE | PAUSED | ENDED
  mode:           String     # mock_2026 | legends_upgraded | legends_top100 | mega
  settings:       Object     # snapshot of settings applied when auction started
    timerDuration:  Number   # seconds per player (default 10)
    timerReset:     Number   # seconds added on bid (default 5)
    maxDuration:    Number   # cap after resets (default 20)
    bidIncrementMode: String # tiered | free
    maxSquadSize:   Number   # 25
    minSquadSize:   Number   # 18
    overseasLimit:  Number   # 8
    basePurse:      Number   # in lakhs (120 crore = 12000 lakh)
  createdAt:      Date
  updatedAt:      Date
```

**Key:** Room metadata is small and static after creation (except `status` and `settings`). No arrays, no embedded player data, no chat, no auction state.

### 4.2 `room_players`

```yaml
Collection: room_players
Indexes:    { roomCode: 1, userId: 1 } unique
            { roomCode: 1 }

Document:
  roomCode:       String
  userId:         String     # username
  team:           String     # franchise name (unique per room)
  joinedAt:       Date
  purseRemaining: Number     # in lakhs, starts at settings.basePurse
  overseasUsed:   Number     # starts at 0
  totalPlayers:   Number     # starts at 0
  squad:          [ObjectId] # references to purchased players (populated after auction)
```

**Key:** One document per player per room. Purse, overseas count, and squad size updated in-memory during auction; persisted to this collection at auction end.

### 4.3 `auction_logs`

```yaml
Collection: auction_logs
Indexes:    { roomCode: 1, seq: 1 } unique
            { roomCode: 1, timestamp: 1 }
            { roomCode: 1, event: 1 }

Document:
  roomCode:       String
  seq:            Number     # monotinically increasing per room
  event:          String     # player_served | bid_placed | player_sold | player_unsold |
                             # | settings_changed | rtm_exercised | round_started |
                             # | auction_paused | auction_resumed | player_recalled | undo
  timestamp:      Date
  actor:          String     # userId who triggered the event
  data:           Object     # event-specific payload
```

**Payload examples by event:**
| event | data |
|-------|------|
| `bid_placed` | `{ playerId, bidderId, amount }` |
| `player_sold` | `{ playerId, buyerId, amount }` |
| `player_unsold` | `{ playerId, reason: "timer_expired" | "admin_marked" }` |
| `undo` | `{ undoneSeq, reason }` |
| `rtm_exercised` | `{ playerId, teamId, matchedAmount }` |
| `player_recalled` | `{ playerId, oldBasePrice, newBasePrice, round }` |

**Key:** Append-only. Never updated. This is the source of truth for every auction result. On disconnect + reconnect, the client replays unseen seq numbers. Analytics and export derive from this log.

### 4.4 `chat_messages`

```yaml
Collection: chat_messages
Indexes:    { roomCode: 1, timestamp: 1 }
            { timestamp: 1, expireAfterSeconds: 2592000 }  # TTL 30 days

Document:
  roomCode:       String
  userId:         String
  userName:       String
  message:        String
  type:           String     # chat | system | bid_alert
  timestamp:      Date
```

**Key:** Separate collection. TTL index auto-deletes messages after 30 days. System messages (player sold, new player) are emitted as `type: "system"` rather than user chat.

### 4.5 `auction_results`

```yaml
Collection: auction_results
Indexes:    { roomCode: 1 }

Document:
  roomCode:       String
  mode:           String
  completedAt:    Date
  players: [{
    playerId:       String
    name:           String
    role:           String
    nationality:    String
    basePrice:      Number       # in lakhs
    soldTo:         String|null  # team or null if unsold
    soldAmount:     Number|null  # in lakhs
    status:         String       # sold | unsold | retained | rtm
  }]
  teams: [{
    userId:         String
    team:           String
    purseSpent:     Number
    playersBought:  Number
    finalSquad:     [playerId]
  }]
```

**Key:** Written once when the auction ends. Derived from `auction_logs` by replaying the event stream. Immutable after write. Used by the history page and export.

---

## 5. In-Memory State

```yaml
# Global server maps — live only while the process runs

auctionRegistry:
  Map<roomCode, AuctionMachine>
  # One AuctionMachine per active room. Created when admin starts
  # the auction, destroyed when the room transitions to ENDED.

socketBindings:
  Map<socketId, { roomCode, userId, team }>
  # Maps every connected socket to its room and user. Used for:
  #  - Authorizing admin-only actions
  #  - Sending targeted events (bid errors, undo confirmations)
  #  - Detecting socket disconnects for cleanup

timerRegistry:
  Map<roomCode, TimerHandle>
  # Each TimerHandle = { intervalId, remaining, startedAt }
  # Created per player, destroyed on sold/unsold/next.
  # Never persisted.

playerDatasetCache:
  Map<mode, Player[]>
  # Loaded from JSON files at startup. Shared across all rooms
  # of the same mode. Read-only during an auction.
```

### AuctionMachine Structure

```yaml
AuctionMachine (one per room):
  roomCode: String
  mode: String
  settings: Object # working copy of room.settings
  playerPool: Player[] # reference to cached dataset, never mutated

  # Set / player progression
  setQueue: number[] # remaining set indices to process
  currentSetIndex: number|null
  currentPlayerIndex: number
  round: number # 0 = first round, 1+ = accelerated/recall rounds

  # Current player auction state
  currentPlayerId: string|null
  currentBid: number # in lakhs
  currentHighBidder: string|null # userId
  bidderHistory: [{ userId, amount }] # all bids on current player (for undo)

  # Results accumulated during auction
  playerResults: Map<playerId, { status, soldTo, amount }>
  unsoldPool: playerId[] # player IDs that went unsold
  rtmQueue: playerId[] # players eligible for RTM (current team's former player sold to another team)

  # Audit
  auditSeq: number # monotonic counter, incremented on every event
  lastFlushedSeq: number # last seq persisted to DB (for batched writes)
```

**Lifecycle:**

1. Created in RAM when admin calls `startAuction`.
2. Player pool loaded from `playerDatasetCache.get(mode)` — a reference, not a copy.
3. Player results accumulated in `playerResults` Map.
4. At auction end: `playerResults` is serialized into `auction_results` collection, `room.status` set to `ENDED`, AuctionMachine destroyed.
5. On server crash: AuctionMachine is lost. On restart, room transitions to `PAUSED`. Admin resumes, and the machine is rebuilt from `auction_logs` replay.

---

## 6. Auction State Machine

### 6.1 Room-Level States

```
                 ┌──────────┐
                 │  WAITING  │  Players join, admin configures settings
                 └────┬─────┘
                      │ admin: start_auction
                      ▼
                 ┌──────────┐
          ┌──────│   LIVE    │──────┐
          │      └────┬─────┘      │
          │ admin:     │           │ admin:
          │ pause      │           │ end_auction
          │            │           │ (or all sets exhausted)
          ▼            │           ▼
    ┌─────────┐        │     ┌──────────┐
    │ PAUSED  │────────┘     │  ENDED    │
    └─────────┘  admin:      └──────────┘
                  resume
```

**Guard conditions:**

- `WAITING → LIVE`: At least 2 players joined. Admin must be present.
- `LIVE → PAUSED`: Admin only. Timer is frozen (interval cleared, remaining stored).
- `PAUSED → LIVE`: Admin only. Timer is resumed from stored remaining.
- `LIVE → ENDED`: Admin manually ends, OR all sets exhausted AND unsold pool empty.

### 6.2 Player-Level States (within LIVE)

```
                       admin advances to next player
                       ┌──────────────────────────────┐
                       ▼                              │
                  ┌─────────┐                         │
                  │ PENDING │  (next player loaded)   │
                  └────┬────┘                         │
                       │ admin: serve_player          │
                       ▼                              │
                  ┌─────────┐                         │
                  │  OPEN    │  timer running, no bids │
                  └────┬────┘                         │
          first bid │    │ timer=0, no bids           │
                    │    └──────────┐                 │
                    ▼               ▼                 │
           ┌──────────────┐  ┌──────────┐            │
           │BIDDING_ACTIVE│  │ UNSOLD   │────────────┤
           └──────┬───────┘  └──────────┘            │
                  │                                   │
                  │ timer=0, has bidder               │
                  ▼                                   │
           ┌──────────┐                              │
           │  SOLD    │──────────────────────────────┘
           └──────────┘  admin confirms (or auto-advances)
```

**Guard conditions:**

- `PENDING → OPEN`: Admin only. Serves the player card to all clients, starts timer.
- `OPEN → BIDDING_ACTIVE`: Any player with sufficient budget. Increment applied according to tiered rules.
- `BIDDING_ACTIVE → BIDDING_ACTIVE`: Another valid bid. Timer resets by `settings.timerReset` seconds, capped at `settings.maxDuration`.
- `BIDDING_ACTIVE → SOLD`: Timer expires with a current high bidder. Automatically transitions; no admin action required.
- `OPEN → UNSOLD`: Timer expires with no bid. Automatically transitions.
- `SOLD → PENDING`: Admin clicks Next, or auto-advances after 3-second post-sold display.
- `UNSOLD → PENDING`: Admin clicks Next, or auto-advances.

### 6.3 Recall / Accelerated Round States

```
After all primary sets complete:
  ┌──────────┐
  │ PRIMARY  │  (sets 1–N processed)
  └────┬─────┘
       │ unsoldPool.length > 0
       ▼
  ┌──────────────┐
  │ RECALL_ROUND │  round = 1, base prices reduced
  └──────┬───────┘
         │ process unsoldPool sequentially
         │ (same OPEN → BIDDING_ACTIVE → SOLD/UNSOLD)
         ▼
  ┌──────────────┐
  │ RECALL_ROUND │  round = 2, base prices further reduced
  └──────┬───────┘
         │ ... continues until:
         │   - unsoldPool is empty, OR
         │   - max recall rounds reached (configurable, default 3), OR
         │   - admin ends auction
         ▼
      ENDED
```

**Price reduction per round:**
| Round | Base price multiplier |
|-------|----------------------|
| 1 (primary) | 1.0× |
| 2 (recall 1) | 0.75× |
| 3 (recall 2) | 0.50× |
| 4 (recall 3) | 0.25× |

After round 4, unsold players are marked permanently unsold.

---

## 7. Socket.IO Event Architecture

### 7.1 Event Catalog

Every client→server event includes `{ roomCode, seq? }`. Every server→client broadcast includes `{ seq }`.

**Notation:**

- `B` = broadcast to all sockets in the room
- `S` = unicast to the sending socket only
- `A` = admin-gated (sender must be room admin)
- `I` = idempotent (replayed on reconnect without side effects)

#### Client → Server

| Event             | Gate | Idempotent | Payload                    | Response                                          |
| ----------------- | ---- | ---------- | -------------------------- | ------------------------------------------------- |
| `create_room`     | —    | —          | `{ mode, team }`           | `S: room_created { roomCode }`                    |
| `join_room`       | —    | —          | `{ roomCode, team }`       | `S: join_result { success }` + `B: player_joined` |
| `leave_room`      | —    | —          | `{ roomCode }`             | `B: player_left`                                  |
| `start_auction`   | A    | I          | `{ roomCode }`             | `B: auction_started`                              |
| `place_bid`       | —    | I          | `{ roomCode, seq }`        | `B: bid_placed` OR `S: bid_error`                 |
| `advance_player`  | A    | I          | `{ roomCode }`             | `B: player_served`                                |
| `mark_sold`       | A    | I          | `{ roomCode }`             | `B: player_sold`                                  |
| `mark_unsold`     | A    | I          | `{ roomCode }`             | `B: player_unsold`                                |
| `undo`            | A    | I          | `{ roomCode, seq? }`       | `B: state_reverted`                               |
| `exercise_rtm`    | —    | I          | `{ roomCode, playerId }`   | `B: rtm_exercised` OR `S: rtm_error`              |
| `pause_auction`   | A    | I          | `{ roomCode }`             | `B: auction_paused`                               |
| `resume_auction`  | A    | I          | `{ roomCode }`             | `B: auction_resumed`                              |
| `update_settings` | A    | —          | `{ roomCode, settings }`   | `B: settings_updated`                             |
| `chat_message`    | —    | —          | `{ roomCode, message }`    | `B: chat_message`                                 |
| `migrate_host`    | A    | —          | `{ roomCode, newAdminId }` | `B: host_migrated`                                |
| `fetch_state`     | —    | I          | `{ roomCode }`             | `S: full_state`                                   |

#### Server → Client

| Event                  | Broadcast | Payload                                                  |
| ---------------------- | --------- | -------------------------------------------------------- |
| `room_created`         | S         | `{ roomCode, mode }`                                     |
| `join_result`          | S         | `{ success, error?, roomState? }`                        |
| `player_joined`        | B         | `{ player: { userId, team, purseRemaining } }`           |
| `player_left`          | B         | `{ userId }`                                             |
| `auction_started`      | B         | `{ currentPlayer, timer }`                               |
| `player_served`        | B         | `{ player, basePrice, timer }`                           |
| `bid_placed`           | B         | `{ bidderId, amount, newTimer }`                         |
| `bid_error`            | S         | `{ message, code }`                                      |
| `player_sold`          | B         | `{ playerId, buyerId, amount, nextPlayer? }`             |
| `player_unsold`        | B         | `{ playerId, reason, nextPlayer? }`                      |
| `timer_tick`           | B         | `{ remaining }`                                          |
| `rtm_window`           | B         | `{ playerId, matchedTeam, amount, windowSeconds }`       |
| `rtm_exercised`        | B         | `{ playerId, teamId, amount, nextPlayer? }`              |
| `rtm_declined`         | B         | `{ playerId, teamId }`                                   |
| `auction_paused`       | B         | `{ remaining }`                                          |
| `auction_resumed`      | B         | `{ remaining }`                                          |
| `recall_round_started` | B         | `{ round, basePriceMultiplier, playerCount }`            |
| `settings_updated`     | B         | `{ settings }`                                           |
| `host_migrated`        | B         | `{ newAdminId }`                                         |
| `state_reverted`       | B         | `{ snapshot }` (full revert after undo)                  |
| `chat_message`         | B         | `{ userId, userName, message, type, timestamp }`         |
| `full_state`           | S         | `{ room, players, currentAuction, timer, results, seq }` |
| `auction_ended`        | B         | `{ summary }`                                            |
| `error`                | S         | `{ message, code }`                                      |

### 7.2 Event Lifecycle Diagram

```
Browser A (Admin)                    SERVER                     Browser B (Player)

── create_room ──────────────────►
                              ┌─ creates Room doc in MongoDB
                              └─ creates socketBinding
◄── room_created ────────────────

                                                       ── join_room ──────────────────►
                                                                                ┌─ validates capacity, team
                                                                                └─ inserts room_players doc
◄── player_joined ─────────────── B ── player_joined ──────────────────────────►
◄── player_joined ─────────────── B ── player_joined ──────────────────────────► (for each existing player)

── start_auction ───────────────►
                              ┌─ loads player dataset from cache
                              ┌─ creates AuctionMachine in RAM
                              ┌─ serves first player
                              ┌─ starts timer
◄── auction_started ──────────── B ── auction_started ─────────────────────────►
◄── player_served ────────────── B ── player_served ───────────────────────────►
◄── timer_tick ───────────────── B ── timer_tick ──────────────────────────────► (every second)

                                                       ── place_bid ──────────────────►
                                                                                ┌─ validates budget
                                                                                ┌─ validates timer > 0
                                                                                ┌─ applies tiered increment
                                                                                ┌─ logs auction_log entry
                                                                                ┌─ resets timer
◄── bid_placed ────────────────── B ── bid_placed ─────────────────────────────►

── place_bid ───────────────────►  (another bid by admin)
◄── bid_placed ────────────────── B ── bid_placed ─────────────────────────────►

                           ...timer counts down to 0...
                              ┌─ resolveBid(): marks sold
                              ┌─ deducts purse
                              ┌─ updates playerResults
                              ┌─ checks RTM eligibility
                              ┌─ serves next player
◄── player_sold ──────────────── B ── player_sold ─────────────────────────────►
◄── player_served ────────────── B ── player_served ───────────────────────────►

                           ...sets exhausted, recall round...
◄── recall_round_started ─────── B ── recall_round_started ────────────────────►

                           ...all done...
── end_auction ─────────────────►
                              ┌─ writes auction_results to MongoDB
                              ┌─ updates room_players with final squads
                              ┌─ sets room.status = ENDED
                              ┌─ destroys AuctionMachine
◄── auction_ended ────────────── B ── auction_ended ───────────────────────────►
```

### 7.3 Idempotency Model

Every state-changing client event carries `{ seq: number }`. The server tracks `lastSeenSeq` per socket. If a received `seq <= lastSeenSeq`, the event is acknowledged but not processed — the server re-emits `full_state` instead.

The `seq` is a client-side counter incremented on every action. It resets on socket reconnect (the client calls `fetch_state`, gets the current server `seq`, and resumes from there).

For events without an explicit `seq` (create_room, join_room), the server generates a server-assigned `seq` on the response.

### 7.4 Admin Gate Enforcement

Every admin-gated event checks:

```yaml
check:
  - room exists in auctionRegistry or rooms collection
  - socket is in socketBindings for roomCode
  - socketBindings[socketId].userId === room.adminUserId
  - OR socketBindings[socketId].userId === auctionMachine.delegatedAdminId
  - If none: emit S: error { code: "NOT_ADMIN" }
```

---

## 8. Backend Services

### 8.1 `auction.service.js` — AuctionMachine Orchestrator

```
Exports:
  createMachine(roomCode, mode, settings, playerPool) → AuctionMachine
  destroyMachine(roomCode)
  getMachine(roomCode) → AuctionMachine | null

  advancePlayer(machine)
  servePlayer(machine, io)
  resolveBid(machine, io)         # called when timer expires
  markSold(machine, io)            # admin override
  markUnsold(machine, io)          # admin override
  applyBid(machine, userId, io)    # returns { success } | throws BidError
  applyRTM(machine, teamId)        # returns { success } | throws RTMError
  undoLastAction(machine, io)      # returns { success } | throws UndoError

  beginRecallRound(machine, io)
  endAuction(machine, io)          # persists results, cleans up

  rebuildFromLogs(roomCode) → AuctionMachine  # recovery function
```

### 8.2 `bid.engine.js` — Pure Functions

```
Exports:
  getIncrement(currentBidInLakhs) → number (in lakhs)
  validateBid(machine, userId) → { valid: boolean, errorCode?: string }
  applyIncrement(currentBidInLakhs, increment) → number
  canAfford(remainingPurse, proposedBid) → boolean
```

**Increment tiers (in lakhs):**

```
const INCREMENT_TIERS = [
  { maxBid: 20,   increment: 5   },   // ₹20L: +₹5L
  { maxBid: 75,   increment: 5   },   // ₹20L–₹75L: +₹5L
  { maxBid: 100,  increment: 10  },   // ₹75L–₹1Cr: +₹10L
  { maxBid: 200,  increment: 25  },   // ₹1Cr–₹2Cr: +₹25L
  { maxBid: Infinity, increment: 50 }  // ₹2Cr+: +₹50L
]
```

**Currency normalization:** All amounts are stored and compared in _lakhs_ internally. The display layer converts to crores for the UI (1 crore = 100 lakh). The `currency.js` utility provides `toDisplay(valueInLakhs)` and `fromDisplay(valueInCrores)`.

### 8.3 `timer.service.js` — Decoupled Timer

```
Exports:
  startTimer(roomCode, duration, onTick, onExpire) → TimerHandle
  resetTimer(roomCode, addedSeconds, maxDuration)
  pauseTimer(roomCode) → remaining
  resumeTimer(roomCode, duration)
  stopTimer(roomCode)
  getRemaining(roomCode) → number

TimerHandle = { roomCode, remaining, intervalId }
```

The timer service accepts callbacks — it has no dependency on Socket.IO. The socket route calls it with `onTick: (remaining) => io.to(room).emit("timer_tick", { remaining })` and `onExpire: () => auctionService.resolveBid(machine, io)`.

### 8.4 `undo.stack.js`

```
Exports:
  createUndoStack(maxDepth) → UndoStack
  push(stack, action: { type, data, inverse })
  pop(stack) → action | null
  peek(stack) → action | null
  clear(stack)
```

Per room: max depth 5 actions. Only admin can undo. Undoable actions: `player_sold`, `player_unsold`, `rtm_exercised`. Bids are NOT individually undoable (undoing a sold player restores the pre-sale state including purse, which is sufficient).

### 8.5 `host.migration.js`

```
Exports:
  migrateHost(roomCode, newAdminUserId) → { success, error? }
```

On admin disconnect:

1. Wait 30 seconds for admin to reconnect.
2. If 30 seconds pass, send `host_migration_vote` to all remaining players.
3. Players can call `claim_host` (any player).
4. First claim becomes new admin. Broadcast `host_migrated`.
5. If original admin reconnects (they have higher priority), send them a notification — they can reclaim admin or let the migration stand.

If room is `WAITING` when admin disconnects: anyone can become admin (no vote). Room persists with the new admin.

---

## 9. Data Flow & Workflows

### 9.1 Room Creation

```
1. User opens /create, selects mode from ModeSelector
2. User selects franchise team from TeamPicker
3. Client calls POST /api/rooms/create  { mode, team }
4. Server:
   a. Generates 6-char code (retry on collision)
   b. Inserts rooms document:  { roomCode, adminUserId, mode, status: WAITING, settings }
   c. Inserts room_players:    { roomCode, userId, team, ... }
   d. Returns { roomCode }
5. Client navigates to /room/:code/lobby
6. Client establishes Socket.IO connection
7. Client emits join_room { roomCode } (admin also joins)
8. Server: socketBindings.set(socket.id, { roomCode, userId, team })
9. Server broadcasts player_joined to room
```

### 9.2 Player Joining

```
1. Player navigates to /room/WESEZC (shared URL)
2. Client fetches GET /api/rooms/WESEZC
   → receives { mode, status, teamsTaken: [...], players: [...] }
3. Player picks an available team
4. Client emits join_room { roomCode, team }
5. Server:
   a. Validates: room exists, status WAITING, team not taken, < 10 players
   b. Inserts room_players document
   c. Adds socket binding
   d. Broadcasts player_joined with new player list
6. Room creator sees updated player count in lobby
```

### 9.3 Auction Progression

```
Phase 1 — PRIMARY SETS
  Admin clicks "Start Auction"
  → Server creates AuctionMachine, loads first set, serves first player
  → Loop: serve → bid(s) expire → sold/unsold → advance → next player
  → When all sets done: check unsoldPool

Phase 2 — RTM WINDOW (only mock_2026 mode)
  For each player bought by a different team than their retained team:
    RTM team gets 10-second window
    If they exercise RTM at matched price → player goes to RTM team
    Else → player stays with buyer

Phase 3 — RECALL ROUNDS
  For each unsold player:
    Serve at reduced base price (round multiplier)
    Same bid/sold/unsold flow
    If sold at recall → removed from unsoldPool
    If unsold again → stays in unsoldPool for next recall round
  After max recall rounds → remaining unsold players are permanently unsold

Phase 4 — AUCTION END
  Admin clicks "End Auction" OR all sets + recall rounds complete
  → Server writes auction_results to MongoDB
  → Updates room_players with final squad lists and remaining purses
  → Room status → ENDED
  → Everyone sees auction summary
```

### 9.4 Bid Flow (Detailed)

```
1. Client emits place_bid { roomCode, seq }
2. Server:
   a. Checks event not already processed (seq check)
   b. Validates auction is LIVE and player state is OPEN or BIDDING_ACTIVE
   c. Validates timer > 0
   d. Validates sender has sufficient purse for (currentBid + increment)
   e. Validates sender hasn't exceeded max squad size or overseas limit
        (for overseas players)
   f. If all pass:
      - Records bid in machine.bidderHistory
      - Sets machine.currentBid to currentBid + increment
      - Sets machine.currentHighBidder to userId
      - Calls timerService.resetTimer(roomCode, settings.timerReset, settings.maxDuration)
      - Appends to auction_logs: { event: bid_placed, data: { playerId, bidderId, amount } }
      - Broadcasts bid_placed { bidderId, amount, newTimer }
   g. If any fail: emits S: bid_error { message, code }
```

---

## 10. Reconnection Handling

### 10.1 Client Reconnect

When socket.io reconnects:

```
1. Client socket emits fetch_state { roomCode, lastKnownSeq }
2. Server:
   a. re-adds socket to Socket.IO room: socket.join(roomCode)
   b. Updates socketBindings (new socket.id, same userId/team)
   c. If auction is ENDED: emits S: full_state { status: ENDED, summary }
   d. If auction is WAITING: emits S: full_state { players[], settings }
   e. If auction is LIVE or PAUSED: emits S: full_state { ... } (see below)
3. Client applies full_state to its reducer — replaces all local state
4. Client replays any unseen events from auction_logs[lastKnownSeq+1 ..]
```

### 10.2 `full_state` Payload

```json
{
  "roomCode": "WESEZC",
  "mode": "mock_2026",
  "status": "LIVE",
  "players": [
    {
      "userId": "player1",
      "team": "Mumbai Indians",
      "purseRemaining": 9500,
      "overseasUsed": 2,
      "totalPlayers": 5
    }
  ],
  "currentPlayer": { "id": "p123", "name": "...", "basePrice": 20 },
  "currentBid": 50,
  "currentHighBidderId": "player3",
  "timerRemaining": 7,
  "round": 0,
  "setIndex": 3,
  "playerIndex": 12,
  "totalPlayers": 350,
  "lastSeq": 184
}
```

The client uses this as a snapshot — replaces all local auction state and resumes listening for live events.

### 10.3 Server Restart

```
1. On startup, scan rooms collection for status = LIVE or PAUSED
2. For each such room:
   a. Set status = PAUSED (if LIVE)
   b. Read room_players
   c. Read auction_logs, replay into a new AuctionMachine
   d. Add machine to auctionRegistry
   e. Log: "Room WESEZC recovered in PAUSED state"
3. Admin must click "Resume" to continue
4. All players who reconnect get full_state with PAUSED status
```

Timer values are NOT recovered (they were in-flight). The recovered machine starts with `timerRemaining = settings.timerDuration` and `currentPlayer` stays in OPEN state.

---

## 11. Host Migration

```
Trigger: Admin socket disconnects

Step 1 — Grace period (30 seconds):
  - Server sets room.adminDisconnectedAt = now
  - All clients see "Admin disconnected — waiting..." overlay
  - If admin reconnects within 30s → overlay disappears, auction resumes
  - Socket binding is re-established for the new socket

Step 2 — Migration (30 seconds elapsed):
  - Server broadcasts host_migration_vote { candidates: remaining players[] }
  - Any remaining player can emit claim_host
  - First claim wins: server sets room.adminUserId = claimer
  - Server broadcasts host_migrated { newAdminId }
  - All clients update UI: new player sees admin controls
  - Auction resumes from current state

Step 3 — Original admin returns:
  - Server detects original admin reconnecting
  - Sends notification: "Host was migrated to X. Click to reclaim."
  - Original admin can emit reclaim_host → if within 60s of migration, allowed
  - Otherwise migration is permanent
```

**Edge case:** If no remaining players claim host within 60s, auction ends with status `TIMEOUT`.

---

## 12. Undo / Rollback System

### 12.1 Scope

Undo supports reversing the most recent _player-resolution_ action (sold or unsold). Undoing a sold player:

```
1. Admin clicks Undo (only visible immediately after sold/unsold, before advancing)
2. Server:
   a. Removes player from buyer's squad
   b. Refunds buyer's purse (amount deducted)
   c. Removes playerResult entry
   d. Rolls back auditSeq by 1 (marks the sold event as undone)
   e. Logs: auction_logs { event: "undo", data: { undoneSeq: N } }
   f. Sets player state back to OPEN
   g. Serves the same player again (timer restarts)
3. Broadcasts state_reverted { playerId, restoredPurse }
```

### 12.2 Limits

- Max undo depth: 5 actions.
- Undo only available to admin.
- Undo only available while the same player is still current (before advancing).
- Undo is NOT available after advancing to the next player.
- Undo logs are permanent — the original action log is NOT deleted, only marked as reversed.

---

## 13. RTM (Right to Match) Logic

RTM applies only in `mock_2026` mode where players are pre-assigned to teams (retentions).

### 13.1 Trigger

When a player is sold (timer expires with a bidder), the server checks:

- Is the bought player's `retainedBy` team different from the buyer?
- Is the retainedBy team present in this room?
- Has the retainedBy team NOT yet used all their RTM cards?
  (Each team gets a configurable number of RTM cards — default 3)

### 13.2 RTM Flow

```
1. Player sold to Team B for ₹X
2. Server checks: retainedBy = "Team A", Team A is in room, RTM cards > 0
3. Server broadcasts rtm_window { playerId, matchedTeam: "Team A", amount: X, windowSeconds: 15 }
4. Team A's player sees an "Exercise RTM" button for 15 seconds
5. If Team A clicks RTM:
   - Team A pays ₹X (deducted from their purse)
   - Player goes to Team A
   - Team A's RTM cards -= 1
   - Broadcast rtm_exercised { playerId, teamId, amount }
6. If 15s expires:
   - Broadcast rtm_declined { playerId, teamId }
   - Player stays with Team B
```

Purse validation: Team A must have sufficient purse to exercise RTM. If they cannot afford it, the RTM button is disabled with a tooltip.

---

## 14. Retention Logic

### 14.1 Pre-Auction Setup (mock_2026 mode)

Before the auction starts:

1. Player dataset contains `isRetained: true` and `retainedBy: teamName` for retained players.
2. Those players are pre-assigned to the retained team's squad.
3. Their `retentionCost` is deducted from that team's starting purse.
4. Retained players are NOT in the auction player pool (they're already assigned).
5. The remaining player pool (non-retained players) goes through the auction.

### 14.2 Retention Display

- Lobby shows each team's retained players in a collapsed panel.
- Retained players count toward squad size limits.
- Retained overseas players count toward the overseas limit.

---

## 15. Recall / Accelerated Rounds

### 15.1 Round Parameters

| Parameter         | Value                                        |
| ----------------- | -------------------------------------------- |
| Max recall rounds | 3                                            |
| Round multipliers | [1.0, 0.75, 0.50, 0.25]                      |
| Base price floor  | 10 lakh (₹10L minimum)                       |
| Round transition  | Manual (admin clicks "Start Recall Round N") |

### 15.2 Price Calculation

```
newBasePrice = max(
  10,  // floor of 10 lakh
  Math.floor(player.basePrice * roundMultiplier)
)

Example:
  Player base price ₹50L:
    Round 1 (primary): ₹50L
    Round 2 (recall 1): ₹37L  (floor of 37.5)
    Round 3 (recall 2): ₹25L
    Round 4 (recall 3): ₹12L  (floor of 12.5)
```

### 15.3 Flow

```
1. All primary sets complete → unsoldPool populated
2. Admin sees: "X players unsold. Start Recall Round 1?"
3. Admin confirms → recall_round_started broadcast
4. Unsold players are served in shuffled order at reduced base prices
5. Same OPEN → BID → SOLD/UNSOLD flow as primary
6. Players sold in recall → removed from unsoldPool
7. Players unsold again → remain in unsoldPool (base price further reduced next round)
8. After max rounds → remaining unsold marked permanently
```

---

## 16. Bid Engine & Validation

### 16.1 Validation Rules (order checked)

1. **Room status** is `LIVE` (not WAITING, PAUSED, or ENDED).
2. **Player auction status** is `OPEN` or `BIDDING_ACTIVE`.
3. **Timer** > 0 seconds.
4. **Self-bid prevention**: sender is not the current high bidder.
5. **Budget**: `senderPurse >= currentBid + getIncrement(currentBid)`.
6. **Squad size**: sender's `totalPlayers < settings.maxSquadSize`.
7. **Overseas limit**: if player is overseas AND `sender.overseasUsed >= settings.overseasLimit` → blocked.
8. **Role balancing** (soft, configurable): minimum batsmen/bowlers check (optional).

### 16.2 Error Codes

| Code                 | Message                                          |
| -------------------- | ------------------------------------------------ |
| `AUCTION_NOT_LIVE`   | "Auction is not currently active"                |
| `PLAYER_NOT_OPEN`    | "Cannot bid on this player right now"            |
| `TIMER_EXPIRED`      | "Bidding time has expired"                       |
| `SELF_BID`           | "You are already the highest bidder"             |
| `INSUFFICIENT_FUNDS` | "You don't have enough budget for this bid"      |
| `SQUAD_FULL`         | "Your squad is at maximum capacity (25)"         |
| `OVERSEAS_FULL`      | "You have reached the overseas player limit (8)" |

### 16.3 Concurrent Bid Handling

Bids arrive asynchronously via Socket.IO. The server processes them sequentially per room (Node.js single-threaded event loop guarantees this). If two bids arrive in rapid succession:

1. Bid 1 processed (validates, updates state, resets timer).
2. Bid 2 processed (validates against _new_ state — currentBid is now higher, timer just reset).

No explicit locking needed for single-process Node.js.

---

## 17. Timer System

### 17.1 Timer States

```
  IDLE ──(admin serves player)──► RUNNING
  RUNNING ──(bid received)────► RUNNING (remaining += resetAmount, capped)
  RUNNING ──(remaining == 0)──► EXPIRED
  RUNNING ──(admin pauses)────► PAUSED (remaining saved, interval cleared)
  PAUSED  ──(admin resumes)───► RUNNING (interval restarted from saved remaining)
  EXPIRED ──(admin advances)──► IDLE (or next timer starts)
```

### 17.2 Timer Drift Prevention

JavaScript `setInterval` is imprecise (can drift up to 5ms/tick). Over a 20-second auction, this is negligible. However, for very long auctions:

- Each tick records `Date.now()`.
- The `remaining` value is recalculated as `Math.ceil((expiresAt - Date.now()) / 1000)` rather than `remaining--`, which prevents cumulative drift.

### 17.3 Client Timer Display

The client receives `timer_tick { remaining }` every second and renders it verbatim. The client NEVER runs its own countdown. If `timer_tick` events are delayed (network lag), the UI may jump (e.g., 10 → 7), which is correct — it reflects the actual server state.

---

## 18. Purse & Squad Constraints

### 18.1 Purse Model

| Concept                                    | Value                      | Unit             |
| ------------------------------------------ | -------------------------- | ---------------- |
| Starting purse (mega mode)                 | 12,000                     | lakhs (= 120 Cr) |
| Starting purse (mock_2026 with retentions) | 12,000 – Σ(retentionCosts) | lakhs            |
| Budget display                             | purse / 100                | crores (UI only) |
| Bid display                                | bid / 100                  | crores (UI only) |
| Internal storage                           | lakhs                      | always           |

### 18.2 Squad Constraints (per team)

**Hard limits (enforced by server during bidding):**

- Maximum players: 25
- Maximum overseas players: 8

**Soft limits (advisory, not enforced):**

- Minimum players: 18

If a team has fewer than 18 players when the auction ends, the admin is prompted to assign unsold players at base price. The system does NOT auto-assign.

### 18.3 Overseas Counter

```yaml
check (on bid for overseas player):
  player.nationality === "overseas" AND
  team.overseasUsed >= settings.overseasLimit:
    → reject: "OVERSEAS_FULL"
```

Overseas status is determined by the player dataset's `nationality` field. "Indian" players do not count toward the limit.

---

## 19. Chat System

### 19.1 Message Flow

```
1. Client emits chat_message { roomCode, message }
2. Server:
   a. Truncates message to 500 characters
   b. Strips HTML tags
   c. Creates chat_messages document in MongoDB
   d. Broadcasts chat_message { userId, userName, message, type: "chat", timestamp }
3. All clients append to chat panel
```

### 19.2 System Messages

Server-generated messages for auction events:

```yaml
event → system message:
  player_served: "SYSTEM: [playerName] is now up for auction (base price ₹XL)"
  bid_placed: "SYSTEM: [bidderName] bids ₹XL"
  player_sold: "SYSTEM: [playerName] sold to [teamName] for ₹XL"
  player_unsold: "SYSTEM: [playerName] goes unsold"
  auction_paused: "SYSTEM: Auction paused by admin"
  host_migrated: "SYSTEM: Host transferred to [newAdminName]"
```

These are emitted as `type: "system"`, rendered differently in the chat panel (italic, grey background).

### 19.3 Chat Persistence

- Messages stored in `chat_messages` collection.
- TTL index auto-deletes after 30 days.
- On client connect/reconnect, the last 50 messages are loaded via `fetch_state`.
- Full chat history is NOT loaded on reconnect (only last 50).

---

## 20. Multiple Auction Modes

### 20.1 Mode Definitions

| Mode               | Dataset               | Sets | Players | Purse  | Retentions       | RTM           |
| ------------------ | --------------------- | ---- | ------- | ------ | ---------------- | ------------- |
| `mock_2026`        | mock_2026.json        | 42   | 350     | 120 Cr | Yes (₹ deducted) | Yes (3 cards) |
| `legends_upgraded` | legends_upgraded.json | 26   | 248     | 120 Cr | No               | No            |
| `legends_top100`   | legends_top100.json   | 1    | 100     | 120 Cr | No               | No            |
| `mega`             | mega.json             | 1    | 230     | 120 Cr | No               | No            |

### 20.2 Mode-Specific Logic

```
on startAuction(mode):
  loadPlayerDataset(mode)      # from cache or disk
  if mode === "mock_2026":
    applyRetentions()          # pre-assign retained players, deduct costs
    enableRTM = true
    startingPurse = 12000 - retentionCosts (per team)
  else:
    startingPurse = 12000 (per team)

  if mode has sets > 1:
    orderPlayersIntoSets()     # preserve set ordering from dataset
  else:
    shuffle players            # single-set modes: random order
```

---

## 21. Team Selection

### 21.1 Available Teams

Defined in `data/teams.json`:

```json
[
  { "id": "csk", "name": "Chennai Super Kings", "color": "#FFCC00", "logo": "/logos/csk.png" },
  { "id": "mi",  "name": "Mumbai Indians",       "color": "#004BA0", "logo": "/logos/mi.png"  },
  ...
]
```

### 21.2 Selection Rules

- One team per player per room (enforced by unique constraint on `room_players.team`).
- Team selection happens once: at room creation for the admin, at join for other players.
- Once selected, the team cannot be changed (no mid-auction team swap).
- If a player leaves the room, their team becomes available again.

### 21.3 Team Validation

```
POST /api/rooms/:code/validate-team { team }

Response:
  200 { available: true }
  409 { available: false, message: "Chennai Super Kings is already taken by playerX" }
```

---

## 22. Settings System

### 22.1 Configurable Settings

| Setting            | Default  | Range              | Applies                                           |
| ------------------ | -------- | ------------------ | ------------------------------------------------- |
| `timerDuration`    | 10s      | 5–30s              | Next player served                                |
| `timerReset`       | 5s       | 1–10s              | Next bid placed                                   |
| `maxDuration`      | 20s      | 10–60s             | Cap after resets                                  |
| `bidIncrementMode` | "tiered" | "tiered" \| "free" | Immediately                                       |
| `maxSquadSize`     | 25       | 18–30              | Next bid validation                               |
| `minSquadSize`     | 18       | 12–25              | End-of-auction warning                            |
| `overseasLimit`    | 8        | 4–12               | Next bid validation                               |
| `rtmCards`         | 3        | 0–5                | Next RTM window                                   |
| `maxRecallRounds`  | 3        | 1–5                | Next recall round                                 |
| `autoAdvance`      | false    | bool               | If true, advances after sold/unsold automatically |

### 22.2 Settings Persistence

Settings are stored in the `rooms` document. They are read when the AuctionMachine is created. Changes mid-auction:

- `timerDuration`, `timerReset`, `maxDuration`: apply to the _next_ player served (not the current one).
- `maxSquadSize`, `overseasLimit`: apply immediately.
- All changes are logged: `auction_logs { event: "settings_changed", data: { old, new } }`.

### 22.3 Settings Validation

Settings changes are validated:

- `minSquadSize <= maxSquadSize`
- `timerReset <= maxDuration`
- All values within specified ranges

Invalid setting changes are rejected with `S: error { code: "INVALID_SETTINGS" }`.

---

## 23. Analytics & Audit Trail

### 23.1 Audit Trail

Every state change is logged to `auction_logs`. This provides:

- Full replay capability: rebuild auction state from log at any point.
- Dispute resolution: who bid what and when.
- Post-auction analysis: price trends, bidder behavior.

### 23.2 Derived Analytics (computed from logs)

| Metric                       | Derivation                                   |
| ---------------------------- | -------------------------------------------- |
| Most expensive player        | `max` sold amount across all players         |
| Team spend distribution      | Sum of sold amounts per team                 |
| Unsold player count          | Count of `player_unsold` events              |
| Average bid count per player | `bid_placed` events ÷ `player_served` events |
| Admin action count           | Events where `actor === adminUserId`         |
| Auction duration             | `lastLog.timestamp - firstLog.timestamp`     |

Analytics are computed on-demand (REST endpoint, not stored). No real-time analytics during the auction — only post-hoc.

---

## 24. Export System

### 24.1 Export Formats

```
GET /api/rooms/:code/export?format=json   →  Full auction_results as JSON
GET /api/rooms/:code/export?format=csv    →  Players sold/unsold as CSV
GET /api/rooms/:code/export?format=pdf    →  Future: PDF report
```

### 24.2 CSV Columns

```
Player Name, Role, Nationality, Base Price (L), Sold To, Sold Amount (L), Status
MS Dhoni, Wicket-keeper, Indian, 200, Chennai Super Kings, 750, Sold
...
```

### 24.3 Team-Specific Export

```
GET /api/rooms/:code/export?format=json&team=csk
  →  Only players bought by CSK + CSK's final squad
```

---

## 25. Error Handling

### 25.1 Error Taxonomy

| Category                                                   | Handling                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Validation errors** (invalid bid, team taken, room full) | `S: error` to sender. User sees inline error. Auction continues.                                                                                                                                                                                                                                        |
| **Admin gate errors** (non-admin tries admin action)       | `S: error { code: "NOT_ADMIN" }`. Button is already disabled on client; this is defense-in-depth.                                                                                                                                                                                                       |
| **Connection errors** (socket disconnect)                  | Client shows reconnect overlay. Server waits grace period. Host migration if admin.                                                                                                                                                                                                                     |
| **Server errors** (uncaught exception)                     | Global error handler. Logs stack trace. Emits `S: error { code: "SERVER_ERROR" }`. Shuts down gracefully and lets the process manager (PM2, systemd, Render) restart. `process.on("uncaughtException")` is avoided — an uncaught exception often leaves state inconsistent; crash-and-restart is safer. |
| **Data errors** (corrupt player dataset, missing mode)     | Fails fast at startup (`loadPlayerDatasets()` throws if any dataset is invalid). Server refuses to start.                                                                                                                                                                                               |
| **DB errors** (MongoDB unreachable)                        | Auction continues in-memory. DB writes queued. If queue grows too large (> 100 pending), auction pauses and clients see "Database unavailable — auction paused".                                                                                                                                        |

### 25.2 Client Error Display

```
Error types → UI treatment:
  - bid_error:     Toast notification (auto-dismiss 3s)
  - join_error:    Inline error on the join form
  - NOT_ADMIN:     Not shown (button already hidden)
  - SERVER_ERROR:  Full-page overlay with "Something went wrong. Please wait..."
  - DISCONNECTED:  Overlay with countdown "Reconnecting in Xs..."
```

---

## 26. Security Considerations

### 26.1 Admin Authorization

Every admin-gated event is checked server-side. The client hides admin buttons via the `isAdmin` flag, but the server MUST verify independently. Socket bindings are the source of truth for who is admin.

### 26.2 Bid Validation

The client displays clickable bid buttons with calculated amounts. A user cannot inject arbitrary bid amounts because:

- The server ignores any `amount` sent by the client.
- The server independently computes `currentBid + getIncrement(currentBid)`.
- The `place_bid` event does NOT include an amount field.

### 26.3 Timer Manipulation

The timer runs exclusively on the server. The client never sends timer state. The client cannot fast-forward, pause, or reset the timer.

### 26.4 Rate Limiting

Per-socket rate limits (via middleware):

- `place_bid`: max 1 per 500ms
- `chat_message`: max 5 per second
- `claim_host`: max 1 per 2 seconds

Violations result in `S: error { code: "RATE_LIMITED" }`.

### 26.5 Input Sanitization

- Chat messages: HTML stripped, max 500 chars.
- Room codes: validated against regex `/^[A-Z0-9]{6}$/`.
- Team names: validated against known team list.
- User IDs: validated as alphanumeric.

---

## 27. Future Extensibility

### 27.1 New Auction Modes

To add a new mode:

1. Create `data/players/<new_mode>.json` with the player dataset.
2. Add mode metadata to `config/constants.js` (mode name, display name, description).
3. If the mode requires special logic (like RTM in `mock_2026`), add a `modeHandlers` map in `auction.service.js`:
   ```yaml
   modeHandlers[mode].onBeforeAuction(machine)
   modeHandlers[mode].onAfterPlayerSold(machine, playerId)
   modeHandlers[mode].onBeforeRecallRound(machine)
   ```
4. The frontend auto-discovers modes from a REST endpoint (`GET /api/modes`).

### 27.2 Custom Settings Presets

Admins can save named presets ("Quick Game": timer=5, reset=3, autoAdvance=true). Stored in a `settings_presets` collection, loaded in the admin panel.

### 27.3 Spectator Mode

Future: allow users to join a room as spectators (no team, no bidding, view-only). Requires a `role` field on `room_players` and a spectator-only UI variant.

### 27.4 Redis Adapter for Multi-Instance

If the app scales to multiple Node.js processes, replace the in-memory `auctionRegistry` with Redis:

- Socket.IO Redis adapter for cross-instance broadcasting.
- `auctionRegistry` backed by Redis Hash (key: roomCode, value: serialized machine).
- `timerRegistry` moved to Redis with `setInterval` in a single leader process.
- `socketBindings` replaced by Socket.IO adapter's built-in socket tracking.

This is a future optimization — the single-process model works for the expected load (dozens of concurrent rooms).

### 27.5 Player Dataset Management UI

Future: an admin-only page to upload/validate player datasets without touching the server filesystem. Datasets stored in MongoDB `player_datasets` collection instead of JSON files. Validated on upload.

---

## 28. Migration Strategy

### 28.1 Principle: Ship Incrementally

Never rewrite everything at once. Each migration step ships a working system.

### 28.2 Migration Steps

**Step 0 — Preserve current codebase (already done)**
The current `master` branch is a working deployment (Vercel frontend, Render backend). All new work goes on a `v2` branch.

**Step 1 — Add MongoDB models + REST endpoints (no game logic changes)**

- Add `rooms`, `room_players` collections and models.
- Add `POST /api/rooms/create`, `GET /api/rooms/:code`.
- Add `generateCode.js`, `currency.js`.
- Existing Socket.IO game logic is untouched. These are NEW endpoints.

**Step 2 — Add player dataset files**

- Create `data/players/mega.json` (smallest mode, 230 players, 1 set).
- Create `data/teams.json`, `data/increment-tiers.json`.
- Validate parsers load them correctly.

**Step 3 — Build new frontend pages (read-only, no game)**

- Create `/create` page with ModeSelector + TeamPicker.
- Create `/room/:code` page that shows the room info via REST.
- All existing pages (`/auction`, `/`) remain functional.

**Step 4 — Build Lobby with Socket.IO (WAITING state only)**

- Replace CreateAuction/Lobby with new RoomPage/Lobby that uses the new Socket.IO events (`create_room`, `join_room`, `player_joined`).
- Game is not started yet — only room creation and joining.
- Deploy and verify multiplayer room creation works.

**Step 5 — Add AuctionMachine (server RAM, no persistence during game)**

- Implement `auction.service.js`, `bid.engine.js`, `timer.service.js`.
- Wire Socket.IO events for the full auction flow.
- Auction runs entirely in memory. Results logged to `auction_logs` (MongoDB) in the background.
- At auction end, persist final results.

**Step 6 — Build Game page**

- New `/room/:code/auction` page with PlayerCard, TimerDisplay, BidPanel, TeamRoster, AdminControls.
- Replace old `Game.js` component.

**Step 7 — Add recall rounds, RTM, retention logic**

- Layer these on top of the working game flow.

**Step 8 — Add chat, settings, analytics, export**

- Independent features that don't affect core game logic.

**Step 9 — Add host migration, undo system**

- Resilience features.

**Step 10 — Delete old files**

- Remove `controller/auction.js` (old class), `controller/game.js` (old orchestrator).
- Remove old client: `pages/Auction.js`, `components/CreateAuction.js`, `components/JoinAuction.js`, `components/Lobby.js`, `components/Game.js`.
- Retain: `data/squads.json` (legacy reference, not loaded at startup).

### 28.3 Backward Compatibility During Migration

Steps 1–3 are additive — the old system still works while new files are added. Steps 4–6 replace Socket.IO events and frontend components. During the replacement:

- Old Socket.IO events (`createAuction`, `joinAuction`, `start`, `bid`, `next`) are deprecated but still handled by a **compatibility layer** that maps them to new events.
- Old frontend routes (`/auction`) redirect to new routes (`/create`).
- Old localStorage-based auth continues to work unchanged.

### 28.4 Testing Gates

Each step must pass:

- Module load test: `node -e "require('./app')"` succeeds.
- Socket.IO smoke test: two test scripts connect, create room, join room, observe events.
- Frontend build: `npm run build` in `client/` succeeds.
- Deploy smoke test: Vercel frontend loads, Render health check returns 200.

No step is merged to `master` until all gates pass.
