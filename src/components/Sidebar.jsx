import { Link } from "react-router-dom"
import logo from "../assets/bcc-logo.png"

export default function Sidebar() {
  return (
    <div className="w-64 min-h-screen bg-primary text-white p-6">
      <img src={logo} className="w-28 mx-auto mb-8" />

      <nav className="space-y-4 text-lg font-medium">
        <Link to="/dashboard" className="block hover:text-accent">Dashboard</Link>
        <Link to="/players" className="block hover:text-accent">Players</Link>
        <Link to="/calendar" className="block hover:text-accent">Training Calendar</Link>
        <Link to="/attendance" className="block hover:text-accent">Attendance</Link>
        <Link to="/reviews" className="block hover:text-accent">Player Reviews</Link>
        <Link to="/fixtures" className="block hover:text-accent">Fixtures</Link>
      </nav>
    </div>
  )
}
