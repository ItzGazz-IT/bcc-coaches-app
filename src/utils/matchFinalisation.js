export const getMatchVoterKey = ({ userRole, currentUserProfile, currentUser, currentPlayerId }) => {
  if (userRole !== "player" && userRole !== "guardian") return ""
  const accountId = currentUserProfile?.id || currentUserProfile?.username || currentUser
  return accountId ? `${userRole}:${accountId}${userRole === "player" ? `:${currentPlayerId || ""}` : ""}` : ""
}

export const canAccountVote = ({ userRole, currentPlayerId, linkedPlayerIds = [], squadPlayerIds = [], attendance = {}, voting }) => {
  if (!voting?.open || voting?.closedAt) return false
  if (voting.closesAt && new Date(voting.closesAt) <= new Date()) return false
  if (userRole !== "player" && userRole !== "guardian") return false
  const representedIds = userRole === "guardian" ? linkedPlayerIds : [currentPlayerId]
  return representedIds.some(id => squadPlayerIds.includes(id) && attendance[id] !== "absent" && attendance[id] !== "injured")
}

export const getVoteWinner = votes => {
  const counts = Object.values(votes || {}).reduce((all, vote) => {
    if (vote?.playerId) all[vote.playerId] = (all[vote.playerId] || 0) + 1
    return all
  }, {})
  const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!ordered.length || (ordered[1] && ordered[0][1] === ordered[1][1])) return ""
  return ordered[0][0]
}
