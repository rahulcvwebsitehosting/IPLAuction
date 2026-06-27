import { useContext } from "react";
import { Link, useHistory } from "react-router-dom";
import { UserContext } from "../hooks/UserContext";
import Loader from "./Loading.component";
import { logout } from "../services/auth.service";

const Navbar = () => {
  const { user, setUser, loading } = useContext(UserContext);
  const history = useHistory();

  const handleClick = () => {
    if (!user) {
      history.push("/signup");
      return;
    }
    logout();
    setUser(null);
  };

  return (
    <header className="nav-container">
      <Link to="/">
        <img
          className="nav-container-logo"
          src="/Images/logo.png"
          alt="IPL Auction"
        />
      </Link>
      <nav className="nav-container-main">
        <Link to="/" className="nav-container-main-content">
          Home
        </Link>
        <Link to="/create-room" className="nav-container-main-content">
          Auction
        </Link>
        <Link to="/auctions/played" className="nav-container-main-content">
          History
        </Link>
      </nav>
      <div className="nav-actions">
        {!loading ? (
          <>
            {user && <span className="nav-user">{user.username}</span>}
            <button className="btn btn-secondary btn-sm" onClick={handleClick}>
              {user ? "Logout" : "Sign Up"}
            </button>
          </>
        ) : (
          <Loader size="2" />
        )}
      </div>
    </header>
  );
};

export default Navbar;
