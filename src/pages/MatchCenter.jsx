import { useState, useEffect, useRef } from "react"
import { Trophy, Calendar, Clock, MapPin, Users, ChevronRight, Target, Activity, Edit, Share2, X, Plus, Trash2, Play, Pause, StopCircle } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { useNavigate } from "react-router-dom"

function MatchCenter() {
  const { fixtures, updateFixture, players } = useApp()
  const navigate = useNavigate()
  const [selectedTeam, setSelectedTeam] = useState("All")
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [showMatchDetails, setShowMatchDetails] = useState(false)
  const [matchDetails, setMatchDetails] = useState({
    scorers: [],
    yellowCards: [],
    redCards: []
  })
  
  // Live match tracking
  const [liveMatch, setLiveMatch] = useState(null)
  const [matchTime, setMatchTime] = useState(0) // in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [currentHalf, setCurrentHalf] = useState(1) // 1 or 2
  const [showOpponentGoalModal, setShowOpponentGoalModal] = useState(false)
  const [opponentShirtNumber, setOpponentShirtNumber] = useState("")
  const timerRef = useRef(null)

  const upcomingFixtures = fixtures
    .filter(f => f.status === "Upcoming")
    .filter(f => selectedTeam === "All" || f.team === selectedTeam)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)

  const recentResults = fixtures
    .filter(f => f.status === "Completed")
    .filter(f => selectedTeam === "All" || f.team === selectedTeam)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  const stats = {
    totalMatches: fixtures.filter(f => f.status === "Completed").length,
    wins: fixtures.filter(f => f.result === "Win").length,
    draws: fixtures.filter(f => f.result === "Draw").length,
    losses: fixtures.filter(f => f.result === "Loss").length,
    upcoming: fixtures.filter(f => f.status === "Upcoming").length
  }

  const handleMatchClick = (fixture) => {
    setSelectedMatch(fixture)
    setMatchDetails({
      scorers: fixture.scorers || [],
      yellowCards: fixture.yellowCards || [],
      redCards: fixture.redCards || []
    })
    setShowMatchDetails(true)
  }

  const handleAddScorer = () => {
    setMatchDetails({
      ...matchDetails,
      scorers: [...matchDetails.scorers, { playerId: "", playerName: "", minute: "" }]
    })
  }

  const handleAddCard = (type) => {
    const newCard = { playerId: "", playerName: "", minute: "" }
    setMatchDetails({
      ...matchDetails,
      [type]: [...matchDetails[type], newCard]
    })
  }

  const handleRemoveItem = (type, index) => {
    setMatchDetails({
      ...matchDetails,
      [type]: matchDetails[type].filter((_, i) => i !== index)
    })
  }

  const handleItemChange = (type, index, field, value) => {
    const updated = [...matchDetails[type]]
    updated[index][field] = value
    
    if (field === "playerId") {
      const player = players.find(p => p.id === value)
      if (player) {
        updated[index].playerName = `${player.firstName} ${player.lastName}`
      }
    }
    
    setMatchDetails({
      ...matchDetails,
      [type]: updated
    })
  }

  const handleSaveMatchDetails = async () => {
    if (selectedMatch) {
      await updateFixture(selectedMatch.id, {
        ...selectedMatch,
        scorers: matchDetails.scorers,
        yellowCards: matchDetails.yellowCards,
        redCards: matchDetails.redCards
      })
      setShowMatchDetails(false)
      setSelectedMatch(null)
    }
  }

  const generateWhatsAppMessage = (fixture) => {
    const details = {
      scorers: fixture.scorers || [],
      yellowCards: fixture.yellowCards || [],
      redCards: fixture.redCards || []
    }
    
    let message = `*MATCH RESULT*\n\n`
    message += `${fixture.team}\n`
    message += `vs ${fixture.opponent}\n\n`
    message += `*Score:* ${fixture.score || "N/A"}\n`
    message += `*Result:* ${fixture.result}\n`
    message += `*Competition:* ${fixture.competition || "N/A"}\n`
    message += `*Date:* ${new Date(fixture.date).toLocaleDateString('en-GB')}\n`
    message += `*Venue:* ${fixture.venue || "N/A"} (${fixture.homeAway})\n\n`
    
    if (details.scorers.length > 0) {
      message += `⚽ *SCORERS:*\n`
      details.scorers.forEach(scorer => {
        message += `  • ${scorer.playerName}${scorer.minute ? ` (${scorer.minute}')` : ''}\n`
      })
      message += `\n`
    }
    
    if (details.yellowCards.length > 0) {
      message += `🟨 *YELLOW CARDS:*\n`
      details.yellowCards.forEach(card => {
        message += `  • ${card.playerName}${card.minute ? ` (${card.minute}')` : ''}\n`
      })
      message += `\n`
    }
    
    if (details.redCards.length > 0) {
      message += `🟥 *RED CARDS:*\n`
      details.redCards.forEach(card => {
        message += `  • ${card.playerName}${card.minute ? ` (${card.minute}')` : ''}\n`
      })
      message += `\n`
    }
    
    message += `\n_Posted from BCC Coaches Portal_`
    
    return encodeURIComponent(message)
  }

  const handleShareToWhatsApp = (fixture) => {
    const message = generateWhatsAppMessage(fixture)
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  // Live match functions
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setMatchTime(prev => prev + 1)
      }, 1000) // Update every second
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRunning])

  const formatMatchTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startLiveMatch = (fixture) => {
    setLiveMatch(fixture)
    setMatchTime(0)
    setHomeScore(0)
    setAwayScore(0)
    setCurrentHalf(1)
    setMatchDetails({
      scorers: [],
      yellowCards: [],
      redCards: []
    })
    setIsRunning(false)
  }

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const switchHalf = () => {
    setCurrentHalf(currentHalf === 1 ? 2 : 1)
    setMatchTime(0)
  }

  const addQuickGoal = (isHome, playerIdOrShirt = null) => {
    if (isHome) {
      setHomeScore(prev => prev + 1)
    } else {
      setAwayScore(prev => prev + 1)
    }
    
    const timeStamp = `${currentHalf === 1 ? '1H' : '2H'} ${formatMatchTime(matchTime)}`
    
    if (playerIdOrShirt) {
      const isBCCTeam = liveMatch.homeAway === 'Home' ? isHome : !isHome
      
      if (isBCCTeam) {
        // BCC player - use player ID
        const player = players.find(p => p.id === playerIdOrShirt)
        if (player) {
          setMatchDetails(prev => ({
            ...prev,
            scorers: [...prev.scorers, {
              playerId: playerIdOrShirt,
              playerName: `${player.firstName} ${player.lastName}`,
              position: player.position,
              minute: timeStamp,
              team: liveMatch.team
            }]
          }))
        }
      } else {
        // Opposition player - use shirt number
        setMatchDetails(prev => ({
          ...prev,
          scorers: [...prev.scorers, {
            shirtNumber: playerIdOrShirt,
            playerName: `#${playerIdOrShirt}`,
            minute: timeStamp,
            team: liveMatch.opponent
          }]
        }))
      }
    }
  }

  const addQuickCard = (type, playerIdOrShirt, isBCCPlayer) => {
    const timeStamp = `${currentHalf === 1 ? '1H' : '2H'} ${formatMatchTime(matchTime)}`
    
    if (isBCCPlayer) {
      const player = players.find(p => p.id === playerIdOrShirt)
      if (player) {
        setMatchDetails(prev => ({
          ...prev,
          [type]: [...prev[type], {
            playerId: playerIdOrShirt,
            playerName: `${player.firstName} ${player.lastName}`,
            position: player.position,
            minute: timeStamp,
            team: liveMatch.team
          }]
        }))
      }
    } else {
      setMatchDetails(prev => ({
        ...prev,
        [type]: [...prev[type], {
          shirtNumber: playerIdOrShirt,
          playerName: `#${playerIdOrShirt}`,
          minute: timeStamp,
          team: liveMatch.opponent
        }]
      }))
    }
  }

  const handleOpponentGoal = () => {
    if (opponentShirtNumber) {
      const isHome = liveMatch.homeAway === 'Home'
      addQuickGoal(!isHome, opponentShirtNumber)
      setOpponentShirtNumber("")
      setShowOpponentGoalModal(false)
    }
  }

  const endLiveMatch = async () => {
    if (liveMatch && window.confirm('End this match and save the result?')) {
      const finalScore = `${homeScore}-${awayScore}`
      let result = 'Draw'
      
      if (liveMatch.homeAway === 'Home') {
        if (homeScore > awayScore) result = 'Win'
        else if (homeScore < awayScore) result = 'Loss'
      } else {
        if (awayScore > homeScore) result = 'Win'
        else if (awayScore < homeScore) result = 'Loss'
      }

      await updateFixture(liveMatch.id, {
        ...liveMatch,
        score: finalScore,
        result,
        status: 'Completed',
        scorers: matchDetails.scorers,
        yellowCards: matchDetails.yellowCards,
        redCards: matchDetails.redCards
      })

      setLiveMatch(null)
      setIsRunning(false)
      setMatchTime(0)
    }
  }

  return (
    <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 via-white to-green-50 min-h-screen overflow-y-auto">
      {liveMatch ? (
        // Live Match Tracking View
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl shadow-2xl p-8 text-white mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-black mb-1">LIVE MATCH</h1>
                <p className="text-green-100">{liveMatch.competition || 'Friendly'}</p>
              </div>
              <button
                onClick={endLiveMatch}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-5 py-3 rounded-xl font-bold transition-all"
              >
                <StopCircle size={20} />
                End Match
              </button>
            </div>

            {/* Timer and Score */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
              <div className="text-center mb-6">
                <div className="text-lg font-bold mb-2 text-green-100">
                  {currentHalf === 1 ? 'FIRST HALF' : 'SECOND HALF'}
                </div>
                <div className="text-7xl font-black mb-4">{formatMatchTime(matchTime)}</div>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={toggleTimer}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                      isRunning ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause size={20} />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play size={20} />
                        Start
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setMatchTime(0)}
                    className="bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl font-bold transition-all"
                  >
                    Reset Time
                  </button>
                  <button
                    onClick={switchHalf}
                    className="bg-blue-500 hover:bg-blue-600 px-4 py-3 rounded-xl font-bold transition-all"
                  >
                    Switch to {currentHalf === 1 ? '2nd' : '1st'} Half
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 items-center">
                <div className="text-center">
                  <div className="text-5xl font-black mb-2">{homeScore}</div>
                  <div className="text-lg font-bold mb-3">
                    {liveMatch.homeAway === 'Home' ? liveMatch.team : liveMatch.opponent}
                  </div>
                  <button
                    onClick={() => {
                      if (liveMatch.homeAway === 'Home') {
                        // BCC scoring at home - show player selector
                        document.getElementById('bcc-scorer-select')?.focus()
                      } else {
                        // Opposition scoring - show shirt number modal
                        setShowOpponentGoalModal(true)
                      }
                    }}
                    className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg font-bold transition-all w-full"
                  >
                    + Goal
                  </button>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-black opacity-50">VS</div>
                  <div className="text-sm mt-2">{liveMatch.venue}</div>
                  <div className="text-xs text-green-100 mt-1">{new Date(liveMatch.date).toLocaleDateString('en-GB')}</div>
                </div>

                <div className="text-center">
                  <div className="text-5xl font-black mb-2">{awayScore}</div>
                  <div className="text-lg font-bold mb-3">
                    {liveMatch.homeAway === 'Away' ? liveMatch.team : liveMatch.opponent}
                  </div>
                  <button
                    onClick={() => {
                      if (liveMatch.homeAway === 'Away') {
                        // BCC scoring away - show player selector
                        document.getElementById('bcc-scorer-select')?.focus()
                      } else {
                        // Opposition scoring - show shirt number modal
                        setShowOpponentGoalModal(true)
                      }
                    }}
                    className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-bold transition-all w-full"
                  >
                    + Goal
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add Goal Scorer - BCC Team */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                ⚽ {liveMatch.team} Goal Scorer
              </h3>
              <select
                id="bcc-scorer-select"
                onChange={(e) => {
                  if (e.target.value) {
                    const isHome = liveMatch.homeAway === 'Home'
                    addQuickGoal(isHome, e.target.value)
                    e.target.value = ""
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none mb-3 font-semibold"
              >
                <option value="">Select {liveMatch.team} Scorer</option>
                {players
                  .filter(p => p.team === liveMatch.team)
                  .map(player => (
                    <option key={player.id} value={player.id}>
                      {player.firstName} {player.lastName} - {player.position}
                    </option>
                  ))}
              </select>

              {matchDetails.scorers.filter(s => s.team === liveMatch.team).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-bold text-gray-600 mb-2">{liveMatch.team} Goals:</p>
                  {matchDetails.scorers.filter(s => s.team === liveMatch.team).map((scorer, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <span className="font-semibold text-gray-800">{scorer.playerName}</span>
                        <span className="text-xs text-gray-500 ml-2">{scorer.position}</span>
                      </div>
                      <span className="text-green-700 font-bold">{scorer.minute}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Cards - BCC Team */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                🟨🟥 {liveMatch.team} Cards
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Yellow Card</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addQuickCard('yellowCards', e.target.value, true)
                        e.target.value = ""
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-yellow-300 rounded-xl focus:border-yellow-500 outline-none font-semibold"
                  >
                    <option value="">Select Player</option>
                    {players
                      .filter(p => p.team === liveMatch.team)
                      .map(player => (
                        <option key={player.id} value={player.id}>
                          {player.firstName} {player.lastName}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Red Card</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addQuickCard('redCards', e.target.value, true)
                        e.target.value = ""
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-red-300 rounded-xl focus:border-red-500 outline-none font-semibold"
                  >
                    <option value="">Select Player</option>
                    {players
                      .filter(p => p.team === liveMatch.team)
                      .map(player => (
                        <option key={player.id} value={player.id}>
                          {player.firstName} {player.lastName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {(matchDetails.yellowCards.filter(c => c.team === liveMatch.team).length > 0 || 
                matchDetails.redCards.filter(c => c.team === liveMatch.team).length > 0) && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-bold text-gray-600 mb-2">Cards Issued:</p>
                  {matchDetails.yellowCards.filter(c => c.team === liveMatch.team).map((card, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="font-semibold text-gray-800">🟨 {card.playerName}</span>
                      <span className="text-yellow-700 font-bold">{card.minute}</span>
                    </div>
                  ))}
                  {matchDetails.redCards.filter(c => c.team === liveMatch.team).map((card, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                      <span className="font-semibold text-gray-800">🟥 {card.playerName}</span>
                      <span className="text-red-700 font-bold">{card.minute}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Opposition Goals */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                ⚽ {liveMatch.opponent} Goals
              </h3>
              
              {matchDetails.scorers.filter(s => s.team === liveMatch.opponent).length > 0 ? (
                <div className="space-y-2">
                  {matchDetails.scorers.filter(s => s.team === liveMatch.opponent).map((scorer, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="font-semibold text-gray-800">{scorer.playerName}</span>
                      <span className="text-blue-700 font-bold">{scorer.minute}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No goals scored yet</p>
              )}
            </div>

            {/* Opposition Cards */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                🟨🟥 {liveMatch.opponent} Cards
              </h3>
              
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Yellow Card - Shirt #</label>
                  <input
                    type="text"
                    placeholder="Enter shirt number"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                        addQuickCard('yellowCards', e.target.value, false)
                        e.target.value = ""
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-yellow-300 rounded-xl focus:border-yellow-500 outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Red Card - Shirt #</label>
                  <input
                    type="text"
                    placeholder="Enter shirt number"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                        addQuickCard('redCards', e.target.value, false)
                        e.target.value = ""
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-red-300 rounded-xl focus:border-red-500 outline-none font-semibold"
                  />
                </div>
              </div>

              {(matchDetails.yellowCards.filter(c => c.team === liveMatch.opponent).length > 0 || 
                matchDetails.redCards.filter(c => c.team === liveMatch.opponent).length > 0) && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-600 mb-2">Cards Issued:</p>
                  {matchDetails.yellowCards.filter(c => c.team === liveMatch.opponent).map((card, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="font-semibold text-gray-800">🟨 {card.playerName}</span>
                      <span className="text-yellow-700 font-bold">{card.minute}</span>
                    </div>
                  ))}
                  {matchDetails.redCards.filter(c => c.team === liveMatch.opponent).map((card, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
                      <span className="font-semibold text-gray-800">🟥 {card.playerName}</span>
                      <span className="text-red-700 font-bold">{card.minute}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Normal Match Center View
        <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
                Match Center
              </h1>
              <p className="text-gray-600">Live fixtures, results, and match statistics</p>
            </div>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none bg-white font-semibold"
            >
              <option>All</option>
              <option>First Team</option>
              <option>Reserve Team</option>
              <option>Others</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl">
                <Trophy className="text-white" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total</p>
                <p className="text-2xl font-black text-blue-600">{stats.totalMatches}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl">
                <Target className="text-white" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Wins</p>
                <p className="text-2xl font-black text-green-600">{stats.wins}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-3 rounded-xl">
                <Activity className="text-white" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Draws</p>
                <p className="text-2xl font-black text-gray-600">{stats.draws}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-xl">
                <Trophy className="text-white" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Losses</p>
                <p className="text-2xl font-black text-red-600">{stats.losses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl">
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Upcoming</p>
                <p className="text-2xl font-black text-purple-600">{stats.upcoming}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Fixtures */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Next Fixtures</h2>
              <button
                onClick={() => navigate("/fixtures")}
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1"
              >
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="p-6">
              {upcomingFixtures.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500 font-medium">No upcoming fixtures</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingFixtures.map(fixture => (
                    <div key={fixture.id} className="p-4 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
                            {fixture.team}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${
                            fixture.homeAway === "Home" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                          }`}>
                            {fixture.homeAway}
                          </div>
                        </div>
                        <button
                          onClick={() => startLiveMatch(fixture)}
                          className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:from-green-600 hover:to-green-700 transition-all"
                        >
                          <Play size={16} />
                          Start Match
                        </button>
                      </div>
                      <h3 className="text-lg font-black text-gray-800 mb-2">vs {fixture.opponent}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{new Date(fixture.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        {fixture.time && (
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>{fixture.time}</span>
                          </div>
                        )}
                        {fixture.venue && (
                          <div className="flex items-center gap-1">
                            <MapPin size={14} />
                            <span>{fixture.venue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Results */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Recent Results</h2>
              <button
                onClick={() => navigate("/fixtures")}
                className="text-green-600 hover:text-green-700 font-semibold text-sm flex items-center gap-1"
              >
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="p-6">
              {recentResults.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500 font-medium">No recent results</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentResults.map(fixture => (
                    <div key={fixture.id} className="p-4 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-bold">
                            {fixture.team}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-bold ${
                            fixture.result === "Win" ? "bg-green-100 text-green-700" :
                            fixture.result === "Loss" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {fixture.result}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {fixture.score && (
                            <div className="text-xl font-black text-gray-800">
                              {fixture.score}
                            </div>
                          )}
                          <button
                            onClick={() => handleMatchClick(fixture)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Edit match details"
                          >
                            <Edit size={16} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleShareToWhatsApp(fixture)}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                            title="Share to WhatsApp"
                          >
                            <Share2 size={16} className="text-green-600" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-lg font-black text-gray-800 mb-2">vs {fixture.opponent}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{new Date(fixture.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        {fixture.competition && (
                          <div className="flex items-center gap-1">
                            <Trophy size={14} />
                            <span>{fixture.competition}</span>
                          </div>
                        )}
                      </div>
                      {(fixture.scorers?.length > 0 || fixture.yellowCards?.length > 0 || fixture.redCards?.length > 0) && (
                        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4 text-xs">
                          {fixture.scorers?.length > 0 && (
                            <span className="text-green-700 font-semibold">⚽ {fixture.scorers.length}</span>
                          )}
                          {fixture.yellowCards?.length > 0 && (
                            <span className="text-yellow-600 font-semibold">🟨 {fixture.yellowCards.length}</span>
                          )}
                          {fixture.redCards?.length > 0 && (
                            <span className="text-red-600 font-semibold">🟥 {fixture.redCards.length}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Win Rate */}
        {stats.totalMatches > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Performance Overview</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-black text-green-600">
                  {Math.round((stats.wins / stats.totalMatches) * 100)}%
                </div>
                <p className="text-sm text-gray-600 font-semibold mt-1">Win Rate</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-gray-600">
                  {Math.round((stats.draws / stats.totalMatches) * 100)}%
                </div>
                <p className="text-sm text-gray-600 font-semibold mt-1">Draw Rate</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-red-600">
                  {Math.round((stats.losses / stats.totalMatches) * 100)}%
                </div>
                <p className="text-sm text-gray-600 font-semibold mt-1">Loss Rate</p>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Match Details Modal */}
      {showMatchDetails && selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Match Details</h2>
                <p className="text-green-100 text-sm mt-1">
                  {selectedMatch.team} vs {selectedMatch.opponent} - {selectedMatch.score}
                </p>
              </div>
              <button
                onClick={() => setShowMatchDetails(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} className="text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Scorers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    ⚽ Goal Scorers
                  </h3>
                  <button
                    onClick={handleAddScorer}
                    className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-600 transition-all"
                  >
                    <Plus size={16} />
                    Add Scorer
                  </button>
                </div>
                <div className="space-y-3">
                  {matchDetails.scorers.map((scorer, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex-1">
                        <select
                          value={scorer.playerId}
                          onChange={(e) => handleItemChange("scorers", index, "playerId", e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 outline-none mb-2"
                        >
                          <option value="">Select Player</option>
                          {players
                            .filter(p => p.team === selectedMatch.team)
                            .map(player => (
                              <option key={player.id} value={player.id}>
                                {player.firstName} {player.lastName} - {player.position}
                              </option>
                            ))}
                        </select>
                        <input
                          type="text"
                          value={scorer.minute}
                          onChange={(e) => handleItemChange("scorers", index, "minute", e.target.value)}
                          placeholder="Minute (e.g., 23')"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveItem("scorers", index)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} className="text-red-600" />
                      </button>
                    </div>
                  ))}
                  {matchDetails.scorers.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">No scorers added yet</p>
                  )}
                </div>
              </div>

              {/* Yellow Cards */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    🟨 Yellow Cards
                  </h3>
                  <button
                    onClick={() => handleAddCard("yellowCards")}
                    className="flex items-center gap-1 bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-yellow-600 transition-all"
                  >
                    <Plus size={16} />
                    Add Yellow
                  </button>
                </div>
                <div className="space-y-3">
                  {matchDetails.yellowCards.map((card, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex-1">
                        <select
                          value={card.playerId}
                          onChange={(e) => handleItemChange("yellowCards", index, "playerId", e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-yellow-500 outline-none mb-2"
                        >
                          <option value="">Select Player</option>
                          {players
                            .filter(p => p.team === selectedMatch.team)
                            .map(player => (
                              <option key={player.id} value={player.id}>
                                {player.firstName} {player.lastName} - {player.position}
                              </option>
                            ))}
                        </select>
                        <input
                          type="text"
                          value={card.minute}
                          onChange={(e) => handleItemChange("yellowCards", index, "minute", e.target.value)}
                          placeholder="Minute (e.g., 45')"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-yellow-500 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveItem("yellowCards", index)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} className="text-red-600" />
                      </button>
                    </div>
                  ))}
                  {matchDetails.yellowCards.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">No yellow cards</p>
                  )}
                </div>
              </div>

              {/* Red Cards */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    🟥 Red Cards
                  </h3>
                  <button
                    onClick={() => handleAddCard("redCards")}
                    className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-600 transition-all"
                  >
                    <Plus size={16} />
                    Add Red
                  </button>
                </div>
                <div className="space-y-3">
                  {matchDetails.redCards.map((card, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex-1">
                        <select
                          value={card.playerId}
                          onChange={(e) => handleItemChange("redCards", index, "playerId", e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 outline-none mb-2"
                        >
                          <option value="">Select Player</option>
                          {players
                            .filter(p => p.team === selectedMatch.team)
                            .map(player => (
                              <option key={player.id} value={player.id}>
                                {player.firstName} {player.lastName} - {player.position}
                              </option>
                            ))}
                        </select>
                        <input
                          type="text"
                          value={card.minute}
                          onChange={(e) => handleItemChange("redCards", index, "minute", e.target.value)}
                          placeholder="Minute (e.g., 67')"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 outline-none"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveItem("redCards", index)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} className="text-red-600" />
                      </button>
                    </div>
                  ))}
                  {matchDetails.redCards.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">No red cards</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveMatchDetails}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all"
                >
                  Save Match Details
                </button>
                <button
                  onClick={() => {
                    handleSaveMatchDetails()
                    setTimeout(() => handleShareToWhatsApp(selectedMatch), 500)
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                  <Share2 size={18} />
                  Save & Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opponent Goal Modal */}
      {showOpponentGoalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {liveMatch.opponent} Goal
              </h3>
              <p className="text-sm text-gray-600">Enter the shirt number of the scorer</p>
            </div>
            
            <input
              type="text"
              value={opponentShirtNumber}
              onChange={(e) => setOpponentShirtNumber(e.target.value)}
              placeholder="Shirt number (e.g., 9)"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none font-semibold mb-4"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleOpponentGoal()
                }
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={handleOpponentGoal}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                Add Goal
              </button>
              <button
                onClick={() => {
                  setShowOpponentGoalModal(false)
                  setOpponentShirtNumber("")
                }}
                className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MatchCenter
