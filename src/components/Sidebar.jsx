import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Users, Heart, CalendarDays, ClipboardCheck, Star, Trophy, LogOut, TrendingUp, Crosshair, BarChart3, Target, Bell, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import logo from "../assets/bcc-logo.png"

export default function Sidebar() {
  const location = useLocation()
  const [expandedSections, setExpandedSections] = useState({
    team: true,
    matches: true,
    performance: true
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const navSections = [
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
        { path: "/reviews", label: "Reviews", icon: Star }
      ]
    },
    {
      title: "Season",
      items: [
        { path: "/season-goals", label: "Season Goals", icon: Target }
      ]
    }
  ]

  return (
    <div className="w-full md:w-72 min-h-screen bg-gradient-to-b from-primary via-[#0A1E4D] to-[#071533] text-white p-4 shadow-2xl relative flex flex-col">
      <div className="mb-5">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
          <img src={logo} className="w-20 mx-auto" />
          <h2 className="text-center mt-2 font-bold text-base">BCC Coaches Portal</h2>
          <p className="text-center text-xs text-white/60 mt-0.5">Team Management</p>
        </div>
      </div>

      <nav className="flex-grow overflow-y-auto space-y-1">
        {navSections.map((section, sectionIndex) => {
          const isCollapsible = section.key
          const isExpanded = isCollapsible ? expandedSections[section.key] : true
          
          return (
            <div key={sectionIndex}>
              {/* Section Header */}
              {isCollapsible ? (
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between px-3 py-2 text-white/40 hover:text-white/60 transition-colors text-xs font-bold uppercase tracking-wider"
                >
                  <span>{section.title}</span>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <div className="px-3 py-2 text-white/40 text-xs font-bold uppercase tracking-wider">
                  {section.title}
                </div>
              )}

              {/* Section Items */}
              {isExpanded && (
                <div className="space-y-1 mb-3">
                  {section.items.map(({ path, label, icon: Icon }) => {
                    const isActive = location.pathname === path
                    return (
                      <Link
                        key={path}
                        to={path}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm ${
                          isActive
                            ? 'bg-accent text-white shadow-lg shadow-accent/50'
                            : 'hover:bg-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        <Icon size={18} className={isActive ? 'animate-pulse' : ''} />
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

      <div className="mt-4 pt-4 border-t border-white/10">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 text-white/70 hover:text-red-400 transition-all duration-200 text-sm"
        >
          <LogOut size={18} />
          <span className="font-medium">Logout</span>
        </Link>
      </div>
    </div>
  )
}
