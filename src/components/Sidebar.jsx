import { Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Users, Heart, CalendarDays, ClipboardCheck, Trophy, LogOut, Target, Bell, ChevronDown, ChevronRight, Menu, X, Key, Settings, CarFront, Home, MessageCircle, FileUp, ShieldCheck, Building2 } from "lucide-react"
import { useState } from "react"
import { useApp } from "../contexts/AppContext"
import NotificationBadge from "./NotificationBadge"

export default function Sidebar() {
  const location = useLocation()
  const { userRole, logout, currentPlayerId, setCurrentPlayerId, currentUserProfile, players, clubs, teams, currentClubId, setCurrentClubId, currentTeamId, setCurrentTeamId, unreadCounts } = useApp()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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

  const handleLogout = () => logout()

  // Coach navigation sections
  const platformNavSections = [
    {
      title: "Platform",
      items: [
        { path: "/clubs", label: "Club Accounts", icon: Building2 }
      ]
    }
  ]

  const coachNavSections = [
    {
      title: "Overview",
      items: [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { path: "/announcements", label: "Announcements", icon: Bell },
        ...(userRole === "club-admin" ? [{ path: "/clubs", label: "Teams", icon: Building2 }] : [])
      ]
    },
    {
      title: "Team Management",
      key: "team",
      items: [
        ...(userRole === "coach" || userRole === "club-admin" ? [{ path: "/players", label: "Players", icon: Users }] : []),
        ...(userRole === "club-admin" ? [{ path: "/coaches", label: "Coaches", icon: Settings }] : []),
        ...(userRole === "club-admin" ? [{ path: "/admin-control", label: "Admin Control", icon: ShieldCheck }] : []),
        ...(userRole === "coach" || userRole === "club-admin" ? [{ path: "/guardians", label: "Parents / Guardians", icon: ShieldCheck }] : []),
        { path: "/season-goals", label: "Team Goals", icon: Target },
        { path: "/injuries", label: "Injury / Absence", icon: Heart },
        { path: "/attendance", label: "Attendance", icon: ClipboardCheck },
        ...(userRole === "coach" || userRole === "club-admin" ? [{ path: "/attendance-admin", label: "Manage Attendance", icon: ClipboardCheck }] : [])
      ]
    },
    {
      title: "Matches",
      key: "matches",
      items: [
        { path: "/match-day", label: "Match Day Hub", icon: Trophy },
        { path: "/chat", label: "Club Chat", icon: MessageCircle },
        { path: "/calendar", label: "Calendar", icon: CalendarDays }
      ]
    },
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
      title: "Team",
      items: [
        { path: "/chat", label: "Club Chat", icon: MessageCircle },
        { path: "/game-day", label: "Game Day", icon: ClipboardCheck },
        { path: "/match-day", label: "Match Day Hub", icon: Trophy },
        { path: "/calendar", label: "Calendar", icon: CalendarDays },
        { path: "/injuries", label: "Injury / Absence", icon: Heart }
      ]
    }
  ]

  const navSections = userRole === "super-admin" ? platformNavSections : (userRole === "player" || userRole === "guardian") ? playerNavSections : coachNavSections

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
      sidebar-shell hidden md:flex
      md:sticky md:top-0
      w-72 md:w-64
      h-screen
      bg-white
      text-slate-700
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
      <div className="sidebar-brand mb-3 flex items-center gap-2.5">
        <img src="/unyra-logo.png" alt="UNYRA logo" className="w-9 h-9 rounded-lg object-contain" />
        <div className="min-w-0">
          <h2 className="font-extrabold text-xs tracking-[.14em]">UNYRA</h2>
          <p className="text-[8px] uppercase tracking-[.14em] text-cyan-300/80 mt-0.5">
            {userRole === "super-admin" ? "Platform control" : userRole === "club-admin" ? "Club operations" : userRole === "guardian" ? "Parent / guardian portal" : userRole === "player" ? "Player portal" : "Team operations"}
          </p>
        </div>
      </div>

      {userRole === "club-admin" && clubs.length > 0 && (
        <div className="mb-4 space-y-2">
          <select value={currentClubId} onChange={event => { setCurrentClubId(event.target.value); setCurrentTeamId("") }} className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-xs" disabled={userRole === "club-admin"}>
            <option className="text-gray-900" value="">All clubs</option>
            {clubs.map(club => <option className="text-gray-900" key={club.id} value={club.id}>{club.name}</option>)}
          </select>
          <select value={currentTeamId} onChange={event => setCurrentTeamId(event.target.value)} className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-xs" disabled={!currentClubId}>
            <option className="text-gray-900" value="">All teams</option>
            {teams.filter(team => team.clubId === currentClubId).map(team => <option className="text-gray-900" key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </div>
      )}
      {userRole === "guardian" && currentUserProfile?.playerIds?.length > 0 && <div className="px-2 pb-3"><label className="mb-1 block text-[9px] font-black uppercase tracking-widest text-white/50">Viewing child</label><select value={currentUserProfile.playerIds.includes(currentPlayerId) ? currentPlayerId : currentUserProfile.playerIds[0]} onChange={event => { const player=players.find(item=>item.id===event.target.value); setCurrentPlayerId(event.target.value); localStorage.setItem("team-manager-player-id",event.target.value); setCurrentTeamId(player?.teamId||"") }} className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-white">{currentUserProfile.playerIds.map(id => { const player=players.find(item=>item.id===id); return <option key={id} value={id} className="text-slate-900">{player ? `${player.firstName||""} ${player.lastName||""}`.trim()||player.username : "Linked player"}</option> })}</select></div>}

      <nav className="flex-1 space-y-0.5 pb-2 overflow-y-auto pr-1">{navSections.map((section, sectionIndex) => {
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
                    const showBadge = path === "/announcements" && unreadCounts.announcements > 0
                    return (
                      <Link
                        key={path}
                        to={path}
                        onClick={() => setMobileMenuOpen(false)}
                        data-active={isActive}
                        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-xs relative ${
                          isActive
                            ? 'text-white'
                            : 'hover:bg-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="truncate">{label}</span>
                        {showBadge && <NotificationBadge count={unreadCounts.announcements} />}
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
