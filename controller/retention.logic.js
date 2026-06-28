function getRetainedPlayers(dataset, teamName) {
  const players = dataset.players || dataset;
  return players.filter((p) => p.isRetained && p.retainedBy === teamName);
}

function applyRetention(teamPlayerObj, player) {
  const cost = player.retentionCost || 0;
  teamPlayerObj.purseRemaining = Math.max(
    0,
    teamPlayerObj.purseRemaining - cost
  );
  teamPlayerObj.totalPlayers++;
  teamPlayerObj.squad.push({
    id: player.id,
    name: player.name,
    role: player.role,
    amount: cost,
    retained: true,
  });
  if (player.nationality === "overseas") {
    teamPlayerObj.overseasUsed++;
  }
}

function getRetentionDeduction(dataset, teamName) {
  const retained = getRetainedPlayers(dataset, teamName);
  return retained.reduce((sum, p) => sum + (p.retentionCost || 0), 0);
}

function getNonRetainedPlayers(dataset) {
  const players = dataset.players || dataset;
  return players.filter((p) => !p.isRetained);
}

module.exports = {
  getRetainedPlayers,
  applyRetention,
  getRetentionDeduction,
  getNonRetainedPlayers,
};
