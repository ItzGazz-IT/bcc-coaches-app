import { CalendarDays, Users, ClipboardCheck, Star, Heart, Shield, UserPlus, Activity, AlertCircle, CheckCircle } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/config"

function StatCard({ title, value, icon: Icon, gradient, delay = 0, to, subtitle }) {
  const CardContent = () => (
    <>
      <div className={`absolute top-0 right-0 w-32 h-32 ${gradient} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`}></div>
      <div className="relative z-10">
        <div className={`${gradient} text-white p-3 rounded-xl w-fit mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon size={22} />
        </div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{title}</h3>
        <p className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </>
  )

  const className = "bg-white rounded-2xl shadow-lg p-4 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 group overflow-hidden relative cursor-pointer"
  
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
  const { players, injuries } = useApp()
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

  return (
    <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
            Team Dashboard
          </h1>
          <p className="text-gray-600">BCC Team Management Portal</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/attendance" className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2.5 rounded-xl">
                <ClipboardCheck className="text-white" size={22} />
              </div>
              <h2 className="text-lg font-bold text-gray-800">
                Next Session
              </h2>
            </div>
            <div className="space-y-2 flex-grow">
              <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                <p className="text-green-800 font-bold text-lg">{nextTraining.day}, {nextTraining.date}</p>
                <p className="text-green-600 text-sm">{nextTraining.time} - {nextTraining.type}</p>
                <p className="text-green-500 text-xs mt-1">BCC Grounds</p>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-green-600 font-semibold">Mark Attendance →</span>
            </div>
          </Link>

          <Link to="/players" className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl">
                <UserPlus className="text-white" size={22} />
              </div>
              <h2 className="text-lg font-bold text-gray-800">
                Quick Actions
              </h2>
            </div>
            <div className="space-y-2 flex-grow">
              <button className="w-full text-left px-3 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium text-blue-700 transition-colors">
                + Add New Player
              </button>
              <button className="w-full text-left px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-sm font-medium text-emerald-700 transition-colors">
                ✓ Take Attendance
              </button>
            </div>
            <div className="mt-4">
              <span className="text-sm text-blue-600 font-semibold">More Actions →</span>
            </div>
          </Link>

          <Link to="/reviews" className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 rounded-xl">
                <Star className="text-white" size={22} />
              </div>
              <h2 className="text-lg font-bold text-gray-800">
                Performance
              </h2>
            </div>
            <div className="space-y-2 flex-grow">
              <div className="flex items-center justify-between p-2.5 bg-purple-50 rounded-lg">
                <span className="text-sm text-gray-700">Recent Reviews</span>
                <span className="text-xl font-bold text-purple-600">0</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-pink-50 rounded-lg">
                <span className="text-sm text-gray-700">This Week</span>
                <span className="text-xl font-bold text-pink-600">0</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-purple-600 font-semibold">View Reviews →</span>
            </div>
          </Link>

          <Link to="/calendar" className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-2.5 rounded-xl">
                <CalendarDays className="text-white" size={22} />
              </div>
              <h2 className="text-lg font-bold text-gray-800">
                This Week
              </h2>
            </div>
            <div className="space-y-2 flex-grow">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-gray-700">Tue 18:30 - Training</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-gray-700">Wed 18:30 - Training</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-gray-700">Thu 18:30 - Training</span>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-indigo-600 font-semibold">Full Calendar →</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
