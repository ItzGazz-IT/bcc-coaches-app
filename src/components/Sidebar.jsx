import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Users, Heart, CalendarDays, ClipboardCheck, Star, Trophy, LogOut } from "lucide-react"
import logo from "../assets/bcc-logo.png"

export default function Sidebar() {
  const location = useLocation()
  
  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/players", label: "Players", icon: Users },
    { path: "/injuries", label: "Injuries", icon: Heart },
    { path: "/calendar", label: "Calendar", icon: CalendarDays },
    { path: "/attendance", label: "Attendance", icon: ClipboardCheck },
    { path: "/reviews", label: "Reviews", icon: Star },
  ]

  return (
    <div className="w-72 min-h-screen bg-gradient-to-b from-primary via-[#0A1E4D] to-[#071533] text-white p-6 shadow-2xl">
      <div className="mb-10">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
          <img src={logo} className="w-24 mx-auto" />
          <h2 className="text-center mt-3 font-bold text-lg">BCC Coaches</h2>
          <p className="text-center text-xs text-white/60 mt-1">Team Management</p>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent text-white shadow-lg shadow-accent/50 scale-105'
                  : 'hover:bg-white/10 hover:translate-x-1 text-white/70 hover:text-white'
              }`}
            >
              <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 text-white/70 hover:text-red-400 transition-all duration-200"
        >
          <LogOut size={18} />
          <span className="font-medium">Logout</span>
        </Link>
      </div>
    </div>
  )
}
