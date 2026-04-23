import { useState, useMemo } from "react"
import { Users, Download, Printer, ChevronRight, X, BarChart3, ListOrdered } from "lucide-react"
import { useApp } from "../contexts/AppContext"

const normalizeName = (value = "") => value.toLowerCase().replace(/\s+/g, " ").trim()

const matchesPlayerByRef = (ref, player) => {
  if (!ref || !player) return false

  const playerId = String(player.id || "")
  const playerName = normalizeName(`${player.firstName || ""} ${player.lastName || ""}`)

  if (typeof ref === "string") {
    const normalizedRef = normalizeName(ref)
    return normalizedRef === playerId || normalizedRef === playerName
  }

  if (typeof ref === "number") {
    return String(ref) === playerId
  }

  if (typeof ref === "object") {
    const refId = ref.playerId || ref.id || ref.playerID || ref.player_id
    if (refId && String(refId) === playerId) {
      return true
    }

    const refName = ref.playerName || ref.name || `${ref.firstName || ""} ${ref.lastName || ""}`
    if (refName && normalizeName(refName) === playerName) {
      return true
    }
  }

  return false
}

function PlayerStats() {
  const { players, fixtures, userRole, currentPlayerId, matchAnalyses } = useApp()
  const isPlayerRole = userRole === "player"
  const [selectedPlayerId, setSelectedPlayerId] = useState(isPlayerRole ? (currentPlayerId || null) : null)
  const [selectedTab, setSelectedTab] = useState("overview")

  // Filter players based on role
  const displayPlayers = userRole === "player" && currentPlayerId
    ? players.filter(p => p.id === currentPlayerId)
    : players

  // Calculate player statistics from fixtures
  const playerStats = useMemo(() => {
    const stats = {}

    displayPlayers.forEach(player => {
      stats[player.id] = {
        player,
        appearances: 0,
        starts: 0,
        eventsByAttribute: {},
        eventsBySubAttribute: {},
        eventsByAction: {},
        eventsBySpecialAction: {},
        eventsByBodyPart: {},
        eventsByPeriod: {},
        assists: 0,
        shots: 0,
        shotsOnTarget: 0,
        shotsOffTarget: 0,
        totalPasses: 0,
        successfulPasses: 0,
        unsuccessfulPasses: 0,
        duelsWon: 0,
        duelsLost: 0,
        encountersWon: 0,
        encountersLost: 0,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
        cleanSheets: 0
      }
    })

    fixtures.filter(f => f.status === "Completed").forEach(fixture => {
      // Count goals
      if (fixture.scorers) {
        fixture.scorers.forEach(scorer => {
          Object.values(stats).forEach(playerStat => {
            if (matchesPlayerByRef(scorer, playerStat.player)) {
              playerStat.goals++
              playerStat.appearances++
            }
          })
        })
      }

      // Count yellow cards
      if (fixture.yellowCards) {
        fixture.yellowCards.forEach(card => {
          Object.values(stats).forEach(playerStat => {
            if (matchesPlayerByRef(card, playerStat.player)) {
              playerStat.yellowCards++
              const alreadyScored = fixture.scorers?.some(scorer => matchesPlayerByRef(scorer, playerStat.player))
              if (!alreadyScored) {
                playerStat.appearances++
              }
            }
          })
        })
      }

      // Count red cards
      if (fixture.redCards) {
        fixture.redCards.forEach(card => {
          Object.values(stats).forEach(playerStat => {
            if (matchesPlayerByRef(card, playerStat.player)) {
              playerStat.redCards++
              const alreadyScored = fixture.scorers?.some(scorer => matchesPlayerByRef(scorer, playerStat.player))
              const alreadyBooked = fixture.yellowCards?.some(yellow => matchesPlayerByRef(yellow, playerStat.player))
              if (!alreadyScored && !alreadyBooked) {
                playerStat.appearances++
              }
            }
          })
        })
      }

      // Count clean sheets for defenders and goalkeepers
      if (fixture.result === "Win") {
        const ourScore = fixture.homeAway === "Home" ? 
          parseInt(fixture.score?.split('-')[0] || 0) : 
          parseInt(fixture.score?.split('-')[1] || 0)
        const theirScore = fixture.homeAway === "Home" ? 
          parseInt(fixture.score?.split('-')[1] || 0) : 
          parseInt(fixture.score?.split('-')[0] || 0)

        if (theirScore === 0) {
          Object.values(stats).forEach(playerStat => {
            if (playerStat.player.position === "Goalkeeper" || 
                 playerStat.player.position === "Defender") {
              if (playerStat.appearances > 0) {
                playerStat.cleanSheets++
              }
            }
          })
        }
      }
    })

    matchAnalyses.forEach(analysis => {
      Object.entries(analysis.playerStats || {}).forEach(([playerId, importedStats]) => {
        if (!stats[playerId]) {
          return
        }

        // Apps means appearances. Stepout participation counts as an appearance.
        stats[playerId].appearances += Number(importedStats.appearances || importedStats.starts || 0)
        stats[playerId].starts += Number(importedStats.starts || 0)
        stats[playerId].goals += Number(importedStats.attacking?.goals || 0)
        stats[playerId].assists += Number(importedStats.attacking?.assists || 0)
        stats[playerId].shots += Number(importedStats.attacking?.shots || 0)
        stats[playerId].shotsOnTarget += Number(importedStats.attacking?.shotsOnTarget || 0)
        stats[playerId].shotsOffTarget += Number(importedStats.attacking?.shotsOffTarget || 0)
        stats[playerId].totalPasses += Number(importedStats.passing?.total || 0)
        stats[playerId].successfulPasses += Number(importedStats.passing?.successful || 0)
        stats[playerId].unsuccessfulPasses += Number(importedStats.passing?.unsuccessful || 0)
        stats[playerId].duelsWon += Number(importedStats.defending?.duelsWon || 0)
        stats[playerId].duelsLost += Number(importedStats.defending?.duelsLost || 0)
        stats[playerId].encountersWon += Number(importedStats.encounters?.won || 0)
        stats[playerId].encountersLost += Number(importedStats.encounters?.lost || 0)
        stats[playerId].yellowCards += Number(importedStats.discipline?.yellowCards || 0)
        stats[playerId].redCards += Number(importedStats.discipline?.redCards || 0)

        Object.entries(importedStats.eventsByAttribute || {}).forEach(([key, value]) => {
          stats[playerId].eventsByAttribute[key] = (stats[playerId].eventsByAttribute[key] || 0) + Number(value || 0)
        })

        Object.entries(importedStats.eventsBySubAttribute || {}).forEach(([key, value]) => {
          stats[playerId].eventsBySubAttribute[key] = (stats[playerId].eventsBySubAttribute[key] || 0) + Number(value || 0)
        })

        Object.entries(importedStats.eventsByAction || {}).forEach(([key, value]) => {
          stats[playerId].eventsByAction[key] = (stats[playerId].eventsByAction[key] || 0) + Number(value || 0)
        })

        // Backward-compat fallback for older imports that do not have discipline totals.
        if (!importedStats.discipline) {
          const fallbackMaps = [
            importedStats.eventsByAction || {},
            importedStats.eventsBySubAttribute || {},
            importedStats.eventsBySpecialAction || {}
          ]

          fallbackMaps.forEach((sourceMap) => {
            Object.entries(sourceMap).forEach(([key, value]) => {
              const lowerKey = key.toLowerCase()
              const numericValue = Number(value || 0)
              if (lowerKey.includes("yellow") || lowerKey.includes("book") || lowerKey.includes("caution")) {
                stats[playerId].yellowCards += numericValue
              }
              if (lowerKey.includes("red card") || lowerKey.includes("sent off") || lowerKey.includes("second yellow")) {
                stats[playerId].redCards += numericValue
              }
            })
          })
        }

        Object.entries(importedStats.eventsBySpecialAction || {}).forEach(([key, value]) => {
          stats[playerId].eventsBySpecialAction[key] = (stats[playerId].eventsBySpecialAction[key] || 0) + Number(value || 0)
        })

        Object.entries(importedStats.eventsByBodyPart || {}).forEach(([key, value]) => {
          stats[playerId].eventsByBodyPart[key] = (stats[playerId].eventsByBodyPart[key] || 0) + Number(value || 0)
        })

        Object.entries(importedStats.eventsByPeriod || {}).forEach(([key, value]) => {
          stats[playerId].eventsByPeriod[key] = (stats[playerId].eventsByPeriod[key] || 0) + Number(value || 0)
        })
      })
    })

    return Object.values(stats)
  }, [displayPlayers, fixtures, matchAnalyses])

  const allPlayerStats = useMemo(() => {
    return [...playerStats].sort((a, b) => {
      const leftName = `${a.player.firstName || ""} ${a.player.lastName || ""}`.trim()
      const rightName = `${b.player.firstName || ""} ${b.player.lastName || ""}`.trim()
      return leftName.localeCompare(rightName)
    })
  }, [playerStats])

  const selectedPlayerStats = useMemo(() => {
    if (!allPlayerStats.length) return null

    if (!selectedPlayerId) return null

    const selected = allPlayerStats.find((entry) => entry.player.id === selectedPlayerId)
    return selected || null
  }, [allPlayerStats, selectedPlayerId])

  // Per-game breakdown for the selected player
  const perGameStats = useMemo(() => {
    if (!selectedPlayerId) return []

    const player = players.find((p) => p.id === selectedPlayerId)
    if (!player) return []

    const completedFixtures = fixtures.filter((f) => f.status === "Completed")

    return completedFixtures
      .map((fixture) => {
        const goals = (fixture.scorers || []).filter((s) => matchesPlayerByRef(s, player)).length
        const yellowCards = (fixture.yellowCards || []).filter((c) => matchesPlayerByRef(c, player)).length
        const redCards = (fixture.redCards || []).filter((c) => matchesPlayerByRef(c, player)).length
        const appeared = goals > 0 || yellowCards > 0 || redCards > 0

        // Match analysis data for this fixture (by date + opponent)
        const analysis = matchAnalyses.find((a) => {
          const sameDate = a.date && fixture.date && a.date === fixture.date
          const sameOpponent = a.opponent && fixture.opponent &&
            a.opponent.toLowerCase().trim() === fixture.opponent.toLowerCase().trim()
          return sameDate || sameOpponent
        })
        const analysisPlayerData = analysis?.playerStats?.[selectedPlayerId] || null

        const extraGoals = analysisPlayerData?.attacking?.goals || 0
        const extraAssists = analysisPlayerData?.attacking?.assists || 0
        const extraShots = analysisPlayerData?.attacking?.shots || 0
        const extraShotsOn = analysisPlayerData?.attacking?.shotsOnTarget || 0
        const extraPasses = analysisPlayerData?.passing?.total || 0
        const extraPassesSuccess = analysisPlayerData?.passing?.successful || 0
        const extraDuelsWon = analysisPlayerData?.defending?.duelsWon || 0
        const extraDuelsLost = analysisPlayerData?.defending?.duelsLost || 0
        const hasAnyData = appeared || analysisPlayerData !== null

        if (!hasAnyData) return null

        return {
          fixture,
          goals: goals + extraGoals,
          assists: extraAssists,
          yellowCards: yellowCards + (analysisPlayerData?.discipline?.yellowCards || 0),
          redCards: redCards + (analysisPlayerData?.discipline?.redCards || 0),
          shots: extraShots,
          shotsOnTarget: extraShotsOn,
          totalPasses: extraPasses,
          successfulPasses: extraPassesSuccess,
          duelsWon: extraDuelsWon,
          duelsLost: extraDuelsLost,
          fromAnalysis: analysisPlayerData !== null
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aDate = new Date(a.fixture.date || 0).getTime()
        const bDate = new Date(b.fixture.date || 0).getTime()
        return bDate - aDate
      })
  }, [selectedPlayerId, fixtures, matchAnalyses, players])

  const handleExport = () => {
    const csvContent = [
      ["Player", "Position", "Apps", "Starts", "Goals", "Assists", "Total Shots", "Shots On Target", "Shots Off Target", "Total Passes", "Successful Passes", "Unsuccessful Passes", "Duels Won", "Duels Lost", "Encounters Won", "Encounters Lost", "Yellow Card", "Red Card"],
      ...allPlayerStats.map(stat => [
        `${stat.player.firstName} ${stat.player.lastName}`,
        stat.player.position,
        stat.appearances,
        stat.starts,
        stat.goals,
        stat.assists,
        stat.shots,
        stat.shotsOnTarget,
        stat.shotsOffTarget,
        stat.totalPasses,
        stat.successfulPasses,
        stat.unsuccessfulPasses,
        stat.duelsWon,
        stat.duelsLost,
        stat.encountersWon,
        stat.encountersLost,
        stat.yellowCards,
        stat.redCards
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `player-stats-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handlePrint = () => {
    window.print()
  }

  const totalGoals = allPlayerStats.reduce((sum, s) => sum + s.goals, 0)
  const totalAssists = allPlayerStats.reduce((sum, s) => sum + s.assists, 0)
  const totalCards = allPlayerStats.reduce((sum, s) => sum + s.yellowCards + s.redCards, 0)

  return (
    <div className="min-h-screen overflow-y-auto p-4 md:p-6 bg-gray-50 print:bg-white">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="mb-4 md:mb-6 print:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1 print:text-gray-900">
                Player Stats
              </h1>
              <p className="text-sm md:text-base text-gray-600 print:text-sm hidden md:block">Season performance and analytics</p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleExport}
                className="btn bg-green-500 text-white hover:bg-green-600 flex items-center gap-2 text-sm md:text-base"
              >
                <Download size={20} />
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="btn bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-2 text-sm md:text-base"
              >
                <Printer size={20} />
                Print
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-1 print:hidden">
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-xs font-bold text-gray-500 uppercase">Players</p>
            <p className="text-xl font-black text-blue-700">{allPlayerStats.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-xs font-bold text-gray-500 uppercase">Goals</p>
            <p className="text-xl font-black text-green-700">{totalGoals}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-xs font-bold text-gray-500 uppercase">Assists</p>
            <p className="text-xl font-black text-indigo-700">{totalAssists}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-xs font-bold text-gray-500 uppercase">Cards</p>
            <p className="text-xl font-black text-amber-700">{totalCards}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white print:bg-white">
            <h2 className="text-lg font-bold text-gray-800">All Players</h2>
            <p className="text-xs text-gray-500 mt-1">Click View to open a player's full stats.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 print:bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Player</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Pos</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Apps</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">G</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">A</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Passes (S/T)</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Shots (On/T)</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Duels (W/L)</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Cards</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase print:hidden">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allPlayerStats.map((stat, index) => {
                  const isSelected = selectedPlayerId === stat.player.id
                  return (
                  <tr
                    key={stat.player.id}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50 print:bg-gray-50'} hover:bg-blue-50 ${isSelected ? 'ring-2 ring-inset ring-blue-200' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 text-sm">
                        {stat.player.firstName} {stat.player.lastName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{stat.player.position || '-'}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-800 text-sm">{stat.appearances}</td>
                    <td className="px-4 py-3 text-center font-bold text-green-700 text-sm">{stat.goals}</td>
                    <td className="px-4 py-3 text-center font-bold text-indigo-700 text-sm">{stat.assists}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-800 text-sm">{stat.successfulPasses}/{stat.totalPasses}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-800 text-sm">{stat.shotsOnTarget}/{stat.shots}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-800 text-sm">{stat.duelsWon}/{stat.duelsLost}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-800 text-sm">{stat.yellowCards}/{stat.redCards}</td>
                    <td className="px-4 py-3 text-right print:hidden">
                      <button
                        type="button"
                        onClick={() => { setSelectedPlayerId(stat.player.id); setSelectedTab("overview") }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        View
                        <ChevronRight size={14} className="inline" />
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>

        {!selectedPlayerStats && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 md:p-5 text-sm text-gray-600">
            Select a player from the table above to view detailed stats.
          </div>
        )}
      </div>

      {selectedPlayerStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden" onClick={() => { setSelectedPlayerId(null); setSelectedTab("overview") }}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900" onClick={(event) => event.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
              <div>
                <h3 className="text-lg font-black text-gray-800 dark:text-white">
                  {selectedPlayerStats.player.firstName} {selectedPlayerStats.player.lastName}
                </h3>
                <span className="inline-flex items-center rounded bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                  {selectedPlayerStats.player.position || "No position"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedPlayerId(null); setSelectedTab("overview") }}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700"
                aria-label="Close player details"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-gray-100 dark:border-gray-800 px-4 pt-3 pb-0">
              {[
                { id: "overview", label: "Season Overview", icon: BarChart3 },
                { id: "per-game", label: "Per Game", icon: ListOrdered }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedTab(id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                    selectedTab === id
                      ? "border-primary text-primary dark:text-accent dark:border-accent"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4 md:p-5">
              {/* ── OVERVIEW TAB ── */}
              {selectedTab === "overview" && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Appearances</p><p className="font-black text-gray-800 dark:text-white text-lg">{selectedPlayerStats.appearances}</p></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Starts</p><p className="font-black text-gray-800 dark:text-white text-lg">{selectedPlayerStats.starts}</p></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Goals</p><p className="font-black text-green-700 text-lg">{selectedPlayerStats.goals}</p></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Assists</p><p className="font-black text-indigo-700 text-lg">{selectedPlayerStats.assists}</p></div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Total Passes</p><p className="font-black text-gray-800 dark:text-white text-lg">{selectedPlayerStats.totalPasses}</p></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Successful / Unsuccessful</p><p className="font-black text-gray-800 dark:text-white text-lg">{selectedPlayerStats.successfulPasses}/{selectedPlayerStats.unsuccessfulPasses}</p></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Shots (On / Off)</p><p className="font-black text-gray-800 dark:text-white text-lg">{selectedPlayerStats.shots} ({selectedPlayerStats.shotsOnTarget}/{selectedPlayerStats.shotsOffTarget})</p></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Cards (Y / R)</p><p className="font-black text-gray-800 dark:text-white text-lg">{selectedPlayerStats.yellowCards}/{selectedPlayerStats.redCards}</p></div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Duels Won / Lost</p><p className="font-black text-gray-800 dark:text-white text-lg">{selectedPlayerStats.duelsWon}/{selectedPlayerStats.duelsLost}</p></div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"><p className="text-xs text-gray-500">Encounters Won / Lost</p><p className="font-black text-gray-800 dark:text-white text-lg">{selectedPlayerStats.encountersWon}/{selectedPlayerStats.encountersLost}</p></div>
                </div>
              )}

              {/* ── PER GAME TAB ── */}
              {selectedTab === "per-game" && (
                <div>
                  {perGameStats.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No per-game data available yet. Stats appear once fixtures are marked as Completed or match analysis data is imported.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Match</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Date</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Result</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-green-600 uppercase">G</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-indigo-600 uppercase">A</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Shots</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Passes S/T</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Duels W/L</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-amber-600 uppercase">Y</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-red-600 uppercase">R</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {perGameStats.map((row) => {
                            const fixture = row.fixture
                            const resultColor =
                              fixture.result === "Win"
                                ? "text-emerald-600 font-bold"
                                : fixture.result === "Loss"
                                ? "text-rose-600 font-bold"
                                : "text-gray-500"
                            const formattedDate = fixture.date
                              ? new Date(fixture.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                              : "—"
                            return (
                              <tr key={fixture.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-white whitespace-nowrap">
                                  {fixture.homeAway === "home" || fixture.homeAway === "Home" ? "H" : "A"} vs {fixture.opponent || "—"}
                                </td>
                                <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formattedDate}</td>
                                <td className={`px-3 py-2 text-center ${resultColor}`}>
                                  {fixture.score || fixture.result || "—"}
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-green-700">{row.goals || "—"}</td>
                                <td className="px-3 py-2 text-center font-bold text-indigo-700">{row.assists || "—"}</td>
                                <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{row.shots > 0 ? `${row.shotsOnTarget}/${row.shots}` : "—"}</td>
                                <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{row.totalPasses > 0 ? `${row.successfulPasses}/${row.totalPasses}` : "—"}</td>
                                <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{row.duelsWon + row.duelsLost > 0 ? `${row.duelsWon}/${row.duelsLost}` : "—"}</td>
                                <td className="px-3 py-2 text-center">
                                  {row.yellowCards > 0 ? (
                                    <span className="inline-block w-4 h-5 bg-yellow-400 rounded-sm text-[10px] font-black text-yellow-900 leading-5 text-center">{row.yellowCards}</span>
                                  ) : "—"}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {row.redCards > 0 ? (
                                    <span className="inline-block w-4 h-5 bg-red-500 rounded-sm text-[10px] font-black text-white leading-5 text-center">{row.redCards}</span>
                                  ) : "—"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {perGameStats.some((r) => r.fromAnalysis) && (
                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                      Detailed stats (shots, passes, duels) come from imported Stepout match analysis data.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      <style>{`
        @media print {
          @page {
            margin: 1cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}

export default PlayerStats
