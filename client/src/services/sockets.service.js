import io from "socket.io-client";

// Backend URL is environment-driven so the same build works on Vercel (prod)
// and locally (dev). Set REACT_APP_API_URL in your Vercel project env vars
// to your deployed backend, e.g. https://your-app.onrender.com
const url = process.env.REACT_APP_API_URL || "http://localhost:8000/";
let socket;

const connect = () => {
  socket = io(url);
};

const join = (roomName, username) => {
  if (!socket) {
    connect();
  }
  socket.emit("joinAuction", {
    username,
    roomName,
  });
};

const create = (roomName, username) => {
  if (!socket) {
    connect();
  }
  socket.emit("createAuction", {
    username,
    roomName,
  });
};

socket.on("joinAuction", () => {});
export { create, join };
