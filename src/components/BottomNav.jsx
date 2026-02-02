import { Link, useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, Users, Trophy, BarChart3, MoreHorizontal, Heart, TrendingUp, Star, CalendarDays, Crosshair, Target, ClipboardCheck, Bell, X, Settings, LogOut } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { useState, useEffect } from "react"

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { userRole, setUserRole, setCurrentUser, setCurrentPlayerId } = useApp()
  const [showMenu, setShowMenu] = useState(false)
  const [playerNavMain, setPlayerNavMain] = useState([])
  const [playerNavMore, setPlayerNavMore] = useState([])

  const handleLogout = () => {
    localStorage.removeItem("bcc-user")
    localStorage.removeItem("bcc-role")
    localStorage.removeItem("bcc-player-id")
    setUserRole(null)
    setCurrentUser(null)
    setCurrentPlayerId(null)
    setShowMenu(false)
    navigate("/")
  }

  const coachMainNav = [
    { path: "/dashboard", label: "Home", icon: LayoutDashboard },
    { path: "/players", label: "Players", icon: Users },
    { path: "/fixtures", label: "Fixtures", icon: Trophy },
    { path: "/player-stats", label: "Stats", icon: BarChart3 }
  ]

  const coachMoreNav = [
    { path: "/match-center", label: "Match Center", icon: Crosshair },
    { path: "/fitness", label: "Fitness Tests", icon: TrendingUp },
    { path: "/reviews", label: "Reviews", icon: Star },
    { path: "/injuries", label: "Injuries", icon: Heart },
    { path: "/attendance", label: "Attendance", icon: ClipboardCheck },
    { path: "/season-goals", label: "Season Goals", icon: Target },
    { path: "/calendar", label: "Calendar", icon: CalendarDays },
    { path: "/announcements", label: "Announcements", icon: Bell }
  ]

  // Available player navigation items
  const availablePlayerItems = {
    stats: { path: "/player-stats", label: "Stats", icon: BarChart3 },
    fitness: { path: "/fitness", label: "Fitness", icon: TrendingUp },
    reviews: { path: "/reviews", label: "My Reviews", icon: Star },
    availability: { path: "/injuries", label: "Availability", icon: Heart },
    calendar: { path: "/calendar", label: "Calendar", icon: CalendarDays },
    announcements: { path: "/announcements", label: "Announcements", icon: Bell }
  }

  // Load player nav preferences from localStorage
  useEffect(() => {
    if (userRole === "player") {
      const savedMain = localStorage.getItem("playerNavMain")
      const savedMore = localStorage.getItem("playerNavMore")
      
      const mainIds = savedMain ? JSON.parse(savedMain) : ["stats", "fitness"]
      const moreIds = savedMore ? JSON.parse(savedMore) : ["reviews", "availability", "calendar", "announcements"]
      
      setPlayerNavMain(mainIds.map(id => availablePlayerItems[id]).filter(Boolean))
      setPlayerNavMore(moreIds.map(id => availablePlayerItems[id]).filter(Boolean))
    }
  }, [userRole])

  const playerMainNav = [
    { path: "/dashboard", label: "Home", icon: LayoutDashboard },
    { path: "/fixtures", label: "Fixtures", icon: Trophy },
    ...playerNavMain
  ]

  const playerMoreNav = [
    ...playerNavMore,
    { path: "/nav-settings", label: "Customize Nav", icon: Settings }
  ]

  const mainNav = userRole === "player" ? playerMainNav : coachMainNav
  const moreNav = userRole === "player" ? playerMoreNav : coachMoreNav

  return (
    <>
      {/* More Menu Modal */}
      {showMenu && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowMenu(false)}>
          <div className="bg-white rounded-t-3xl w-full max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">More Pages</h2>
              <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {moreNav.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setShowMenu(false)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                    location.pathname === path
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={24} strokeWidth={location.pathname === path ? 2.5 : 2} />
                  <span className="text-xs font-medium mt-2 text-center">{label}</span>
                </Link>
              ))}
            </div>
            
            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all font-medium"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
        <div className="grid grid-cols-5 gap-0">
          {mainNav.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center justify-center py-2.5 px-1 transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-gray-500'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </Link>
            )
          })}
          <button
            onClick={() => setShowMenu(true)}
            className="flex flex-col items-center justify-center py-2.5 px-1 text-gray-500"
          >
            <MoreHorizontal size={22} strokeWidth={2} />
            <span className="text-[10px] mt-0.5 font-medium">More</span>
          </button>
        </div>
      </div>
    </>
  )
}
