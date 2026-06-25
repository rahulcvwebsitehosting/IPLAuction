//Hooks
import { useEffect, useState, useContext } from "react";
import { UserContext } from "../hooks/UserContext";

// Components
import JoinAuction from "../components/JoinAuction";
import CreateAuction from "../components/CreateAuction";
import Game from "../components/Game";
import Lobby from "../components/Lobby";
import Loader from "./Loading";

import io from "socket.io-client";

// Backend URL is environment-driven so the production build (on Vercel)
// talks to the deployed backend (e.g. Render) instead of a dead URL.
const url = process.env.REACT_APP_API_URL || "http://localhost:8000/";

const Auction = (props) => {
  const { user } = useContext(UserContext);
  const [socket] = useState(io(url));
  const [room, setRoom] = useState("");
  const [loading, setLoading] = useState(false);
  const [play, setPlay] = useState(false);
  const [main, setMain] = useState(false);
  const [errors, setErrors] = useState({
    form: "",
    room: "",
    lobby: "",
  });
  const [users, setUsers] = useState([]);
  const [created, setCreated] = useState(false);
  const [join, setJoin] = useState(false);
  const [initial, setInitial] = useState(true);
  const [defaultPlayer, setDefaultPlayer] = useState("");

  useEffect(() => {
    socket.emit("check-user", {
      user: user,
    });
  }, [socket, user]);

  useEffect(() => {
    const onExistingUser = (data) => {
      setUsers(data.users);
      setRoom(data.room);
      setInitial(false);
      setDefaultPlayer(data.initial);
      if (data.started) {
        setPlay(true);
      } else {
        setCreated(true);
        setMain(data.starter);
      }
    };

    const onNoExistingUser = () => {
      setInitial(false);
    };

    const onJoinResult = (message) => {
      setLoading(false);
      if (message.success) {
        setRoom(message.room);
        setCreated(true);
      } else {
        setErrors((prev) => ({
          ...prev,
          form: message.error,
        }));
      }
    };

    const onCreateResult = (message) => {
      if (message.success) {
        setRoom(message.room);
        setMain(true);
        setCreated(true);
      } else {
        setErrors((prev) => ({
          ...prev,
          form: message.error,
        }));
      }
    };

    const onStart = () => {
      setPlay(true);
    };

    socket.on("existing-user", onExistingUser);
    socket.on("no-existing-user", onNoExistingUser);
    socket.on("join-result", onJoinResult);
    socket.on("create-result", onCreateResult);
    socket.on("start", onStart);

    return () => {
      socket.off("existing-user", onExistingUser);
      socket.off("no-existing-user", onNoExistingUser);
      socket.off("join-result", onJoinResult);
      socket.off("create-result", onCreateResult);
      socket.off("start", onStart);
    };
  }, [socket]);

  useEffect(() => {
    const onUsers = (data) => {
      setUsers(data.users);
    };

    socket.on("users", onUsers);

    return () => {
      socket.off("users", onUsers);
    };
  }, [socket]);

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return (
    <div className="auction">
      {initial ? (
        <Loader />
      ) : play ? (
        <Game
          room={room}
          socket={socket}
          users={users}
          user={user}
          initial={defaultPlayer}
        />
      ) : !created && !join ? (
        <CreateAuction
          socket={socket}
          user={user}
          setCreated={setCreated}
          setJoin={setJoin}
          setRoom={setRoom}
          setMain={setMain}
          setErrors={setErrors}
        />
      ) : created ? (
        <Lobby
          socket={socket}
          users={users}
          code={room}
          setPlay={setPlay}
          setErrors={setErrors}
          main={main}
          error={errors.lobby}
          user={user}
          setCreated={setCreated}
          setJoin={setJoin}
        />
      ) : (
        <JoinAuction
          socket={socket}
          user={user}
          room={room}
          setRoom={setRoom}
          errors={errors}
          loading={loading}
          setLoading={setLoading}
        />
      )}
    </div>
  );
};

export default Auction;
