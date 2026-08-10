export function getMedicallyUnavailablePlayerIds(injuries = []) {
  return new Set(injuries
    .filter(item => item.status === "injured" || item.status === "unavailable")
    .map(item => item.playerId))
}

export function getDeclinedPlayerIds(responses = {}) {
  return new Set(Object.entries(responses)
    .filter(([, response]) => response?.status === "unavailable")
    .map(([playerId]) => playerId))
}

export function isPlayerMatchEligible(playerId, medicallyUnavailableIds, declinedIds) {
  return !medicallyUnavailableIds.has(playerId) && !declinedIds.has(playerId)
}

export function getAvailabilitySummary(playerIds = [], responses = {}, medicallyUnavailableIds = new Set()) {
  return playerIds.reduce((summary, playerId) => {
    if (medicallyUnavailableIds.has(playerId)) summary.medical += 1
    else if (responses[playerId]?.status === "available") summary.available += 1
    else if (responses[playerId]?.status === "unavailable") summary.unavailable += 1
    else summary.pending += 1
    summary.total += 1
    return summary
  }, { total: 0, available: 0, pending: 0, unavailable: 0, medical: 0 })
}
