import { useState, useEffect, useContext } from "react";
import { fetchAuctions } from "../services/auction.service";
import PlayerCard from "../components/PlayerCard";
import { UserContext } from "../hooks/UserContext";

const PreviousAuctions = () => {
  const { user } = useContext(UserContext);
  const [auctions, setAuctions] = useState([]);
  const [clicked, setClicked] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    // History is read from localStorage for the logged-in user.
    fetchAuctions(user && user.username)
      .then((data) => {
        setAuctions(data.auctions || []);
      })
      .catch((error) => {
        console.log(error.message);
      });
  }, [user]);

  const auctionClick = (index) => {
    setCurrent(index);
    setClicked(0);
  };

  const userClick = (index) => {
    setClicked(index);
  };

  return (
    <div className="previous-auctions">
      {auctions.length > 0 ? (
        <div>
          <div className="previous-auctions-cards">
            {auctions.map((a, index) => {
              return (
                <div
                  className={`previous-auctions-card ${
                    current === index ? "apply-border" : ""
                  }`}
                  key={index}
                  onClick={() => auctionClick(index)}
                >
                  Auction {index + 1}
                </div>
              );
            })}
          </div>
          <div className="previous-auctions-cards">
            {auctions[current] && auctions[current].auction
              ? auctions[current].auction.map((u, index) => {
                  return (
                    <div
                      className={`previous-auctions-card ${
                        clicked === index ? "apply-border" : ""
                      }`}
                      key={index}
                      onClick={() => userClick(index)}
                    >
                      {u.user}
                    </div>
                  );
                })
              : ""}
          </div>
          <div>
            {auctions[current] &&
            auctions[current].auction &&
            auctions[current].auction[clicked] ? (
              <div>
                {auctions[current].auction[clicked].batsmen
                  ? auctions[current].auction[clicked].batsmen.map(
                      (b, index) => {
                        return <PlayerCard key={b.image} {...b} />;
                      }
                    )
                  : ""}
                {auctions[current].auction[clicked].wicketKeepers
                  ? auctions[current].auction[clicked].wicketKeepers.map(
                      (w, index) => {
                        return <PlayerCard key={w.image} {...w} />;
                      }
                    )
                  : ""}
                {auctions[current].auction[clicked].allRounders
                  ? auctions[current].auction[clicked].allRounders.map(
                      (w, index) => {
                        return <PlayerCard key={w.image} {...w} />;
                      }
                    )
                  : ""}
                {auctions[current].auction[clicked].bowlers
                  ? auctions[current].auction[clicked].bowlers.map(
                      (w, index) => {
                        return <PlayerCard key={w.image} {...w} />;
                      }
                    )
                  : ""}
                {auctions[current].auction[clicked].unknown
                  ? auctions[current].auction[clicked].unknown.map(
                      (w, index) => {
                        return <PlayerCard key={w.image} {...w} />;
                      }
                    )
                  : ""}
                {!auctions[current].auction[clicked].batsmen &&
                !auctions[current].auction[clicked].wicketKeepers &&
                !auctions[current].auction[clicked].allRounders &&
                !auctions[current].auction[clicked].bowlers &&
                !auctions[current].auction[clicked].unknown
                  ? "No player data available"
                  : ""}
              </div>
            ) : (
              ""
            )}
          </div>
        </div>
      ) : (
        "NO DATA Available"
      )}
    </div>
  );
};

export default PreviousAuctions;
