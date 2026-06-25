import { v4 as uuidv4 } from "uuid";

const CreateAuction = ({
  socket,
  user,
  setCreated,
  setJoin,
  setRoom,
  setMain,
  setErrors,
}) => {
  const newAuction = () => {
    const room = uuidv4();
    // Emit and let the server's "create-result" response drive the state
    // change (handled in Auction.js). Setting created=true here would put us
    // in the lobby even if the server rejected the room (e.g. a collision).
    socket.emit("createAuction", {
      username: user.username,
      room,
    });
  };

  const joinAuction = () => {
    setJoin(true);
  };

  return (
    <div className="form">
      <div className="form-container">
        <button
          onClick={() => {
            newAuction();
          }}
          className="create-auction-button button"
        >
          Create Auction
        </button>
        <button
          onClick={() => {
            joinAuction();
          }}
          className="create-auction-button button"
        >
          Join Auction
        </button>
      </div>
    </div>
  );
};

export default CreateAuction;
