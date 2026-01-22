import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AppProvider } from "./contexts/AppContext"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Players from "./pages/Players"
import Calendar from "./pages/Calendar"
import Attendance from "./pages/Attendance"
import Reviews from "./pages/Reviews"
import Fixtures from "./pages/Fixtures"
import InjuriesAvailability from "./pages/InjuriesAvailability"
import Sidebar from "./components/Sidebar"

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          {[
            ["dashboard", Dashboard],
            ["players", Players],
            ["calendar", Calendar],
            ["attendance", Attendance],
            ["reviews", Reviews],
            ["injuries", InjuriesAvailability]
          ].map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <div className="flex">
                  <Sidebar />
                  <Page />
                </div>
              }
            />
          ))}
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
