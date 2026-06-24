// Auction history persisted in localStorage (per user).
//
// This replaces the old /played-auctions backend endpoint. Finished auctions
// are saved under the logged-in user's key so the "Previous Auctions" page
// keeps working with no backend involved. Each user only sees their own games.

const HISTORY_KEY_PREFIX = "ipl_auction_history_"; // + username

const readHistory = (username) => {
  try {
    return (
      JSON.parse(localStorage.getItem(HISTORY_KEY_PREFIX + username)) || []
    );
  } catch (error) {
    return [];
  }
};

const writeHistory = (username, auctions) => {
  localStorage.setItem(HISTORY_KEY_PREFIX + username, JSON.stringify(auctions));
};

// Fetch this user's finished auctions. If no username is given (e.g. not
// logged in), returns an empty list.
const fetchAuctions = (username) => {
  if (!username) return Promise.resolve({ success: true, auctions: [] });
  return Promise.resolve({ success: true, auctions: readHistory(username) });
};

// Save a finished auction for a user. `auction` is the array of users in the
// game (same shape the backend used to store: [{ user, batsmen, bowlers, ... }]).
const saveAuction = (username, auction) => {
  if (!username) return;
  const auctions = readHistory(username);
  auctions.push({ auction });
  writeHistory(username, auctions);
};

export { fetchAuctions, saveAuction };
