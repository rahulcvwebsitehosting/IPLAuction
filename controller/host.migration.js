const Room = require("../database/models/room.model");
const { HOST_MIGRATION_GRACE_SEC } = require("../config/constants");

const migrationTimers = new Map();

function startHostMigration(roomCode, onTimeout) {
  if (migrationTimers.has(roomCode)) return;
  const timer = setTimeout(async () => {
    migrationTimers.delete(roomCode);
    if (onTimeout) await onTimeout();
  }, HOST_MIGRATION_GRACE_SEC * 1000);
  migrationTimers.set(roomCode, timer);
}

function cancelHostMigration(roomCode) {
  const t = migrationTimers.get(roomCode);
  if (t) {
    clearTimeout(t);
    migrationTimers.delete(roomCode);
  }
}

function isMigrating(roomCode) {
  return migrationTimers.has(roomCode);
}

async function migrateHost(roomCode, newAdminId, io) {
  cancelHostMigration(roomCode);
  try {
    await Room.findOneAndUpdate(
      { roomCode },
      { $set: { adminUserId: newAdminId } }
    );
  } catch (err) {
    console.error("Host migration DB update failed:", err.message);
    return false;
  }
  io.to(roomCode).emit("host_migrated", { newAdminId });
  return true;
}

async function reclaimHost(roomCode, originalAdminId, io) {
  try {
    await Room.findOneAndUpdate(
      { roomCode },
      { $set: { adminUserId: originalAdminId } }
    );
  } catch (err) {
    console.error("Host reclaim DB update failed:", err.message);
    return false;
  }
  io.to(roomCode).emit("host_migrated", { newAdminId: originalAdminId });
  return true;
}

module.exports = {
  startHostMigration,
  cancelHostMigration,
  isMigrating,
  migrateHost,
  reclaimHost,
};
