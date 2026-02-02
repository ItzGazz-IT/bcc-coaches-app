import { CalendarDays, Users, ClipboardCheck, Star, Heart, Shield, UserPlus, Activity, AlertCircle, CheckCircle, Trophy, TrendingUp, Target, BarChart3 } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { Link } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/config"
import logo from "../assets/bcc-logo.png"

function StatCard({ title, value, icon: Icon, gradient, delay = 0, to, subtitle }) {
  const CardContent = () => (
    <>
      <div className={`absolute top-0 right-0 w-20 h-20 ${gradient} opacity-10 rounded-full blur-xl`}></div>
      <div className="relative z-10">
        <div className={`${gradient} text-white p-2 rounded-lg w-fit mb-2 shadow-md`}>
          <Icon size={18} />
        </div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5 truncate">{title}</h3>
        <p className="text-2xl md:text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </>
  )

  const className = "bg-white rounded-xl shadow-sm p-3 hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-gray-100 group overflow-hidden relative cursor-pointer"
  
  if (to) {
    return (
      <Link to={to} className={className} style={{ animationDelay: `${delay}ms` }}>
        <CardContent />
      </Link>
    )
  }
  
  return (
    <div className={className} style={{ animationDelay: `${delay}ms` }}>
      <CardContent />
    </div>
  )
}

