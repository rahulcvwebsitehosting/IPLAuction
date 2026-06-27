const { nanoid } = require("nanoid");

const USED_CODES = new Set();

function generateRoomCode() {
  let code;
  do {
    code = nanoid(6)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "X");
  } while (USED_CODES.has(code));
  USED_CODES.add(code);
  return code;
}

function releaseRoomCode(code) {
  USED_CODES.delete(code);
}

module.exports = { generateRoomCode, releaseRoomCode };
