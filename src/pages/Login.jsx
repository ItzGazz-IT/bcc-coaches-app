import { useNavigate } from "react-router-dom"
import { Lock, User, Shield, ArrowRight, AlertCircle, CheckCircle2, Users as UsersIcon, Crown } from "lucide-react"
import { useState, useEffect } from "react"
import { useApp } from "../contexts/AppContext"
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../firebase/config"

export default function Login({ platformOnly = false }) {
  const navigate = useNavigate()
  const { authReady, userRole, currentUserProfile } = useApp()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState(platformOnly ? "platform-admin" : "coach")
  const [error, setError] = useState("")
  const [resetMessage, setResetMessage] = useState("")
  const [resettingPassword, setResettingPassword] = useState(false)

  // React Router can reuse this component when moving between the club and
  // platform login routes. Keep the selected login mode in sync with the route
  // instead of retaining the previous route's role.
  useEffect(() => {
    setSelectedRole(platformOnly ? "platform-admin" : "coach")
    setError("")
    setResetMessage("")
  }, [platformOnly])

  useEffect(() => {
    if (!authReady || !userRole) return
    navigate(userRole === "super-admin" || userRole === "club-admin" && !currentUserProfile?.onboardingComplete ? "/clubs" : "/dashboard", { replace: true })
  }, [authReady, userRole, currentUserProfile, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    try {
      const credential = await signInWithEmailAndPassword(auth, username.trim(), password)
      const token = await credential.user.getIdTokenResult(true)
      const role = token.claims.role
      const expectedRole = selectedRole === "platform-admin" ? "super-admin" : selectedRole
      const staffRoles = ["coach", "club-admin"]
      const roleMatches = expectedRole === "coach" ? staffRoles.includes(role) : role === expectedRole
      if (!roleMatches) {
        await auth.signOut()
        setError("This account does not have access to the selected portal.")
        return
      }
    } catch (loginError) {
      console.error("Authentication failed:", loginError.code)
      setError("Invalid email or password.")
    }
  }

  const handleForgotPassword = async () => {
    const email = username.trim()
    setError("")
    setResetMessage("")
    if (!email) {
      setError("Enter your email address first, then select Forgot password.")
      return
    }

    setResettingPassword(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setResetMessage("If an account exists for this email, a password-reset link has been sent. Check your inbox and spam folder.")
    } catch (resetError) {
      console.error("Password reset failed:", resetError.code)
      if (resetError.code === "auth/invalid-email") {
        setError("Enter a valid email address.")
      } else if (resetError.code === "auth/user-not-found") {
        setResetMessage("If an account exists for this email, a password-reset link has been sent. Check your inbox and spam folder.")
      } else {
        setError("We could not send the reset email. Check your connection and try again.")
      }
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <div className="login-screen dashboard-login min-h-screen p-4 sm:p-6 relative overflow-hidden flex items-center">
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

      <div className="login-layout max-w-5xl w-full mx-auto relative z-10 grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-center">
        {/* Logo and Header */}
        <div className="login-brand text-center lg:text-left mb-6 sm:mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 inline-block mb-3 sm:mb-4 shadow-2xl border border-white/20 animate-float">
            <img src="/unyra-logo.png" alt="UNYRA logo" className="w-20 h-20 sm:w-28 sm:h-28 mx-auto lg:mx-0 rounded-2xl object-contain" />
          </div>
          <p className="hidden lg:block text-cyan-300 text-xs font-black tracking-[.28em] uppercase mb-5">The operating system for modern clubs</p>
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-3 tracking-[-.05em] leading-[.95] px-4 lg:px-0">
            UNYRA
          </h1>
          <p className="text-sm sm:text-lg text-white/70 font-medium px-4 lg:px-0 max-w-lg">
            {platformOnly ? "Platform Administration" : "Clubs, Coaches & Players Portal"}
          </p>
        </div>

        {/* Main login card */}
        <div className="login-card bg-white rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-secondary p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-lg rounded-lg sm:rounded-xl p-2 sm:p-2.5">
                <Shield className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {platformOnly ? "Platform Admin Sign In" : "Club Sign In"}
                </h2>
                <p className="text-white/80 text-xs sm:text-sm">
                  Access your account
                </p>
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

            {resetMessage && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 flex items-start gap-2 sm:gap-3" role="status">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-xs sm:text-sm font-semibold text-emerald-800">{resetMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Role Selection */}
              {!platformOnly && <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2 sm:mb-3">
                  I am a
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
                    <div className={`text-[10px] sm:text-xs font-bold ${selectedRole === "coach" ? 'text-secondary' : 'text-gray-600'}`}>Club Staff</div>
                  </button>
                  <button type="button" onClick={() => setSelectedRole("guardian")} className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all ${selectedRole === "guardian" ? 'border-secondary bg-secondary/10 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}><Shield className={`mx-auto mb-1.5 sm:mb-2 ${selectedRole === "guardian" ? 'text-secondary' : 'text-gray-400'}`} size={20}/><div className={`text-[10px] sm:text-xs font-bold ${selectedRole === "guardian" ? 'text-secondary' : 'text-gray-600'}`}>Parent</div></button>
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
                    <div className={`text-[10px] sm:text-xs font-bold ${selectedRole === "player" ? 'text-secondary' : 'text-gray-600'}`}>Player</div>
                  </button>
                </div>
              </div>}

              {/* Username input */}
              <div className="relative group">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">
                  Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary transition-colors" size={16} />
                  <input
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
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
                    autoComplete="current-password"
                    className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-3.5 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-secondary focus:ring-4 focus:ring-secondary/20 outline-none transition-all text-sm font-medium bg-gray-50 focus:bg-white"
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resettingPassword}
                    className="text-xs font-bold text-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resettingPassword ? "Sending reset link…" : "Forgot password?"}
                  </button>
                </div>
              </div>

              {/* Login button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-secondary to-accent text-white py-3.5 sm:py-4 rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 mt-6 sm:mt-8 inline-flex items-center justify-center gap-2 group text-sm sm:text-base"
              >
                <span>{authReady ? "Sign In" : "Checking session…"}</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
            {!platformOnly ? (
              <button onClick={() => navigate('/platform-login')} className="w-full mt-5 text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center justify-center gap-1"><Crown size={14} /> Platform administrator sign in</button>
            ) : (
              <button onClick={() => navigate('/')} className="w-full mt-5 text-xs font-semibold text-gray-600 hover:text-gray-900">Return to club sign in</button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/70 text-xs sm:text-sm mt-4 sm:mt-6 font-medium drop-shadow-lg px-4">
          © 2026 UNYRA
        </p>
      </div>
    </div>
  )
}
