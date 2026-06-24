// Client-side auth using localStorage + sessionStorage.
//
// IMPORTANT: this is NOT real security. localStorage is readable by anyone
// with access to the browser (or any script on the same origin). Passwords
// are hashed with SHA-256 (so they aren't stored in plaintext), but this
// scheme is meant for a local/demo app only — do not rely on it to protect
// sensitive data. The previous backend auth (MongoDB + JWT + httpOnly cookie)
// has been removed in favour of this.

const USERS_KEY = "ipl_auction_users"; // map of username -> { username, email, passwordHash }
const SESSION_KEY = "ipl_auction_session"; // username of the currently logged-in user

const encoder = new TextEncoder();

// Hash a password with SHA-256 and return a hex string.
const hashPassword = async (password) => {
  const data = encoder.encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
  } catch (error) {
    return {};
  }
};

const writeUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const setSession = (username) => {
  // Session lives in sessionStorage so it clears when the tab closes,
  // but the user record persists in localStorage across sessions.
  sessionStorage.setItem(SESSION_KEY, username);
};

const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

const getCurrentUser = () => {
  const username = sessionStorage.getItem(SESSION_KEY);
  if (!username) return null;
  const users = readUsers();
  const user = users[username];
  return user ? { username: user.username, email: user.email } : null;
};

// "Register" both creates a new account and logs a returning one back in.
// There is no separate login page anymore: the Sign Up form is the single
// entry point. A username that already exists must match its password.
const register = async (username, email, password) => {
  username = (username || "").trim();
  email = (email || "").trim();

  if (!username || !email || !password) {
    return {
      success: false,
      message: "Please fill in all the fields.",
    };
  }

  const users = readUsers();
  const passwordHash = await hashPassword(password);
  const existing = users[username];

  if (existing) {
    if (existing.passwordHash !== passwordHash) {
      return {
        success: false,
        message: "That username is taken and the password does not match.",
      };
    }
    // Returning user — log them in.
    setSession(username);
    return {
      success: true,
      message: "Welcome back!",
      user: { username: existing.username, email: existing.email },
    };
  }

  // New user — create the account.
  users[username] = { username, email, passwordHash };
  writeUsers(users);
  setSession(username);
  return {
    success: true,
    message: "Account created successfully.",
    user: { username, email },
  };
};

const logout = () => {
  clearSession();
  return { success: true, message: "Successfully logged out" };
};

export { register, logout, getCurrentUser };
