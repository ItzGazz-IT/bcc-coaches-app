import { HashRouter, Routes, Route } from "react-router-dom"
import { AppProvider } from "./contexts/AppContext"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Players from "./pages/Players"
import CoachesManager from "./pages/CoachesManager"
import CredentialsManager from "./pages/CredentialsManager"
import Calendar from "./pages/Calendar"
import Attendance from "./pages/Attendance"
import AttendanceAdmin from "./pages/AttendanceAdmin"
import InjuriesAvailability from "./pages/InjuriesAvailability"
import Fixtures from "./pages/Fixtures"
import PlayerStats from "./pages/PlayerStats"
import SeasonGoals from "./pages/SeasonGoals"
import Announcements from "./pages/Announcements"
import NavSettings from "./pages/NavSettings"
import AwayDayHub from "./pages/AwayDayHub"
import Chat from "./pages/Chat"
import Sidebar from "./components/Sidebar"
import BottomNav from "./components/BottomNav"

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          {[
            ["dashboard", Dashboard],
            ["players", Players],
            ["coaches", CoachesManager],
            ["credentials", CredentialsManager],
            ["fixtures", Fixtures],
            ["player-stats", PlayerStats],
            ["season-goals", SeasonGoals],
            ["announcements", Announcements],
            ["calendar", Calendar],
            ["chat", Chat],
            ["attendance", Attendance],
            ["attendance-admin", AttendanceAdmin],
            ["injuries", InjuriesAvailability],
            ["nav-settings", NavSettings],
            ["away-day", AwayDayHub]
          ].map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <div className="flex flex-row min-h-screen bg-gray-50 dark:bg-gray-950">
                  <Sidebar />
                  <div className="flex-1 w-full md:w-auto overflow-x-hidden pb-16 md:pb-0">
                    <Page />
                  </div>
                  <BottomNav />
                </div>
              }
            />
          ))}
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
