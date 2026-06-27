import React, {
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useParams, useHistory } from "react-router-dom";
import { UserContext } from "../hooks/UserContext";
import useSocket from "../hooks/useSocket";
import useAuction from "../hooks/useAuction";
import API from "../services/api.service";
import * as SocketEvents from "../services/socket.service";
import PlayerCard from "../components/PlayerCard";
import BidPanel from "../components/BidPanel";
import TeamRoster from "../components/TeamRoster";
import SquadTracker from "../components/SquadTracker";
import AdminControls from "../components/AdminControls";
import ChatPanel from "../components/ChatPanel";
import SettingsPanel from "../components/SettingsPanel";
import TeamPicker from "../components/TeamPicker";

export default function RoomPage() {
  const { code } = useParams();
  const history = useHistory();
  const { user } = useContext(UserContext);
  const { state, dispatch, setFullState } = useAuction();

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinError, setJoinError] = useState("");
  const [roomMeta, setRoomMeta] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  const hasJoinedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const handlers = {
    onConnect: () => {
      if (hasJoinedRef.current) {
        SocketEvents.fetchState(socket, code);
      }
    },
    onDisconnect: () => {},
    onError: (msg) => dispatch({ type: "SET_ERROR", payload: msg }),
    onJoinResult: (data) => {
      if (data.success) {
        hasJoinedRef.current = true;
        setJoinError("");
      } else {
        setJoinError(data.error || "Failed to join room");
      }
    },
    onFullState: (data) => {
      if (data.error) {
        setJoinError(data.error);
        return;
      }
      setFullState(data);
      if (data.auctionState) {
        dispatch({ type: "AUCTION_STARTED" });
      }
    },
    onAuctionStarted: (data) =>
      dispatch({ type: "AUCTION_STARTED", payload: data }),
    onPlayerServed: (data) =>
      dispatch({ type: "PLAYER_SERVED", payload: data }),
    onBidPlaced: (data) => dispatch({ type: "BID_PLACED", payload: data }),
    onBidError: (data) => dispatch({ type: "BID_ERROR", payload: data }),
    onTimerTick: (data) => dispatch({ type: "TIMER_TICK", payload: data }),
    onPlayerSold: (data) => dispatch({ type: "PLAYER_SOLD", payload: data }),
    onPlayerUnsold: () => dispatch({ type: "PLAYER_UNSOLD" }),
    onBudgetUpdated: (data) =>
      dispatch({ type: "BUDGET_UPDATED", payload: data }),
    onRecallRoundStarted: (data) =>
      dispatch({ type: "RECALL_ROUND_STARTED", payload: data }),
    onRtmWindow: () => dispatch({ type: "RTM_WINDOW" }),
    onRtmExercised: (data) =>
      dispatch({ type: "RTM_EXERCISED", payload: data }),
    onRtmDeclined: () => dispatch({ type: "RTM_DECLINED" }),
    onStateReverted: (data) =>
      dispatch({ type: "STATE_REVERTED", payload: data }),
    onAuctionPaused: (data) =>
      dispatch({ type: "AUCTION_PAUSED", payload: data }),
    onAuctionResumed: (data) =>
      dispatch({ type: "AUCTION_RESUMED", payload: data }),
    onAuctionEnded: () => {
      dispatch({ type: "AUCTION_ENDED" });
      setShowSummary(true);
    },
    onSettingsUpdated: (data) =>
      dispatch({ type: "SETTINGS_UPDATED", payload: data }),
    onChatMessage: (data) => dispatch({ type: "CHAT_MESSAGE", payload: data }),
    onPlayerJoined: (data) =>
      dispatch({ type: "PLAYER_JOINED", payload: data }),
    onPlayerLeft: (data) => dispatch({ type: "PLAYER_LEFT", payload: data }),
    onHostMigrationVote: () => dispatch({ type: "HOST_MIGRATION" }),
    onSocketError: (data) => dispatch({ type: "SET_ERROR", payload: data }),
  };

  const { socket } = useSocket(code, user?.username, team, handlers);

  useEffect(() => {
    if (!user) {
      history.push("/signup");
      return;
    }
    const init = async () => {
      try {
        const res = await API.getRoom(code);
        if (!res.success) {
          setJoinError("Room not found");
          return;
        }
        setRoomMeta(res.room);
        const myPlayer = res.players.find((p) => p.userId === user.username);
        if (myPlayer) {
          setTeam(myPlayer.team);
          hasJoinedRef.current = true;
        }
      } catch (err) {
        setJoinError("Room not found");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [code, user, history]);

  const handleJoinRoom = () => {
    if (!socket || !team) return;
    SocketEvents.joinRoom(socket, {
      roomCode: code,
      team,
      userId: user.username,
    });
  };

  const handleStart = useCallback(() => {
    if (socket) SocketEvents.startAuction(socket, code);
  }, [socket, code]);

  const handleBid = useCallback(() => {
    if (socket) SocketEvents.placeBid(socket, code);
  }, [socket, code]);

  const handleAdvance = useCallback(() => {
    if (socket) SocketEvents.advancePlayer(socket, code);
  }, [socket, code]);

  const handleSold = useCallback(() => {
    if (socket) SocketEvents.markSold(socket, code);
  }, [socket, code]);

  const handleUnsold = useCallback(() => {
    if (socket) SocketEvents.markUnsold(socket, code);
  }, [socket, code]);

  const handleUndo = useCallback(() => {
    if (socket) SocketEvents.undo(socket, code);
  }, [socket, code]);

  const handlePause = useCallback(() => {
    if (socket) SocketEvents.pauseAuction(socket, code);
  }, [socket, code]);

  const handleResume = useCallback(() => {
    if (socket) SocketEvents.resumeAuction(socket, code);
  }, [socket, code]);

  const handleEnd = useCallback(() => {
    if (socket) SocketEvents.endAuction(socket, code);
  }, [socket, code]);

  const handleRTM = useCallback(() => {
    if (socket) SocketEvents.exerciseRTM(socket, code);
  }, [socket, code]);

  const handleChat = useCallback(
    (msg) => {
      if (socket) SocketEvents.sendChat(socket, code, msg);
    },
    [socket, code]
  );

  const handleSettingsUpdate = useCallback(
    (settings) => {
      if (socket) SocketEvents.updateSettings(socket, code, settings);
    },
    [socket, code]
  );

  const handleClaimHost = useCallback(() => {
    if (socket) SocketEvents.claimHost(socket, code);
  }, [socket, code]);

  if (loading) return <div className="page-loading">Loading room...</div>;
  if (joinError && !roomMeta)
    return <div className="page-error">Error: {joinError}</div>;

  const myPlayer = state.players.find((p) => p.userId === user?.username);
  const myPurse = myPlayer?.purseRemaining ?? 0;
  const myOverseas = myPlayer?.overseasUsed ?? 0;
  const myTotal = myPlayer?.totalPlayers ?? 0;
  const myRTMCards = myPlayer?.rtmCards ?? 0;

  const settings = state.room?.settings || {};
  const maxTimer = settings.maxDuration || 20;

  const canAdvance =
    state.currentPlayerState === "SOLD" ||
    state.currentPlayerState === "UNSOLD";

  if (showSummary) {
    return (
      <div className="room-page">
        <div className="auction-summary">
          <h2>Auction Complete!</h2>
          <p>Room: {code}</p>
          <p>Mode: {state.room?.mode}</p>
          <SquadTracker players={state.players} />
          <button className="btn btn-primary" onClick={() => history.push("/")}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!hasJoinedRef.current && !team) {
    return (
      <div className="room-page">
        <div className="lobby-join">
          <h2>Join Room: {code}</h2>
          {joinError && <div className="join-error">{joinError}</div>}
          <TeamPicker roomCode={code} selectedTeam={team} onSelect={setTeam} />
          {team && (
            <button className="btn btn-primary btn-lg" onClick={handleJoinRoom}>
              Join Room
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!state.isLive && !state.isPaused && !state.isEnded) {
    return (
      <div className="room-page">
        <div className="lobby">
          <div className="lobby-header">
            <h2>Room: {code}</h2>
            <p>Mode: {state.room?.mode}</p>
            <p>
              Status:{" "}
              {hasJoinedRef.current
                ? state.room?.status || "WAITING"
                : "Not joined"}
            </p>
          </div>
          <SquadTracker players={state.players} />
          {state.hostMigration && (
            <div className="host-migration-banner">
              Admin disconnected.{" "}
              <button className="btn btn-claim" onClick={handleClaimHost}>
                Claim Host
              </button>
            </div>
          )}
          {state.error && (
            <div className="error-banner">
              {typeof state.error === "string"
                ? state.error
                : state.error.message}
            </div>
          )}
          <AdminControls
            isAdmin={state.isAdmin}
            isLive={false}
            isPaused={false}
            isEnded={false}
            currentPlayerState={null}
            canAdvance={false}
            onStart={handleStart}
            onAdvance={handleAdvance}
            onSold={handleSold}
            onUnsold={handleUnsold}
            onUndo={handleUndo}
            onPause={handlePause}
            onResume={handleResume}
            onEnd={handleEnd}
          />
          <ChatPanel messages={state.chatMessages} onSendMessage={handleChat} />
        </div>
      </div>
    );
  }

  return (
    <div className="room-page game-active">
      <div className="game-header">
        <div className="room-info">
          <span className="room-code">{code}</span>
          <span className="room-mode">{state.room?.mode}</span>
        </div>
        <AdminControls
          isAdmin={state.isAdmin}
          isLive={state.isLive}
          isPaused={state.isPaused}
          isEnded={state.isEnded}
          currentPlayerState={state.currentPlayerState}
          canAdvance={canAdvance}
          onStart={handleStart}
          onAdvance={handleAdvance}
          onSold={handleSold}
          onUnsold={handleUnsold}
          onUndo={handleUndo}
          onPause={handlePause}
          onResume={handleResume}
          onEnd={handleEnd}
        />
        <SettingsPanel
          settings={settings}
          isAdmin={state.isAdmin}
          onUpdate={handleSettingsUpdate}
        />
      </div>
      <div className="game-main">
        <div className="game-center">
          <PlayerCard
            player={state.currentPlayer}
            basePrice={state.currentPlayer?.basePrice || 0}
            currentBid={state.currentBid}
            timerRemaining={state.timerRemaining}
            maxTimer={maxTimer}
            playerState={state.currentPlayerState}
            highBidderId={state.currentHighBidder}
            bidderTeam={
              state.currentHighBidder
                ? state.players.find(
                    (p) => p.userId === state.currentHighBidder
                  )?.team
                : null
            }
            round={state.round}
          />
          <BidPanel
            currentBid={state.currentBid}
            myPurse={myPurse}
            myOverseasUsed={myOverseas}
            myTotalPlayers={myTotal}
            overseasLimit={settings.overseasLimit || 8}
            maxSquadSize={settings.maxSquadSize || 25}
            player={state.currentPlayer}
            isLive={state.isLive}
            isPaused={state.isPaused}
            playerState={state.currentPlayerState}
            onBid={handleBid}
            error={state.error}
            rtmActive={state.rtmActive}
            onRTM={handleRTM}
            rtmCards={myRTMCards}
          />
          {state.recallActive && (
            <div className="recall-banner">Recall Round {state.round}</div>
          )}
          {state.rtmActive && (
            <div className="rtm-banner">RTM window active!</div>
          )}
          {state.hostMigration && (
            <div className="host-migration-banner">
              Admin disconnected.{" "}
              <button className="btn btn-claim" onClick={handleClaimHost}>
                Claim Host
              </button>
            </div>
          )}
        </div>
        <div className="game-sidebar">
          <TeamRoster players={state.players} currentUserId={user?.username} />
          <SquadTracker players={state.players} />
          <ChatPanel messages={state.chatMessages} onSendMessage={handleChat} />
        </div>
      </div>
    </div>
  );
}
