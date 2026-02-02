import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Users, Trophy, BarChart3, Bell, Heart, TrendingUp, Star, CalendarDays, Crosshair, Target, ClipboardCheck } from "lucide-react"
import { useApp } from "../contexts/AppContext"

export default function BottomNav() {
  const location = useLocation()
  const { userRole } = useApp()

  const coachNavItems = [
    { path: "/dashboard", label: "Home", icon: LayoutDashboard },
    { path: "/players", label: "Players", icon: Users },
    { path: "/fixtures", label: "Fixtures", icon: Trophy },
    { path: "/match-center", label: "Matches", icon: Crosshair },
    { path: "/fitness", label: "Fitness", icon: TrendingUp },
    { path: "/player-stats", label: "Stats", icon: BarChart3 },
    { path: "/reviews", label: "Reviews", icon: Star },
    { path: "/injuries", label: "Injuries", icon: Heart },
    { path: "/attendance", label: "Attend", icon: ClipboardCheck },
    { path: "/season-goals", label: "Goals", icon: Target },
    { path: "/calendar", label: "Calendar", icon: CalendarDays },
    { path: "/announcements", label: "News", icon: Bell }
  ]

  const playerNavItems = [
    { path: "/dashboard", label: "Home", icon: LayoutDashboard },
    { path: "/fixtures", label: "Fixtures", icon: Trophy },
    { path: "/player-stats", label: "My Stats", icon: BarChart3 },
    { path: "/fitness", label: "Fitness", icon: TrendingUp },
    { path: "/announcements", label: "News", icon: Bell }
  ]

  const navItems = userRole === "player" ? playerNavItems : coachNavItems

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe overflow-x-auto">
      <div className={`grid gap-0 ${userRole === "player" ? "grid-cols-5" : "grid-cols-12"} min-w-max`}>
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center py-2 px-3 transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={20} className={isActive ? 'mb-0.5' : 'mb-0.5'} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
