import { HashRouter, Routes, Route } from "react-router-dom"
import { AppProvider } from "./contexts/AppContext"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Players from "./pages/Players"
import Calendar from "./pages/Calendar"
import Attendance from "./pages/Attendance"
import Reviews from "./pages/Reviews"
import InjuriesAvailability from "./pages/InjuriesAvailability"
import FitnessTests from "./pages/FitnessTests"
import MatchCenter from "./pages/MatchCenter"
import Fixtures from "./pages/Fixtures"
import PlayerStats from "./pages/PlayerStats"
import SeasonGoals from "./pages/SeasonGoals"
import Announcements from "./pages/Announcements"
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
            ["fitness", FitnessTests],
            ["fixtures", Fixtures],
            ["match-center", MatchCenter],
            ["player-stats", PlayerStats],
            ["season-goals", SeasonGoals],
            ["announcements", Announcements],
            ["calendar", Calendar],
            ["attendance", Attendance],
            ["reviews", Reviews],
            ["injuries", InjuriesAvailability]
          ].map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <div className="flex flex-row min-h-screen bg-gray-50">
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
