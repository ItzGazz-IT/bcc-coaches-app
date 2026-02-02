import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Users, Trophy, BarChart3, Bell } from "lucide-react"
import { useApp } from "../contexts/AppContext"

export default function BottomNav() {
  const location = useLocation()
  const { userRole } = useApp()

  const coachNavItems = [
    { path: "/dashboard", label: "Home", icon: LayoutDashboard },
    { path: "/players", label: "Players", icon: Users },
    { path: "/fixtures", label: "Fixtures", icon: Trophy },
    { path: "/player-stats", label: "Stats", icon: BarChart3 },
    { path: "/announcements", label: "News", icon: Bell }
  ]

  const playerNavItems = [
    { path: "/dashboard", label: "Home", icon: LayoutDashboard },
    { path: "/fixtures", label: "Fixtures", icon: Trophy },
    { path: "/player-stats", label: "My Stats", icon: BarChart3 },
    { path: "/fitness", label: "Fitness", icon: Users },
    { path: "/announcements", label: "News", icon: Bell }
  ]

  const navItems = userRole === "player" ? playerNavItems : coachNavItems

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="grid grid-cols-5 gap-0">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={22} className={isActive ? 'mb-0.5' : 'mb-0.5'} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