export default function Dashboard() {
  const { players, injuries, userRole, currentPlayerId, fitnessTests, reviews, fixtures } = useApp()
  const [sessions, setSessions] = useState([])
  
  // Load sessions from Firestore
  useEffect(() => {
    const q = query(collection(db, "sessions"), orderBy("date", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setSessions(sessionsData)
    })
    return () => unsubscribe()
  }, [])
  
  // Get current player data if logged in as player
  const currentPlayer = useMemo(() => {
    if (userRole === "player" && currentPlayerId) {
      return players.find(p => p.id === currentPlayerId)
    }
    return null
  }, [userRole, currentPlayerId, players])

  // Calculate player-specific stats
  const playerStats = useMemo(() => {
    if (!currentPlayer) return null

    const stats = {
      goals: 0,
      appearances: 0,
      yellowCards: 0,
      redCards: 0,
      cleanSheets: 0
    }

    fixtures.filter(f => f.status === "Completed").forEach(fixture => {
      // Count goals
      if (fixture.scorers) {
        fixture.scorers.forEach(scorer => {
          if (scorer.playerId === currentPlayerId) {
            stats.goals++
            stats.appearances++
          }
        })
      }

      // Count yellow cards
      if (fixture.yellowCards) {
        fixture.yellowCards.forEach(card => {
          if (card.playerId === currentPlayerId) {
            stats.yellowCards++
            if (!fixture.scorers?.some(s => s.playerId === currentPlayerId)) {
              stats.appearances++
            }
          }
        })
      }

      // Count red cards
      if (fixture.redCards) {
        fixture.redCards.forEach(card => {
          if (card.playerId === currentPlayerId) {
            stats.redCards++
            if (!fixture.scorers?.some(s => s.playerId === currentPlayerId) &&
                !fixture.yellowCards?.some(c => c.playerId === currentPlayerId)) {
              stats.appearances++
            }
          }
        })
      }

      // Count clean sheets
      if (fixture.result === "Win" && 
          (currentPlayer.position === "Goalkeeper" || currentPlayer.position === "Defender")) {
        const ourScore = fixture.homeAway === "Home" ? 
          parseInt(fixture.score?.split('-')[0] || 0) : 
          parseInt(fixture.score?.split('-')[1] || 0)
        const theirScore = fixture.homeAway === "Home" ? 
          parseInt(fixture.score?.split('-')[1] || 0) : 
          parseInt(fixture.score?.split('-')[0] || 0)

        if (theirScore === 0 && stats.appearances > 0) {
          stats.cleanSheets++
        }
      }
    })

    return stats
  }, [currentPlayer, currentPlayerId, fixtures])

  // Get player's latest fitness test
  const latestFitnessTest = useMemo(() => {
    if (!currentPlayerId) return null
    const playerTests = fitnessTests
      .filter(t => t.playerId === currentPlayerId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
    return playerTests[0] || null
  }, [currentPlayerId, fitnessTests])

  // Get player's recent reviews
  const recentReviews = useMemo(() => {
    if (!currentPlayerId) return []
    return reviews
      .filter(r => r.playerId === currentPlayerId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 3)
  }, [currentPlayerId, reviews])

  // Coach dashboard stats
  const firstTeamCount = players.filter(p => p.team === "First Team").length
  const reserveTeamCount = players.filter(p => p.team === "Reserve Team").length
  const othersCount = players.filter(p => p.team === "Others").length
  const totalPlayers = players.length
  
  // Get set of valid player IDs
  const validPlayerIds = new Set(players.map(p => p.id))
  
  // Only count injuries for players that still exist
  const validInjuries = injuries.filter(i => validPlayerIds.has(i.playerId))
  
  const injuredCount = validInjuries.filter(i => i.status === 'injured').length
  const unavailableCount = validInjuries.filter(i => i.status === 'unavailable').length
  
  // Count unique players who are injured or unavailable
  const unavailablePlayerIds = new Set(
    validInjuries
      .filter(i => i.status === 'injured' || i.status === 'unavailable')
      .map(i => i.playerId)
  )
  const availablePlayers = totalPlayers - unavailablePlayerIds.size

  const getNextTrainingSession = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Get upcoming sessions from database
    const upcomingSessions = sessions
      .filter(s => {
        const sessionDate = new Date(s.date)
        sessionDate.setHours(0, 0, 0, 0)
        return sessionDate >= today
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    
    // If there's a session in the database, use it
    if (upcomingSessions.length > 0) {
      const nextSession = upcomingSessions[0]
      const sessionDate = new Date(nextSession.date)
      return {
        day: sessionDate.toLocaleDateString('en-US', { weekday: 'long' }),
        date: sessionDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        time: nextSession.time || '18:30',
        type: nextSession.type || 'Training'
      }
    }
    
    // Fallback to default training schedule (Tue, Wed, Thu at 18:30)
    const currentDay = today.getDay()
    let daysToAdd = 0
    
    if (currentDay === 0 || currentDay === 1) { // Sunday or Monday
      daysToAdd = 2 - currentDay // Next Tuesday
    } else if (currentDay === 2) { // Tuesday
      daysToAdd = 0 // Today
    } else if (currentDay === 3) { // Wednesday
      daysToAdd = 0 // Today
    } else if (currentDay === 4) { // Thursday
      daysToAdd = 0 // Today
    } else { // Friday or Saturday
      daysToAdd = (9 - currentDay) % 7 // Next Tuesday
    }
    
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + daysToAdd)
    
    return {
      day: nextDate.toLocaleDateString('en-US', { weekday: 'long' }),
      date: nextDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      time: '18:30',
      type: 'Training'
    }
  }

  const nextTraining = getNextTrainingSession()

  // Render player-specific dashboard
  if (userRole === "player" && currentPlayer) {
    return (
      <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Logo Header */}
          <div className="md:hidden mb-4 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <img src={logo} alt="BCC Logo" className="w-12 h-12" />
              <div>
                <h2 className="text-lg font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  BCC Player Portal
                </h2>
                <p className="text-xs text-gray-500">Welcome, {currentPlayer.firstName}</p>
              </div>
            </div>
          </div>

          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
              Welcome, {currentPlayer.firstName}!
            </h1>
            <p className="text-sm md:text-base text-gray-600">{currentPlayer.team} • {currentPlayer.position}</p>
          </div>

          {/* Player Stats Overview */}
          {playerStats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
              <StatCard 
                title="Appearances" 
                value={playerStats.appearances.toString()} 
                icon={Trophy} 
                gradient="bg-gradient-to-br from-blue-500 to-blue-600" 
                to="/player-stats" 
              />
              <StatCard 
                title="Goals" 
                value={playerStats.goals.toString()} 
                icon={Target} 
                gradient="bg-gradient-to-br from-green-500 to-green-600" 
                to="/player-stats" 
              />
              <StatCard 
                title="Yellow Cards" 
                value={playerStats.yellowCards.toString()} 
                icon={AlertCircle} 
                gradient="bg-gradient-to-br from-amber-500 to-amber-600" 
                to="/player-stats" 
              />
              <StatCard 
                title="Red Cards" 
                value={playerStats.redCards.toString()} 
                icon={AlertCircle} 
                gradient="bg-gradient-to-br from-red-500 to-red-600" 
                to="/player-stats" 
              />
              {(currentPlayer.position === "Goalkeeper" || currentPlayer.position === "Defender") && (
                <StatCard 
                  title="Clean Sheets" 
                  value={playerStats.cleanSheets.toString()} 
                  icon={Shield} 
                  gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" 
                  to="/player-stats" 
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
            {/* Next Session */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg">
                  <ClipboardCheck className="text-white" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Next Session
                </h2>
              </div>
              <div className="space-y-3 flex-grow">
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <p className="text-green-800 font-bold text-lg">{nextTraining.day}, {nextTraining.date}</p>
                  <p className="text-green-600 text-sm mt-1">{nextTraining.time} - {nextTraining.type}</p>
                  <p className="text-green-500 text-xs mt-2">BCC Grounds</p>
                </div>
              </div>
            </div>

            {/* Latest Fitness Test */}
            <Link to="/fitness" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg">
                  <TrendingUp className="text-white" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Latest Fitness
                </h2>
              </div>
              {latestFitnessTest ? (
                <div className="space-y-3 flex-grow">
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <p className="text-xs text-purple-600 mb-2">Test Date: {new Date(latestFitnessTest.date).toLocaleDateString('en-GB')}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {latestFitnessTest.beepTest && (
                        <div>
                          <p className="text-gray-600">Beep Test</p>
                          <p className="text-lg font-bold text-purple-700">{latestFitnessTest.beepTest}</p>
                        </div>
                      )}
                      {latestFitnessTest.sprint10m && (
                        <div>
                          <p className="text-gray-600">10m Sprint</p>
                          <p className="text-lg font-bold text-purple-700">{latestFitnessTest.sprint10m}s</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex items-center justify-center">
                  <p className="text-gray-400 text-sm">No fitness tests recorded yet</p>
                </div>
              )}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <span className="text-sm text-purple-600 font-semibold flex items-center gap-1">
                  View All Tests 
                  <span className="text-lg">→</span>
                </span>
              </div>
            </Link>

            {/* Recent Reviews */}
            <Link to="/reviews" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-3 rounded-xl shadow-lg">
                  <Star className="text-white" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  My Reviews
                </h2>
              </div>
              {recentReviews.length > 0 ? (
                <div className="space-y-2 flex-grow">
                  {recentReviews.map((review, index) => (
                    <div key={review.id} className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                      <div className="flex items-center gap-1 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} 
                          />
                        ))}
                      </div>
                      <p className="text-xs text-indigo-600 truncate">{review.comments || "No comments"}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {new Date(review.timestamp).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-grow flex items-center justify-center">
                  <p className="text-gray-400 text-sm">No reviews yet</p>
                </div>
              )}
              <div className="mt-5 pt-4 border-t border-gray-100">
                <span className="text-sm text-indigo-600 font-semibold flex items-center gap-1">
                  View All Reviews 
                  <span className="text-lg">→</span>
                </span>
              </div>
            </Link>

            {/* Upcoming Fixtures */}
            <Link to="/fixtures" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1 md:col-span-2 xl:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-xl shadow-lg">
                  <Trophy className="text-white" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Upcoming Fixtures
                </h2>
              </div>
              <div className="space-y-3 flex-grow">
                {fixtures
                  .filter(f => f.status === "Scheduled" && new Date(f.date) >= new Date())
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .slice(0, 3)
                  .map(fixture => (
                    <div key={fixture.id} className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                      <p className="text-xs text-orange-600 mb-1">
                        {new Date(fixture.date).toLocaleDateString('en-GB')} • {fixture.time}
                      </p>
                      <p className="text-sm font-bold text-orange-800">{fixture.opponent}</p>
                      <p className="text-xs text-gray-500">{fixture.homeAway === "Home" ? "Home" : "Away"} • {fixture.competition}</p>
                    </div>
                  ))}
                {fixtures.filter(f => f.status === "Scheduled").length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">No upcoming fixtures</p>
                )}
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100">
                <span className="text-sm text-orange-600 font-semibold flex items-center gap-1">
                  View All Fixtures 
                  <span className="text-lg">→</span>
                </span>
              </div>
            </Link>

            {/* Quick Links */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-cyan-500 to-teal-600 p-3 rounded-xl shadow-lg">
                  <BarChart3 className="text-white" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Quick Access
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/player-stats" className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl p-4 border border-blue-200 transition-all">
                  <BarChart3 className="text-blue-600 mb-2" size={20} />
                  <p className="text-sm font-bold text-blue-800">My Statistics</p>
                </Link>
                <Link to="/fitness" className="bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl p-4 border border-purple-200 transition-all">
                  <TrendingUp className="text-purple-600 mb-2" size={20} />
                  <p className="text-sm font-bold text-purple-800">Fitness Tests</p>
                </Link>
                <Link to="/fixtures" className="bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-xl p-4 border border-orange-200 transition-all">
                  <Trophy className="text-orange-600 mb-2" size={20} />
                  <p className="text-sm font-bold text-orange-800">Fixtures</p>
                </Link>
                <Link to="/calendar" className="bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl p-4 border border-green-200 transition-all">
                  <CalendarDays className="text-green-600 mb-2" size={20} />
                  <p className="text-sm font-bold text-green-800">Calendar</p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render coach dashboard
  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Logo Header */}
        <div className="md:hidden mb-4 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <img src={logo} alt="BCC Logo" className="w-12 h-12" />
            <div>
              <h2 className="text-lg font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                BCC Coaches Portal
              </h2>
              <p className="text-xs text-gray-500">Team Management Dashboard</p>
            </div>
          </div>
        </div>

        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
            Dashboard
          </h1>
          <p className="text-sm md:text-base text-gray-600">BCC Team Management</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4 mb-6">
          <StatCard 
            title="Total Players" 
            value={totalPlayers.toString()} 
            icon={Users} 
            gradient="bg-gradient-to-br from-blue-500 to-blue-600" 
            delay={0} 
            to="/players" 
          />
          <StatCard 
            title="First Team" 
            value={firstTeamCount.toString()} 
            icon={Shield} 
            gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" 
            delay={50} 
            to="/players?team=First Team" 
          />
          <StatCard 
            title="Reserve Team" 
            value={reserveTeamCount.toString()} 
            icon={Activity} 
            gradient="bg-gradient-to-br from-orange-500 to-orange-600" 
            delay={100} 
            to="/players?team=Reserve Team" 
          />
          <StatCard 
            title="Others" 
            value={othersCount.toString()} 
            icon={Users} 
            gradient="bg-gradient-to-br from-purple-500 to-purple-600" 
            delay={125} 
            to="/players?team=Others" 
          />
          <StatCard 
            title="Available" 
            value={availablePlayers.toString()} 
            icon={CheckCircle} 
            gradient="bg-gradient-to-br from-green-500 to-green-600" 
            delay={150} 
            to="/players" 
            subtitle="Ready to play"
          />
          <StatCard 
            title="Injured" 
            value={injuredCount.toString()} 
            icon={Heart} 
            gradient="bg-gradient-to-br from-red-500 to-red-600" 
            delay={200} 
            to="/injuries" 
            subtitle="In recovery"
          />
          <StatCard 
            title="Unavailable" 
            value={unavailableCount.toString()} 
            icon={AlertCircle} 
            gradient="bg-gradient-to-br from-amber-500 to-amber-600" 
            delay={250} 
            to="/injuries" 
            subtitle="Not selected"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
          <Link to="/attendance" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg">
                <ClipboardCheck className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Next Session
              </h2>
            </div>
            <div className="space-y-3 flex-grow">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-green-800 font-bold text-lg">{nextTraining.day}, {nextTraining.date}</p>
                <p className="text-green-600 text-sm mt-1">{nextTraining.time} - {nextTraining.type}</p>
                <p className="text-green-500 text-xs mt-2">BCC Grounds</p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <span className="text-sm text-green-600 font-semibold flex items-center gap-1">
                Mark Attendance 
                <span className="text-lg">→</span>
              </span>
            </div>
          </Link>

          <Link to="/players" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                <UserPlus className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Quick Actions
              </h2>
            </div>
            <div className="space-y-3 flex-grow">
              <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-sm font-medium text-blue-700 transition-colors">
                + Add New Player
              </button>
              <button className="w-full text-left px-4 py-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-sm font-medium text-emerald-700 transition-colors">
                ✓ Take Attendance
              </button>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <span className="text-sm text-blue-600 font-semibold flex items-center gap-1">
                More Actions 
                <span className="text-lg">→</span>
              </span>
            </div>
          </Link>

          <Link to="/reviews" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg">
                <Star className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Performance
              </h2>
            </div>
            <div className="space-y-4 flex-grow">
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p className="text-sm text-purple-600 mb-1">Recent Reviews</p>
                <p className="text-3xl font-bold text-purple-700">0</p>
              </div>
              <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                <p className="text-sm text-pink-600 mb-1">This Week</p>
                <p className="text-3xl font-bold text-pink-700">0</p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <span className="text-sm text-purple-600 font-semibold flex items-center gap-1">
                View Reviews 
                <span className="text-lg">→</span>
              </span>
            </div>
          </Link>

          <Link to="/calendar" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                <CalendarDays className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                This Week
              </h2>
            </div>
            <div className="space-y-3 flex-grow">
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <p className="text-xs text-indigo-600 mb-2 font-medium">Tue 18:30</p>
                <p className="text-base font-bold text-indigo-800">Training</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <p className="text-xs text-indigo-600 mb-2 font-medium">Wed 18:30</p>
                <p className="text-base font-bold text-indigo-800">Training</p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <span className="text-sm text-indigo-600 font-semibold flex items-center gap-1">
                Full Calendar 
                <span className="text-lg">→</span>
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
