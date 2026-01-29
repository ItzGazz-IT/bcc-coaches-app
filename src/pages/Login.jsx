import logo from "../assets/bcc-logo.png"
import { useNavigate } from "react-router-dom"
import { Lock, User, Shield, ArrowRight, AlertCircle } from "lucide-react"
import { useState } from "react"

const USERS = [
  { username: "Goisto", password: "Goisto@BCC26" },
  { username: "Gareth", password: "Gareth@BCC26" }
]

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    setError("")

    const user = USERS.find(u => u.username === username && u.password === password)
    
    if (user) {
      localStorage.setItem("bcc-user", username)
      navigate("/dashboard")
    } else {
      setError("Invalid username or password")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B2558] via-[#0D2E6B] to-[#0D4C92] p-6 relative overflow-hidden">
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

      <div className="max-w-md mx-auto pt-20 relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 inline-block mb-4 shadow-2xl border border-white/20 animate-float">
            <img src={logo} alt="BCC Logo" className="w-24 h-24 mx-auto" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 drop-shadow-lg">
            BCC Team Portal
          </h1>
          <p className="text-white/80 font-medium">
            Seniors & Reserves Management
          </p>
        </div>

        {/* Main login card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          <div className="bg-gradient-to-r from-primary to-secondary p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-lg rounded-xl p-2.5">
                <Shield className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Sign In</h2>
                <p className="text-white/80 text-sm">Access your account</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="text-red-500" size={20} />
                <p className="text-sm font-semibold text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username input */}
              <div className="relative group">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary transition-colors" size={18} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all text-sm font-medium bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="relative group">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary transition-colors" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all text-sm font-medium bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Login button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-secondary to-accent text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 mt-8 inline-flex items-center justify-center gap-2 group"
              >
                <span>Sign In</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Authorized users info */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs font-bold text-gray-600 mb-2">Authorized Users:</p>
              <p className="text-xs text-gray-500">Goisto • Gareth</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/70 text-sm mt-6 font-medium drop-shadow-lg">
          © 2026 BCC Football Seniors. Designed By Gareth Van Den Aardweg
        </p>
      </div>
    </div>
  )
}
