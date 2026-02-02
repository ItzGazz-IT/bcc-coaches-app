import { useState, useMemo } from "react"
import { Trophy, Target, TrendingUp, Award, Users, Download, Printer, Star, AlertCircle } from "lucide-react"
import { useApp } from "../contexts/AppContext"

function PlayerStats() {
  const { players, fixtures } = useApp()
  const [selectedTeam, setSelectedTeam] = useState("All")
  const [selectedStat, setSelectedStat] = useState("goals")

  // Calculate player statistics from fixtures
  const playerStats = useMemo(() => {
    const stats = {}

    players.forEach(player => {
      stats[player.id] = {
        player,
        appearances: 0,
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
          if (scorer.playerId && stats[scorer.playerId]) {
            stats[scorer.playerId].goals++
            stats[scorer.playerId].appearances++
          }
        })
      }

      // Count yellow cards
      if (fixture.yellowCards) {
        fixture.yellowCards.forEach(card => {
          if (card.playerId && stats[card.playerId]) {
            stats[card.playerId].yellowCards++
            if (!fixture.scorers?.some(s => s.playerId === card.playerId)) {
              stats[card.playerId].appearances++
            }
          }
        })
      }

      // Count red cards
      if (fixture.redCards) {
        fixture.redCards.forEach(card => {
          if (card.playerId && stats[card.playerId]) {
            stats[card.playerId].redCards++
            if (!fixture.scorers?.some(s => s.playerId === card.playerId) &&
                !fixture.yellowCards?.some(c => c.playerId === card.playerId)) {
              stats[card.playerId].appearances++
            }
          }
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
            if (playerStat.player.team === fixture.team && 
                (playerStat.player.position === "Goalkeeper" || 
                 playerStat.player.position === "Defender")) {
              if (playerStat.appearances > 0) {
                playerStat.cleanSheets++
              }
            }
          })
        }
      }
    })

    return Object.values(stats)
  }, [players, fixtures])

  const filteredStats = playerStats
    .filter(stat => selectedTeam === "All" || stat.player.team === selectedTeam)
    .sort((a, b) => {
      if (selectedStat === "goals") return b.goals - a.goals
      if (selectedStat === "appearances") return b.appearances - a.appearances
      if (selectedStat === "cards") return (b.yellowCards + b.redCards * 2) - (a.yellowCards + a.redCards * 2)
      if (selectedStat === "cleanSheets") return b.cleanSheets - a.cleanSheets
      return 0
    })

  const topScorers = [...playerStats]
    .filter(s => s.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5)

  const mostAppearances = [...playerStats]
    .filter(s => s.appearances > 0)
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 5)

  const disciplineIssues = [...playerStats]
    .filter(s => s.redCards > 0 || s.yellowCards > 2)
    .sort((a, b) => (b.yellowCards + b.redCards * 3) - (a.yellowCards + a.redCards * 3))
    .slice(0, 5)

  const handleExport = () => {
    const csvContent = [
      ["Player", "Team", "Position", "Appearances", "Goals", "Yellow Cards", "Red Cards", "Clean Sheets"],
      ...filteredStats.map(stat => [
        `${stat.player.firstName} ${stat.player.lastName}`,
        stat.player.team,
        stat.player.position,
        stat.appearances,
        stat.goals,
        stat.yellowCards,
        stat.redCards,
        stat.cleanSheets
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

  return (
    <div className="min-h-screen overflow-y-auto p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50 print:bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 print:mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2 print:text-gray-900">
                Player Statistics
              </h1>
              <p className="text-gray-600 print:text-sm">Season performance and analytics</p>
            </div>
            <div className="flex items-center gap-3 print:hidden">
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none bg-white font-semibold"
              >
                <option>All</option>
                <option>First Team</option>
                <option>Reserve Team</option>
                <option>Others</option>
              </select>
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

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 print:mb-4">
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 print:shadow-none">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Players</p>
                <p className="text-2xl font-black text-blue-600">
                  {filteredStats.filter(s => s.appearances > 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 print:shadow-none">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl">
                <Target className="text-white" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total Goals</p>
                <p className="text-2xl font-black text-green-600">
                  {filteredStats.reduce((sum, s) => sum + s.goals, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 print:shadow-none">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-3 rounded-xl">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Yellow Cards</p>
                <p className="text-2xl font-black text-yellow-600">
                  {filteredStats.reduce((sum, s) => sum + s.yellowCards, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 print:shadow-none">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-xl">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Red Cards</p>
                <p className="text-2xl font-black text-red-600">
                  {filteredStats.reduce((sum, s) => sum + s.redCards, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 print:mb-4">
          {/* Top Scorers */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none print:break-inside-avoid">
            <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 print:bg-green-600">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy size={20} />
                Top Scorers
              </h3>
            </div>
            <div className="p-4">
              {topScorers.length > 0 ? (
                <div className="space-y-3">
                  {topScorers.map((stat, index) => (
                    <div key={stat.player.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-300 text-orange-900' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">
                          {stat.player.firstName} {stat.player.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{stat.player.position}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-green-600">{stat.goals}</p>
                        <p className="text-xs text-gray-500">{stat.appearances} apps</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">No goals scored yet</p>
              )}
            </div>
          </div>

          {/* Most Appearances */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none print:break-inside-avoid">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 print:bg-blue-600">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Star size={20} />
                Most Appearances
              </h3>
            </div>
            <div className="p-4">
              {mostAppearances.length > 0 ? (
                <div className="space-y-3">
                  {mostAppearances.map((stat, index) => (
                    <div key={stat.player.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">
                          {stat.player.firstName} {stat.player.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{stat.player.team}</p>
                      </div>
                      <div className="text-2xl font-black text-blue-600">{stat.appearances}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">No appearances yet</p>
              )}
            </div>
          </div>

          {/* Discipline Watch */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none print:break-inside-avoid">
            <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 print:bg-orange-600">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle size={20} />
                Discipline Watch
              </h3>
            </div>
            <div className="p-4">
              {disciplineIssues.length > 0 ? (
                <div className="space-y-3">
                  {disciplineIssues.map((stat, index) => (
                    <div key={stat.player.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800">
                          {stat.player.firstName} {stat.player.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{stat.player.position}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {stat.yellowCards > 0 && (
                          <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">
                            🟨 {stat.yellowCards}
                          </span>
                        )}
                        {stat.redCards > 0 && (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
                            🟥 {stat.redCards}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">Excellent discipline!</p>
              )}
            </div>
          </div>
        </div>

        {/* Full Statistics Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white print:bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Detailed Statistics</h2>
              <div className="flex gap-2 print:hidden">
                {["goals", "appearances", "cards", "cleanSheets"].map(stat => (
                  <button
                    key={stat}
                    onClick={() => setSelectedStat(stat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                      selectedStat === stat
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {stat === "goals" ? "Goals" :
                     stat === "appearances" ? "Apps" :
                     stat === "cards" ? "Cards" : "Clean Sheets"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 print:bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Player</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Team</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase">Position</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Apps</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Goals</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">🟨</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">🟥</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase">Clean Sheets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStats.filter(s => s.appearances > 0 || s.goals > 0).map((stat, index) => (
                  <tr key={stat.player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 print:bg-gray-50'}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">
                        {stat.player.firstName} {stat.player.lastName}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{stat.player.team}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{stat.player.position}</td>
                    <td className="px-6 py-4 text-center font-bold text-gray-800">{stat.appearances}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-green-600">{stat.goals}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${stat.yellowCards > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                        {stat.yellowCards}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${stat.redCards > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {stat.redCards}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-blue-600">{stat.cleanSheets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
