import logo from "../assets/bcc-logo.png"
import { useNavigate } from "react-router-dom"
import { Lock, User, Shield, ArrowRight, AlertCircle, Users as UsersIcon } from "lucide-react"
import { useState } from "react"
import { useApp } from "../contexts/AppContext"

const COACHES = [
  { username: "Goisto", password: "Goisto@BCC26" },
  { username: "Gareth", password: "Gareth@BCC26" }
]

export default function Login() {
  const navigate = useNavigate()
  const { setUserRole, setCurrentUser, setCurrentPlayerId, players } = useApp()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState("coach")
  const [error, setError] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    setError("")

    if (selectedRole === "coach") {
      // Check coach credentials
      const coach = COACHES.find(c => c.username === username && c.password === password)
      
      if (coach) {
        localStorage.setItem("bcc-user", username)
        localStorage.setItem("bcc-role", "coach")
        setUserRole("coach")
        setCurrentUser(username)
        setCurrentPlayerId(null)
        navigate("/dashboard")
      } else {
        setError("Invalid coach username or password")
      }
    } else {
      // Check player credentials
      const player = players.find(p => p.username === username && p.password === password)
      
      if (player) {
        localStorage.setItem("bcc-user", username)
        localStorage.setItem("bcc-role", "player")
        localStorage.setItem("bcc-player-id", player.id)
        setUserRole("player")
        setCurrentUser(username)
        setCurrentPlayerId(player.id)
        navigate("/dashboard")
      } else {
        setError("Invalid player username or password. Contact your coach if you don't have login credentials.")
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B2558] via-[#0D2E6B] to-[#0D4C92] p-4 sm:p-6 relative overflow-hidden flex items-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#0D4C92]/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#0B2558]/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[size:40px_40px] opacity-20"></div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:60px_60px] opacity-30"></div>

      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 inline-block mb-3 sm:mb-4 shadow-2xl border border-white/20 animate-float">
            <img src={logo} alt="BCC Logo" className="w-16 h-16 sm:w-24 sm:h-24 mx-auto" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white mb-1 sm:mb-2 drop-shadow-lg px-4">
            BCC Team Portal
          </h1>
          <p className="text-sm sm:text-base text-white/80 font-medium px-4">
            Seniors & Reserves Management
          </p>
        </div>

        {/* Main login card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          <div className="bg-gradient-to-r from-primary to-secondary p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-lg rounded-lg sm:rounded-xl p-2 sm:p-2.5">
                <Shield className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Sign In</h2>
                <p className="text-white/80 text-xs sm:text-sm">Access your account</p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex items-start gap-2 sm:gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-xs sm:text-sm font-semibold text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Role Selection */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">
                  I am a
                </label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("coach")}
                    className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all ${
                      selectedRole === "coach"
                        ? 'border-secondary bg-secondary/10 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Shield className={`mx-auto mb-1.5 sm:mb-2 ${selectedRole === "coach" ? 'text-secondary' : 'text-gray-400'}`} size={20} />
                    <div className={`text-xs sm:text-sm font-bold ${selectedRole === "coach" ? 'text-secondary' : 'text-gray-600'}`}>Coach</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("player")}
                    className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all ${
                      selectedRole === "player"
                        ? 'border-secondary bg-secondary/10 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <UsersIcon className={`mx-auto mb-1.5 sm:mb-2 ${selectedRole === "player" ? 'text-secondary' : 'text-gray-400'}`} size={20} />
                    <div className={`text-xs sm:text-sm font-bold ${selectedRole === "player" ? 'text-secondary' : 'text-gray-600'}`}>Player</div>
                  </button>
                </div>
              </div>

              {/* Username input */}
              <div className="relative group">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary transition-colors" size={16} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-3.5 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all text-sm font-medium bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="relative group">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary transition-colors" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-3.5 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all text-sm font-medium bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Login button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-secondary to-accent text-white py-3.5 sm:py-4 rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 mt-6 sm:mt-8 inline-flex items-center justify-center gap-2 group text-sm sm:text-base"
              >
                <span>Sign In</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/70 text-xs sm:text-sm mt-4 sm:mt-6 font-medium drop-shadow-lg px-4">
          © 2026 BCC Football Seniors. Designed By Gareth Van Den Aardweg
        </p>
      </div>
    </div>
  )
}
