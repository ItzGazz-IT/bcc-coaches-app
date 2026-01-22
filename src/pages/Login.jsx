import logo from "../assets/bcc-logo.png"
import { useNavigate } from "react-router-dom"
import { Lock, Mail, Shield } from "lucide-react"

export default function Login() {
  const navigate = useNavigate()

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-primary via-[#0D2563] to-secondary relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Main login card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">
          {/* Header section with gradient */}
          <div className="bg-gradient-to-r from-primary to-secondary p-6 text-center">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 inline-block mb-3">
              <img src={logo} alt="BCC Logo" className="w-20 h-20 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              BCC Team Portal
            </h1>
            <p className="text-white/80 text-xs">
              Seniors & Reserves Management System
            </p>
          </div>

          {/* Form section */}
          <div className="p-6">
            {/* Demo credentials notice */}
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="text-secondary" size={16} />
                <p className="text-xs font-semibold text-primary">Demo Access</p>
              </div>
              <p className="text-xs text-gray-600">
                Click "Login" to access the dashboard
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); navigate("/dashboard"); }} className="space-y-4">
              {/* Email input */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    placeholder="admin@bcc.com"
                    defaultValue="admin@bcc.com"
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Password input */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    defaultValue="password"
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Login button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-secondary to-accent text-white py-3 rounded-xl font-bold shadow-lg shadow-secondary/30 hover:shadow-xl hover:shadow-secondary/40 hover:scale-[1.02] transition-all duration-200 mt-6"
              >
                Access Dashboard
              </button>
            </form>

            {/* Footer text */}
            <p className="text-center text-xs text-gray-500 mt-4">
              Secure team management platform
            </p>
          </div>
        </div>

        {/* Bottom info */}
        <p className="text-center text-white/60 text-xs mt-4">
          © 2026 BCC Cricket Club. All rights reserved.
        </p>
      </div>
    </div>
  )
}
