import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "../hooks/UserContext";
import { useHistory } from "react-router-dom";
import API from "../services/api.service";

export default function PreviousAuctions() {
  const { user } = useContext(UserContext);
  const history = useHistory();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user) {
      history.push("/signup");
      return;
    }
    API.getUserHistory(user.username)
      .then((res) => {
        if (res.success) setAuctions(res.auctions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, history]);

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="previous-auctions-page">
      <h2>Previous Auctions</h2>
      {auctions.length === 0 ? (
        <div className="auctions-empty">No previous auctions found</div>
      ) : (
        <div className="auctions-list">
          {auctions.map((a) => (
            <div key={a._id || a.roomCode} className="auction-item">
              <div
                className="auction-item-header"
                onClick={() =>
                  setSelected(selected === a.roomCode ? null : a.roomCode)
                }
              >
                <span className="auction-room">{a.roomCode}</span>
                <span className="auction-mode">{a.mode}</span>
                <span className="auction-date">
                  {a.completedAt
                    ? new Date(a.completedAt).toLocaleDateString()
                    : ""}
                </span>
              </div>
              {selected === a.roomCode && (
                <div className="auction-item-detail">
                  <h4>Teams</h4>
                  {(a.teams || []).map((t, i) => (
                    <div key={i} className="auction-team">
                      <span className="team-name">{t.team}</span>
                      <span>Players: {t.playersBought || 0}</span>
                      <span>Purse Spent: {t.purseSpent || 0}</span>
                    </div>
                  ))}
                  <h4>Players Sold</h4>
                  <div className="auction-players-list">
                    {(a.players || [])
                      .filter((p) => p.status === "sold" || p.status === "rtm")
                      .map((p, i) => (
                        <div key={i} className="auction-player">
                          <span>{p.name}</span>
                          <span>{p.role}</span>
                          <span>{p.soldTo}</span>
                          <span>
                            {p.soldAmount
                              ? `₹${(p.soldAmount / 100).toFixed(1)}Cr`
                              : ""}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
