import { Switch, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import SignUp from "./pages/SignUp";
import CreateRoom from "./pages/CreateRoom";
import RoomPage from "./pages/RoomPage";
import About from "./pages/About";
import PreviousAuctions from "./pages/PreviousAuctions";

import { UserContext } from "./hooks/UserContext";
import useFindUser from "./hooks/useFindUser";

import PrivateRoute from "./routes/PrivateRoute";
import PublicRoute from "./routes/PublicRoute";

function App() {
  const [user, setUser, loading] = useFindUser();

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      <div className="App">
        <Navbar />
        <div className="ball ball1"></div>
        <div className="ball ball2"></div>
        <div className="ball ball3"></div>
        <div className="ball ball4"></div>
        <div className="stumps-decoration"></div>
        <Switch>
          <Route exact path="/" component={Home} />
          <PublicRoute exact path="/signup" component={SignUp} />
          <Route exact path="/about" component={About} />
          <PrivateRoute exact path="/create-room" component={CreateRoom} />
          <PrivateRoute exact path="/room/:code" component={RoomPage} />
          <PrivateRoute
            exact
            path="/auctions/played"
            component={PreviousAuctions}
          />
        </Switch>
      </div>
    </UserContext.Provider>
  );
}

export default App;
