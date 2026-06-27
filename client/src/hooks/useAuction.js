import { useReducer, useCallback } from "react";

const initialState = {
  room: null,
  players: [],
  isAdmin: false,
  chatMessages: [],
  auctionState: null,
  currentPlayer: null,
  currentBid: 0,
  currentHighBidder: null,
  currentPlayerState: null,
  timerRemaining: 0,
  round: 0,
  isLive: false,
  isPaused: false,
  isEnded: false,
  recallActive: false,
  rtmActive: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_FULL_STATE":
      const room = action.payload.room;
      const isLive = room?.status === "LIVE";
      const isPaused = room?.status === "PAUSED";
      const isEnded = room?.status === "ENDED";
      const aState = action.payload.auctionState;
      return {
        ...state,
        room,
        players: action.payload.players || [],
        isAdmin: action.payload.isAdmin || false,
        chatMessages: action.payload.chatMessages || [],
        auctionState: aState,
        currentPlayer: aState?.currentPlayer || null,
        currentBid: aState?.currentBid || 0,
        currentHighBidder: aState?.currentHighBidderId || null,
        currentPlayerState: aState?.currentPlayerState || null,
        timerRemaining: aState?.timerRemaining || 0,
        round: aState?.round || 0,
        isLive,
        isPaused,
        isEnded,
        error: null,
      };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "AUCTION_STARTED":
      return { ...state, isLive: true, isPaused: false, isEnded: false };

    case "PLAYER_SERVED":
      return {
        ...state,
        currentPlayer: action.payload.player,
        currentBid: action.payload.basePrice > 0 ? action.payload.basePrice : 0,
        currentHighBidder: null,
        currentPlayerState: "OPEN",
        timerRemaining: action.payload.timer || 0,
        round: action.payload.round || 0,
        recallActive: false,
        rtmActive: false,
      };

    case "BID_PLACED":
      return {
        ...state,
        currentBid: action.payload.amount,
        currentHighBidder: action.payload.bidderId,
        currentPlayerState: "BIDDING_ACTIVE",
        timerRemaining: action.payload.newTimer || state.timerRemaining,
      };

    case "BID_ERROR":
      return { ...state, error: action.payload };

    case "TIMER_TICK":
      return { ...state, timerRemaining: action.payload.remaining };

    case "PLAYER_SOLD":
      const soldBidderId = action.payload.buyerId;
      return {
        ...state,
        currentPlayerState: "SOLD",
        rtmActive: !!action.payload.rtm,
        players: state.players.map((p) =>
          p.userId === soldBidderId
            ? {
                ...p,
                purseRemaining: (p.purseRemaining || 0) - action.payload.amount,
                totalPlayers: (p.totalPlayers || 0) + 1,
              }
            : p
        ),
      };

    case "PLAYER_UNSOLD":
      return { ...state, currentPlayerState: "UNSOLD" };

    case "BUDGET_UPDATED":
      return { ...state, players: action.payload.players || state.players };

    case "RECALL_ROUND_STARTED":
      return { ...state, recallActive: true, round: action.payload.round };

    case "RTM_WINDOW":
      return { ...state, rtmActive: true };

    case "RTM_EXERCISED":
      return {
        ...state,
        rtmActive: false,
        currentPlayerState: "SOLD",
        players: state.players.map((p) => {
          if (p.team === action.payload.teamId) {
            return {
              ...p,
              purseRemaining: (p.purseRemaining || 0) - action.payload.amount,
              totalPlayers: (p.totalPlayers || 0) + 1,
            };
          }
          return p;
        }),
      };

    case "RTM_DECLINED":
      return { ...state, rtmActive: false };

    case "STATE_REVERTED":
      if (action.payload.snapshot) {
        const snap = action.payload.snapshot;
        return {
          ...state,
          currentPlayer: snap.currentPlayer,
          currentBid: snap.currentBid || 0,
          currentHighBidder: snap.currentHighBidderId || null,
          currentPlayerState: snap.currentPlayerState,
          timerRemaining: snap.timerRemaining || 0,
          round: snap.round || 0,
          players: snap.players || state.players,
        };
      }
      return state;

    case "AUCTION_PAUSED":
      return {
        ...state,
        isLive: false,
        isPaused: true,
        timerRemaining: action.payload.remaining,
      };

    case "AUCTION_RESUMED":
      return {
        ...state,
        isLive: true,
        isPaused: false,
        timerRemaining: action.payload.remaining,
      };

    case "AUCTION_ENDED":
      return {
        ...state,
        isLive: false,
        isPaused: false,
        isEnded: true,
        auctionState: null,
      };

    case "SETTINGS_UPDATED":
      return {
        ...state,
        room: state.room
          ? { ...state.room, settings: action.payload.settings }
          : state.room,
      };

    case "CHAT_MESSAGE":
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload].slice(-100),
      };

    case "PLAYER_JOINED":
      return { ...state, players: action.payload.players || state.players };

    case "PLAYER_LEFT":
      return {
        ...state,
        players: state.players.filter(
          (p) => p.userId !== action.payload.userId
        ),
      };

    case "HOST_MIGRATION":
      return { ...state, hostMigration: true };

    default:
      return state;
  }
}

export default function useAuction() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setFullState = useCallback(
    (data) => dispatch({ type: "SET_FULL_STATE", payload: data }),
    []
  );
  const setError = useCallback(
    (err) => dispatch({ type: "SET_ERROR", payload: err }),
    []
  );
  const clearError = useCallback(() => dispatch({ type: "CLEAR_ERROR" }), []);

  return { state, dispatch, setFullState, setError, clearError };
}
