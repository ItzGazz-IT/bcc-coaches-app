import logo from "../assets/bcc-logo.png"
import { useNavigate } from "react-router-dom"
import { Lock, Mail, Shield, ArrowRight, Sparkles } from "lucide-react"

export default function Login() {
  const navigate = useNavigate()

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#0B2558] via-[#0D2E6B] to-[#0D4C92] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-slow -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse-slow translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl animate-float"></div>
      
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        {/* Main login card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          {/* Header section */}
          <div className="bg-gradient-to-br from-primary via-secondary to-[#0D4C92] p-8 text-center relative overflow-hidden">
            <div className="relative bg-white/20 backdrop-blur-lg rounded-2xl p-4 inline-block mb-4 animate-float shadow-glow">
              <img src={logo} alt="BCC Logo" className="w-20 h-20 mx-auto" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
              BCC Team Portal
            </h1>
            <div className="flex items-center justify-center gap-2 text-white/90">
              <Sparkles size={14} className="animate-pulse" />
              <p className="text-sm font-medium">
                Seniors & Reserves Management
              </p>
              <Sparkles size={14} className="animate-pulse" />
            </div>
          </div>

          {/* Form section */}
          <div className="p-8">
            {/* Demo credentials notice */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-blue-500 p-1.5 rounded-lg">
                  <Shield className="text-white" size={16} />
                </div>
                <p className="text-sm font-bold text-primary">Demo Access</p>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Click "Access Dashboard" to explore the portal
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); navigate("/dashboard"); }} className="space-y-5">
              {/* Email input */}
              <div className="relative group">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary transition-colors" size={18} />
                  <input
                    type="email"
                    placeholder="admin@bcc.com"
                    defaultValue="admin@bcc.com"
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all text-sm font-medium bg-gray-50 focus:bg-white"
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
                    placeholder="••••••••"
                    defaultValue="password"
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all text-sm font-medium bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Login button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-secondary via-[#0D4C92] to-accent text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 mt-8 flex items-center justify-center gap-2 group"
              >
                <span>Access Dashboard</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Footer text */}
            <p className="text-center text-xs text-gray-500 mt-6 font-medium">
              🔒 Secure team management platform
            </p>
          </div>
        </div>

        {/* Bottom info */}
        <p className="text-center text-white/60 text-sm mt-6 font-medium">
          © 2026 BCC Cricket Club. All rights reserved.
        </p>
      </div>
    </div>
  )
}
