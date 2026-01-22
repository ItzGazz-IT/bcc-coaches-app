import { CalendarDays, Users, ClipboardCheck, Star, Trophy, Shield } from "lucide-react"
import { useApp } from "../contexts/AppContext"

function Card({ title, value, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl shadow p-8 flex items-center gap-6 hover:shadow-lg transition">
      <div className="bg-secondary text-white p-4 rounded-xl">
        <Icon size={32} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-500">{title}</h3>
        <p className="text-3xl font-bold text-primary">{value}</p>
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
    <div className="flex-1 p-10">
      <h1 className="text-4xl font-bold text-primary mb-10">
        BCC Seniors & Reserves
      </h1>

      <div className="grid grid-cols-3 gap-8 mb-10">
        <Card title="Total Players" value={totalPlayers.toString()} icon={Users} />
        <Card title="Next Training" value={getNextTrainingDay()} icon={CalendarDays} />
        <Card title="First Team" value={firstTeamCount.toString()} icon={Shield} />
        <Card title="Reserves" value={reservesCount.toString()} icon={Users} />
        <Card title="Upcoming Match" value="Sat vs Lions" icon={Trophy} />
        <Card title="Training Days" value="Tue/Wed/Thu" icon={CalendarDays} />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow p-8">
          <h2 className="text-2xl font-bold text-primary mb-4">
            Next Training Session
          </h2>
          <p className="text-gray-600">Thursday - 18:30</p>
          <p className="text-gray-600">BCC Training Grounds</p>

          <button className="mt-6 bg-secondary text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent">
            Mark Attendance
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow p-8">
          <h2 className="text-2xl font-bold text-primary mb-4">
            Upcoming Fixture
          </h2>
          <p className="text-gray-600">BCC Seniors vs Lions FC</p>
          <p className="text-gray-600">Saturday - 15:00</p>
          <p className="text-gray-600">Home Ground</p>

          <button className="mt-6 bg-secondary text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent">
            View Fixture
          </button>
        </div>
      </div>
    </div>
  )
}
