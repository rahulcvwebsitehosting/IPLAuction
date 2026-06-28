import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/";

export default function useSocket(roomCode, userId, team, handlers = {}) {
  const [socket, setSocket] = useState(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (socket?.connected) return;
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    setSocket(s);

    const on = (event, fn) => s.on(event, (...args) => fn(...args));

    on("connect", () => handlersRef.current.onConnect?.());
    on("disconnect", () => handlersRef.current.onDisconnect?.());
    on("connect_error", (err) => handlersRef.current.onError?.(err.message));

    on("full_state", (data) => handlersRef.current.onFullState?.(data));
    on("join_result", (data) => handlersRef.current.onJoinResult?.(data));
    on("auction_started", (data) =>
      handlersRef.current.onAuctionStarted?.(data)
    );
    on("player_served", (data) => handlersRef.current.onPlayerServed?.(data));
    on("player_sold", (data) => handlersRef.current.onPlayerSold?.(data));
    on("player_unsold", (data) => handlersRef.current.onPlayerUnsold?.(data));
    on("bid_placed", (data) => handlersRef.current.onBidPlaced?.(data));
    on("bid_error", (data) => handlersRef.current.onBidError?.(data));
    on("timer_tick", (data) => handlersRef.current.onTimerTick?.(data));
    on("budget_updated", (data) => handlersRef.current.onBudgetUpdated?.(data));
    on("chat_message", (data) => handlersRef.current.onChatMessage?.(data));
    on("player_joined", (data) => handlersRef.current.onPlayerJoined?.(data));
    on("player_left", (data) => handlersRef.current.onPlayerLeft?.(data));
    on("recall_round_started", (data) =>
      handlersRef.current.onRecallRoundStarted?.(data)
    );
    on("rtm_window", (data) => handlersRef.current.onRtmWindow?.(data));
    on("rtm_exercised", (data) => handlersRef.current.onRtmExercised?.(data));
    on("rtm_declined", (data) => handlersRef.current.onRtmDeclined?.(data));
    on("rtm_error", (data) => handlersRef.current.onRtmError?.(data));
    on("state_reverted", (data) => handlersRef.current.onStateReverted?.(data));
    on("auction_paused", (data) => handlersRef.current.onAuctionPaused?.(data));
    on("auction_resumed", (data) =>
      handlersRef.current.onAuctionResumed?.(data)
    );
    on("auction_ended", (data) => handlersRef.current.onAuctionEnded?.(data));
    on("settings_updated", (data) =>
      handlersRef.current.onSettingsUpdated?.(data)
    );
    on("host_migration_vote", (data) =>
      handlersRef.current.onHostMigrationVote?.(data)
    );
    on("error", (data) => handlersRef.current.onSocketError?.(data));
  }, [socket]);

  const disconnect = useCallback(() => {
    setSocket(null);
  }, []);

  useEffect(() => {
    if (roomCode && userId && team) {
      connect();
    }
    return () => {
      if (socket) socket.disconnect();
      setSocket(null);
    };
  }, [roomCode, userId, team, connect, disconnect, socket]);

  return { socket, connect, disconnect };
}
