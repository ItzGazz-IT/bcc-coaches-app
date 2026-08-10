import { HashRouter, NavLink, Navigate, Routes, Route, useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
import { AppProvider } from "./contexts/AppContext"
import { useApp } from "./contexts/AppContext"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Players from "./pages/Players"
import CoachesManager from "./pages/CoachesManager"
import Calendar from "./pages/Calendar"
import Attendance from "./pages/Attendance"
import AttendanceAdmin from "./pages/AttendanceAdmin"
import InjuriesAvailability from "./pages/InjuriesAvailability"
import MatchDayHub from "./pages/MatchDayHub"
import SeasonGoals from "./pages/SeasonGoals"
import Announcements from "./pages/Announcements"
import NavSettings from "./pages/NavSettings"
import GameDayHub from "./pages/GameDayHub"
import Chat from "./pages/Chat"
import ClubsManagement from "./pages/ClubsManagement"
import PlatformDirectory from "./pages/PlatformDirectory"
import ParentsGuardians from "./pages/ParentsGuardians"
import AdminControlCenter from "./pages/AdminControlCenter"
import LegalNotice from "./pages/LegalNotice"
import Sidebar from "./components/Sidebar"
import BottomNav from "./components/BottomNav"

function AppPage({ path, Page }) {
  const { authReady, userRole, currentUser, currentUserProfile, players, currentPlayerId, setCurrentPlayerId, setCurrentTeamId, setUserRole, setCurrentUserProfile, logout } = useApp()
  const navigate = useNavigate()
  const role = userRole
  const exitPlatformOverride = () => {
    const profile = JSON.parse(localStorage.getItem("unyra-platform-session") || "{}")
    localStorage.removeItem("unyra-platform-session")
    localStorage.setItem("team-manager-role", "super-admin")
    setUserRole("super-admin"); setCurrentUserProfile(profile); setCurrentTeamId("")
    navigate("/clubs")
  }

  const platformLogout = async () => { await logout(); navigate("/platform-login") }

  if (!authReady) return <div className="min-h-screen grid place-items-center text-slate-500 font-bold">Checking secure session…</div>
  if (!role) return <Navigate to={path === "clubs" || path === "directory" ? "/platform-login" : "/"} replace />
  if (role === "super-admin" && !["clubs", "directory"].includes(path)) return <Navigate to="/clubs" replace />
  if (role === "club-admin" && currentUserProfile && !currentUserProfile.onboardingComplete && path !== "clubs") return <Navigate to="/clubs" replace />
  if (path === "guardians" && !["club-admin", "coach"].includes(role)) return <Navigate to="/dashboard" replace />
  if (path === "admin-control" && role !== "club-admin") return <Navigate to="/dashboard" replace />

  if (role === "super-admin") {
    return (
      <div className="platform-shell min-h-screen">
        <header className="platform-header">
          <div className="platform-header-inner">
            <div className="flex items-center gap-3">
              <img src="/unyra-logo.png" alt="UNYRA" className="w-10 h-10 rounded-xl object-contain" />
              <div>
                <p className="text-sm font-extrabold tracking-[.14em] text-slate-950">UNYRA</p>
                <p className="text-[9px] font-bold uppercase tracking-[.2em] text-cyan-700">Platform console</p>
              </div>
            </div>
            <nav className="platform-tabs"><NavLink to="/clubs" className={({ isActive }) => isActive ? "active" : ""}>Club workspaces</NavLink><NavLink to="/directory" className={({ isActive }) => isActive ? "active" : ""}>Teams & accounts</NavLink></nav>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-800">{currentUser || "Administrator"}</p>
                <p className="text-[10px] text-slate-500">Platform administrator</p>
              </div>
              <button onClick={platformLogout} className="platform-signout" title="Sign out"><LogOut size={16} /><span className="hidden sm:inline">Sign out</span></button>
            </div>
          </div>
        </header>
        <main><Page /></main>
      </div>
    )
  }

  return (
    <div className="app-shell flex flex-row min-h-screen">
      <Sidebar />
      <main className="app-content flex-1 w-full md:w-auto overflow-x-hidden pb-20 md:pb-0">
        {role === "club-admin" && localStorage.getItem("unyra-platform-session") && <div className="flex items-center justify-between gap-3 bg-amber-300 px-4 py-2 text-xs font-black text-amber-950"><span>Platform administrator override · All changes are audited</span><button onClick={exitPlatformOverride} className="rounded-lg bg-amber-950 px-3 py-1.5 text-white">Return to platform</button></div>}
        {role === "guardian" && currentUserProfile?.playerIds?.length > 1 && <div className="border-b border-slate-200 bg-white p-3 md:hidden"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Viewing child</label><select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold" value={currentPlayerId || currentUserProfile.playerIds[0]} onChange={event => { const player=players.find(item=>item.id===event.target.value); setCurrentPlayerId(event.target.value); localStorage.setItem("team-manager-player-id",event.target.value); setCurrentTeamId(player?.teamId||"") }}>{currentUserProfile.playerIds.map(id => { const player=players.find(item=>item.id===id); return <option key={id} value={id}>{player ? `${player.firstName||""} ${player.lastName||""}`.trim()||player.username : "Linked player"}</option> })}</select></div>}
        <Page />
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/platform-login" element={<Login platformOnly />} />
          <Route path="/privacy" element={<LegalNotice type="privacy" />} />
          <Route path="/terms" element={<LegalNotice type="terms" />} />

          {[
            ["dashboard", Dashboard],
            ["players", Players],
            ["coaches", CoachesManager],
            ["guardians", ParentsGuardians],
            ["admin-control", AdminControlCenter],
            ["clubs", ClubsManagement],
            ["directory", PlatformDirectory],
            ["match-day", MatchDayHub],
            ["fixtures", MatchDayHub],
            ["season-goals", SeasonGoals],
            ["announcements", Announcements],
            ["calendar", Calendar],
            ["chat", Chat],
            ["attendance", Attendance],
            ["attendance-admin", AttendanceAdmin],
            ["injuries", InjuriesAvailability],
            ["nav-settings", NavSettings],
            ["game-day", GameDayHub]
          ].map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={<AppPage path={path} Page={Page} />}
            />
          ))}
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
