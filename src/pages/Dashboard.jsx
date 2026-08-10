import { CalendarDays, Users, ClipboardCheck, Heart, UserPlus, AlertCircle, CheckCircle, Trophy, Target, BarChart3, Building2, UserCog } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { Link } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/config"
import { usePullToRefresh } from "../hooks/usePullToRefresh"
import PullToRefreshIndicator from "../components/PullToRefreshIndicator"

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

function AdminMetric({ label, value, detail, icon: Icon, to }) { return <Link to={to} className="admin-metric"><Icon size={19} /><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></Link> }
function EmptyDashboard({ text }) { return <p className="admin-empty">{text}</p> }

export default function Dashboard() {
  const { players, injuries, userRole, currentPlayerId, fixtures, clubs, teams, coaches, currentClubId, currentTeamId } = useApp()
  const [sessions, setSessions] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  
  const handleRefresh = async () => {
    // Trigger data reload by incrementing key
    setRefreshKey(prev => prev + 1)
    // Add small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  const { isPulling, pullDistance } = usePullToRefresh(handleRefresh)
  
  // Load sessions from Firestore
  useEffect(() => {
    const q = query(collection(db, "sessions"), orderBy("date", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setSessions(sessionsData.filter(session => !currentClubId || (session.clubId === currentClubId && (!currentTeamId || session.teamId === currentTeamId))))
    })
    return () => unsubscribe()
  }, [currentClubId, currentTeamId])
  
  // Get current player data if logged in as player
  const currentPlayer = useMemo(() => {
    if ((userRole === "player" || userRole === "guardian") && currentPlayerId) {
      return players.find(p => p.id === currentPlayerId)
    }
    return null
  }, [userRole, currentPlayerId, players])

  const playerAvailability = useMemo(() => {
    if (!currentPlayerId) return { label: "Available", color: "text-green-700", bg: "bg-green-50", border: "border-green-100" }

    const activeStatus = injuries
      .filter(i => i.playerId === currentPlayerId && i.status !== "recovered")
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0]

    if (!activeStatus) {
      return { label: "Available", color: "text-green-700", bg: "bg-green-50", border: "border-green-100" }
    }

    if (activeStatus.status === "injured") {
      return { label: "Injured", color: "text-red-700", bg: "bg-red-50", border: "border-red-100" }
    }

    if (activeStatus.status === "unavailable") {
      return { label: "No Attendance", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100" }
    }

    return { label: "Available", color: "text-green-700", bg: "bg-green-50", border: "border-green-100" }
  }, [injuries, currentPlayerId])

  const upcomingPlayerFixtures = useMemo(() => {
    return fixtures
      .filter(f => f.status === "Upcoming" && new Date(f.date) >= new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [fixtures])

  const recentPlayerResults = useMemo(() => {
    return fixtures
      .filter(f => f.status === "Completed")
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [fixtures])

  // Coach dashboard stats
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
    
    return null
  }

  const nextTraining = getNextTrainingSession()

  // Render player-specific dashboard
  if ((userRole === "player" || userRole === "guardian") && currentPlayer) {
    return (
      <div className="dashboard-page flex-1 p-4 md:p-8 min-h-screen overflow-y-auto">
        <PullToRefreshIndicator isPulling={isPulling} pullDistance={pullDistance} />
        <div className="max-w-7xl mx-auto">
          {/* Mobile Logo Header */}
          <div className="md:hidden mb-4 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <img src="/unyra-logo.png" alt="UNYRA logo" className="w-12 h-12 rounded-xl object-contain" />
              <div>
                <h2 className="text-lg font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Player Portal
                </h2>
                <p className="text-xs text-gray-500">Welcome, {currentPlayer.firstName}</p>
              </div>
            </div>
          </div>

          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
              Welcome, {currentPlayer.firstName}!
            </h1>
            <p className="text-sm md:text-base text-gray-600">Squad • {currentPlayer.position}</p>
            <div className={`inline-flex items-center mt-2 px-3 py-1.5 rounded-lg border ${playerAvailability.bg} ${playerAvailability.border}`}>
              <span className={`text-xs font-bold uppercase tracking-wide ${playerAvailability.color}`}>Status: {playerAvailability.label}</span>
            </div>
          </div>

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
                {nextTraining ? <div className="bg-green-50 rounded-xl p-4 border border-green-100"><p className="text-green-800 font-bold text-lg">{nextTraining.day}, {nextTraining.date}</p><p className="text-green-600 text-sm mt-1">{nextTraining.time} - {nextTraining.type}</p></div> : <p className="text-gray-400 text-sm text-center py-4">No sessions scheduled</p>}
              </div>
            </div>

            {/* My Injury or No Attendance */}
            <Link to="/injuries" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-3 rounded-xl shadow-lg">
                  <Heart className="text-white" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  My Injury or No Attendance
                </h2>
              </div>
              <div className="space-y-3 flex-grow">
                <div className={`${playerAvailability.bg} rounded-xl p-4 border ${playerAvailability.border}`}>
                  <p className={`font-bold text-lg ${playerAvailability.color}`}>{playerAvailability.label}</p>
                  <p className="text-xs text-gray-600 mt-1">Keep this updated so coaches see your current status.</p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100">
                <span className="text-sm text-teal-600 font-semibold flex items-center gap-1">
                  Update Status
                  <span className="text-lg">→</span>
                </span>
              </div>
            </Link>

            {/* Away Day Hub Shortcut */}
            <Link to="/match-day" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                  <Trophy className="text-white" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Away Day Hub
                </h2>
              </div>
              <div className="space-y-3 flex-grow">
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-purple-800 font-semibold text-sm">Travel plans, attendance, and lineup updates in one place.</p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100">
                <span className="text-sm text-purple-700 font-semibold flex items-center gap-1">
                  Open Away Day Hub
                  <span className="text-lg">→</span>
                </span>
              </div>
            </Link>

            {/* Upcoming Fixtures */}
            <Link to="/match-day" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-xl shadow-lg">
                  <Trophy className="text-white" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Upcoming Fixtures
                </h2>
              </div>
              <div className="space-y-3 flex-grow">
                {upcomingPlayerFixtures
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
                {upcomingPlayerFixtures.length === 0 && (
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

            {/* Recent Results */}
            <Link to="/fixtures?tab=results" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-3 rounded-xl shadow-lg">
                  <CheckCircle className="text-white" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Recent Results
                </h2>
              </div>
              <div className="space-y-3 flex-grow">
                {recentPlayerResults.slice(0, 3).map(fixture => (
                  <div key={fixture.id} className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                    <p className="text-xs text-emerald-700 mb-1">
                      {new Date(fixture.date).toLocaleDateString('en-GB')}
                    </p>
                    <p className="text-sm font-bold text-emerald-900">vs {fixture.opponent}</p>
                    <p className="text-xs text-gray-600">{fixture.result || "Result"}{fixture.score ? ` • ${fixture.score}` : ""}</p>
                  </div>
                ))}
                {recentPlayerResults.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">No results yet</p>
                )}
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100">
                <span className="text-sm text-emerald-700 font-semibold flex items-center gap-1">
                  Open Results Tab
                  <span className="text-lg">→</span>
                </span>
              </div>
            </Link>

            {/* Quick Links */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 md:col-span-2 xl:col-span-3">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-gradient-to-br from-cyan-500 to-teal-600 p-3 rounded-xl shadow-lg">
                  <BarChart3 className="text-white" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Quick Access
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/match-day" className="bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl p-4 border border-purple-200 transition-all">
                  <Trophy className="text-purple-600 mb-2" size={20} />
                  <p className="text-sm font-bold text-purple-800">Away Day Hub</p>
                </Link>
                <Link to="/chat" className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl p-4 border border-blue-200 transition-all">
                  <ClipboardCheck className="text-blue-600 mb-2" size={20} />
                  <p className="text-sm font-bold text-blue-800">Club Chat</p>
                </Link>
                <Link to="/match-day" className="bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-xl p-4 border border-orange-200 transition-all">
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

  if (userRole === "club-admin") {
    const club = clubs.find(item => item.id === currentClubId)
    const clubTeams = teams.filter(item => item.clubId === currentClubId)
    const clubStaff = coaches.filter(item => item.clubId === currentClubId && item.role === "coach")
    const upcomingFixtures = fixtures.filter(item => item.status === "Upcoming" && item.date && new Date(item.date) >= new Date()).sort((a,b) => new Date(a.date) - new Date(b.date))
    return <div className="dashboard-page flex-1 p-4 md:p-8 min-h-screen overflow-y-auto"><PullToRefreshIndicator isPulling={isPulling} pullDistance={pullDistance} /><div className="max-w-7xl mx-auto space-y-6">
      <header className="admin-dashboard-head"><div><span className="eyebrow">Club administration</span><h1>{club?.name || "Club dashboard"}</h1><p>Club-wide oversight across every team, coach and player.</p></div><Link to="/clubs" className="admin-dashboard-action"><Building2 size={17} /> Manage teams</Link></header>
      <section className="admin-metric-grid"><AdminMetric label="Teams" value={clubTeams.length} detail="Across enabled sports" icon={Building2} to="/clubs" /><AdminMetric label="Players" value={totalPlayers} detail={`${Math.max(0,clubTeams.length * 30 - totalPlayers)} roster places open`} icon={Users} to="/players" /><AdminMetric label="Coaches" value={clubStaff.length} detail="Team staff accounts" icon={UserCog} to="/coaches" /><AdminMetric label="Unavailable" value={unavailablePlayerIds.size} detail="Injured or unavailable" icon={Heart} to="/injuries" /></section>
      <section className="admin-dashboard-grid"><div className="admin-panel"><header><div><span>Club structure</span><h2>Teams and capacity</h2></div><Link to="/clubs">Manage</Link></header><div className="admin-team-list">{clubTeams.map(team => { const count=players.filter(player=>player.teamId===team.id).length; return <div key={team.id}><div><strong>{team.name}</strong><span>{team.sportId} · {count}/30 players</span></div><div className="admin-capacity"><i style={{width:`${Math.min(100,count/30*100)}%`}} /></div></div>})}{!clubTeams.length && <EmptyDashboard text="No teams created" />}</div></div><div className="admin-panel"><header><div><span>Operations</span><h2>Upcoming fixtures</h2></div><Link to="/fixtures">View fixtures</Link></header><div className="admin-fixture-list">{upcomingFixtures.slice(0,5).map(item => <div key={item.id}><time>{new Date(item.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</time><div><strong>{item.teamName || clubTeams.find(team=>team.id===(item.teamId||item.team))?.name || "Team"} vs {item.opponent}</strong><span>{[item.homeAway,item.venue,item.time].filter(Boolean).join(" · ")}</span></div></div>)}{!upcomingFixtures.length && <EmptyDashboard text="No fixtures scheduled" />}</div></div></section>
      <section className="admin-quick-grid"><Link to="/attendance-admin"><ClipboardCheck /><strong>Manage attendance</strong><span>Record attendance by team</span></Link><Link to="/coaches"><UserCog /><strong>Staff accounts</strong><span>Coaches and assignments</span></Link><Link to="/announcements"><AlertCircle /><strong>Club announcements</strong><span>Communicate across the club</span></Link><Link to="/calendar"><CalendarDays /><strong>Club calendar</strong><span>{sessions.length ? `${sessions.length} saved sessions` : "No sessions scheduled"}</span></Link></section>
    </div></div>
  }

  // Render coach dashboard
  return (
    <div className="dashboard-page flex-1 p-4 md:p-8 min-h-screen overflow-y-auto">
      <PullToRefreshIndicator isPulling={isPulling} pullDistance={pullDistance} />
      <div className="max-w-7xl mx-auto">
        {/* Mobile Logo Header */}
        <div className="md:hidden mb-4 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/unyra-logo.png" alt="UNYRA logo" className="w-12 h-12 rounded-xl object-contain" />
            <div>
              <h2 className="text-lg font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Coach Portal
              </h2>
              <p className="text-xs text-gray-500">Team Management Dashboard</p>
            </div>
          </div>
        </div>

        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
            Dashboard
          </h1>
          <p className="text-sm md:text-base text-gray-600">Team Management</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          <StatCard 
            title="Total Players" 
            value={totalPlayers.toString()} 
            icon={Users} 
            gradient="bg-gradient-to-br from-blue-500 to-blue-600" 
            delay={0} 
            to="/players" 
          />
          <StatCard 
            title="Available" 
            value={availablePlayers.toString()} 
            icon={CheckCircle} 
            gradient="bg-gradient-to-br from-green-500 to-green-600" 
            delay={50} 
            to="/players" 
            subtitle="Ready to play"
          />
          <StatCard 
            title="Injured" 
            value={injuredCount.toString()} 
            icon={Heart} 
            gradient="bg-gradient-to-br from-red-500 to-red-600" 
            delay={100} 
            to="/injuries" 
            subtitle="In recovery"
          />
          <StatCard 
            title="Unavailable" 
            value={unavailableCount.toString()} 
            icon={AlertCircle} 
            gradient="bg-gradient-to-br from-amber-500 to-amber-600" 
            delay={150} 
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
              {nextTraining ? <div className="bg-green-50 rounded-xl p-4 border border-green-100"><p className="text-green-800 font-bold text-lg">{nextTraining.day}, {nextTraining.date}</p><p className="text-green-600 text-sm mt-1">{nextTraining.time} - {nextTraining.type}</p></div> : <p className="text-gray-400 text-sm text-center py-4">No sessions scheduled</p>}
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

          <Link to="/match-day" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg">
                <Trophy className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Match Results
              </h2>
            </div>
            <div className="space-y-4 flex-grow">
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <p className="text-sm text-purple-600 mb-1">Completed Matches</p>
                <p className="text-3xl font-bold text-purple-700">{fixtures.filter(f => f.status === "Completed").length}</p>
              </div>
              <div className="bg-pink-50 rounded-xl p-4 border border-pink-100">
                <p className="text-sm text-pink-600 mb-1">Upcoming Fixtures</p>
                <p className="text-3xl font-bold text-pink-700">{fixtures.filter(f => f.status === "Upcoming").length}</p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <span className="text-sm text-purple-600 font-semibold flex items-center gap-1">
                View Fixtures & Results 
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
              {sessions.slice(0,2).map(session => <div key={session.id} className="bg-indigo-50 rounded-xl p-4 border border-indigo-100"><p className="text-xs text-indigo-600 mb-2 font-medium">{new Date(session.date).toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short"})}{session.time ? ` · ${session.time}` : ""}</p><p className="text-base font-bold text-indigo-800">{session.type || "Session"}</p></div>)}{!sessions.length && <p className="text-gray-400 text-sm text-center py-4">No sessions scheduled</p>}
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
