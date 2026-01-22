import { CalendarDays, Users, ClipboardCheck, Star, Trophy, Shield, TrendingUp, Activity } from "lucide-react"
import { useApp } from "../contexts/AppContext"

function Card({ title, value, icon: Icon, gradient, delay = 0 }) {
  return (
    <div 
      className="bg-white rounded-3xl shadow-lg p-6 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 group overflow-hidden relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 ${gradient} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`}></div>
      <div className="relative z-10">
        <div className={`${gradient} text-white p-4 rounded-2xl w-fit mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon size={28} />
        </div>
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
        <p className="text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{value}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { players } = useApp()
  
  const firstTeamCount = players.filter(p => p.team === "First Team").length
  const reservesCount = players.filter(p => p.team === "Reserves").length
  const totalPlayers = players.length

  const getNextTrainingDay = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    const currentDay = today.getDay()
    
    if (currentDay === 0 || currentDay === 1 || currentDay === 5 || currentDay === 6) {
      return 'Tue 18:30'
    } else if (currentDay === 2) {
      return 'Wed 18:30'
    } else if (currentDay === 3) {
      return 'Thu 18:30'
    } else {
      return 'Tue 18:30'
    }
  }

  return (
    <div className="flex-1 p-10 bg-gradient-to-br from-gray-50 via-white to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-5xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-3">
            BCC Seniors & Reserves
          </h1>
          <p className="text-gray-600 text-lg">Welcome back! Here's your team overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card title="Total Players" value={totalPlayers.toString()} icon={Users} gradient="bg-gradient-to-br from-blue-500 to-blue-600" delay={0} />
          <Card title="Next Training" value={getNextTrainingDay()} icon={CalendarDays} gradient="bg-gradient-to-br from-purple-500 to-purple-600" delay={100} />
          <Card title="First Team" value={firstTeamCount.toString()} icon={Shield} gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" delay={200} />
          <Card title="Reserves" value={reservesCount.toString()} icon={Activity} gradient="bg-gradient-to-br from-orange-500 to-orange-600" delay={300} />
          <Card title="Upcoming Match" value="Sat vs Lions" icon={Trophy} gradient="bg-gradient-to-br from-yellow-500 to-yellow-600" delay={400} />
          <Card title="Training Days" value="Tue/Wed/Thu" icon={TrendingUp} gradient="bg-gradient-to-br from-pink-500 to-pink-600" delay={500} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-2xl">
                <ClipboardCheck className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-primary">
                Next Training Session
              </h2>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-gray-700 text-lg font-semibold">📅 Thursday - 18:30</p>
              <p className="text-gray-600">📍 BCC Training Grounds</p>
            </div>
            <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
              Mark Attendance →
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-2xl">
                <Trophy className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-primary">
                Upcoming Fixture
              </h2>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-gray-700 text-lg font-semibold">⚽ BCC Seniors vs Lions FC</p>
              <p className="text-gray-600">📅 Saturday - 15:00</p>
              <p className="text-gray-600">📍 Home Ground</p>
            </div>
            <button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
              View Fixture →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
