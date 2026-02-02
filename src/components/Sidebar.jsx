import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Users, Heart, CalendarDays, ClipboardCheck, Star, Trophy, LogOut, TrendingUp, Crosshair, BarChart3, Target, Bell, ChevronDown, ChevronRight, Menu, X, Moon, Sun, LineChart } from "lucide-react"
import { useState, useEffect } from "react"
import { useApp } from "../contexts/AppContext"
import logo from "../assets/bcc-logo.png"

export default function Sidebar() {
  const location = useLocation()
  const { userRole, setUserRole, setCurrentUser, setCurrentPlayerId, darkMode, toggleDarkMode } = useApp()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    team: true,
    matches: true,
    performance: true
  })

  useEffect(() => {
    const role = localStorage.getItem("bcc-role")
    const playerId = localStorage.getItem("bcc-player-id")
    if (role) setUserRole(role)
    if (playerId) setCurrentPlayerId(playerId)
  }, [])

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleLogout = () => {
    localStorage.removeItem("bcc-user")
    localStorage.removeItem("bcc-role")
    localStorage.removeItem("bcc-player-id")
    setUserRole(null)
    setCurrentUser(null)
    setCurrentPlayerId(null)
  }

  // Coach navigation sections
  const coachNavSections = [
    {
      title: "Overview",
      items: [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { path: "/announcements", label: "Announcements", icon: Bell }
      ]
    },
    {
      title: "Team Management",
      key: "team",
      items: [
        { path: "/players", label: "Players", icon: Users },
        { path: "/injuries", label: "Injuries", icon: Heart },
        { path: "/attendance", label: "Attendance", icon: ClipboardCheck }
      ]
    },
    {
      title: "Matches & Fixtures",
      key: "matches",
      items: [
        { path: "/match-center", label: "Match Center", icon: Crosshair },
        { path: "/fixtures", label: "Fixtures", icon: Trophy },
        { path: "/calendar", label: "Calendar", icon: CalendarDays }
      ]
    },
    {
      title: "Performance",
      key: "performance",
      items: [
        { path: "/player-stats", label: "Player Stats", icon: BarChart3 },
        { path: "/fitness", label: "Fitness Tests", icon: TrendingUp },
        { path: "/reviews", label: "Reviews", icon: Star },
        { path: "/performance-charts", label: "Analytics", icon: LineChart }
      ]
    },
    {
      title: "Season",
      items: [
        { path: "/season-goals", label: "Season Goals", icon: Target }
      ]
    }
  ]

  // Player navigation sections
  const playerNavSections = [
    {
      title: "Overview",
      items: [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { path: "/announcements", label: "Announcements", icon: Bell }
      ]
    },
    {
      title: "My Performance",
      items: [
        { path: "/player-stats", label: "My Stats", icon: BarChart3 },
        { path: "/fitness", label: "Fitness Tests", icon: Tre,
        { path: "/performance-charts", label: "My Progress", icon: LineChart }ndingUp },
        { path: "/reviews", label: "My Reviews", icon: Star }
      ]
    },
    {
      title: "Team",
      items: [
        { path: "/fixtures", label: "Fixtures", icon: Trophy },
        { path: "/calendar", label: "Calendar", icon: CalendarDays },
        { path: "/injuries", label: "Availability", icon: Heart }
      ]
    }
  ]

  const navSections = userRole === "player" ? playerNavSections : coachNavSections

  return (
    <>
    {/* Mobile Menu Button - Hidden completely */}
    {!mobileMenuOpen && (
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="hidden fixed top-4 left-4 z-50 bg-primary text-white p-3 rounded-xl shadow-lg hover:scale-105 transition-transform"
      >
        <Menu size={24} />
      </button>
    )}

    {/* Overlay for mobile - Hidden */}
    {mobileMenuOpen && (
      <div
        onClick={() => setMobileMenuOpen(false)}
        className="hidden fixed inset-0 bg-black/50 z-30"
      />
    )}

    <div className={`
      hidden md:flex
      md:relative
      w-80 md:w-72
      min-h-screen
      bg-primary
      text-white
      p-4
      shadow-2xl
      flex flex-col
      z-40
      transition-transform duration-300
      ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      {/* Close button for mobile */}
      {mobileMenuOpen && (
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={24} />
        </button>
      )}
      <div className="mb-4">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/20">
          <img src={logo} className="w-16 mx-auto" />
          <h2 className="text-center mt-1.5 font-bold text-sm">
            {userRole === "player" ? "BCC Player Portal" : "BCC Coaches Portal"}
          </h2>
          <p className="text-center text-[10px] text-white/60 mt-0.5">
            {userRole === "player" ? "Player Dashboard" : "Team Management"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 pb-2">{navSections.map((section, sectionIndex) => {
          const isCollapsible = section.key
          const isExpanded = isCollapsible ? expandedSections[section.key] : true
          
          return (
            <div key={sectionIndex}>
              {/* Section Header */}
              {isCollapsible ? (
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-white/40 hover:text-white/60 transition-colors text-[10px] font-bold uppercase tracking-wider"
                >
                  <span>{section.title}</span>
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              ) : (
                <div className="px-2.5 py-1.5 text-white/40 text-[10px] font-bold uppercase tracking-wider">
                  {section.title}
                </div>
              )}

              {/* Section Items */}
              {isExpanded && (
                <div className="space-y-0.5 mb-2">
                  {section.items.map(({ path, label, icon: Icon }) => {
                    const isActive = location.pathname === path
                    return (
                      <Link
                        key={path}
                        to={path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-xs ${
                          isActive
                            ? 'bg-accent text-white shadow-lg shadow-accent/50'
                            : 'hover:bg-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        <Icon size={16} className={isActive ? 'animate-pulse' : ''} />
                        <span className="truncate">{label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="mt-auto pt-2 border-t border-white/10 flex-shrink-0 space-y-1">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all duration-200 text-xs"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          <span className="font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <Link
          to="/"
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 text-white/70 hover:text-red-400 transition-all duration-200 text-xs"
        >
          <LogOut size={16} />
          <span className="font-medium">Logout</span>
        </Link>
      </div>
    </div>
    </>
  )
}
