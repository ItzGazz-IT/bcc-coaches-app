import { useMemo, useState } from "react"
import { Building2, CheckCircle2, KeyRound, Search, Shield, Trash2, Users } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../contexts/AppContext"
import { getSport } from "../config/sports"

export default function PlatformDirectory() {
  const app = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [resetId, setResetId] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState("")
  const visibleClubs = useMemo(
    () => app.clubs.filter(club => `${club.name} ${club.code || ""}`.toLowerCase().includes(query.toLowerCase())),
    [app.clubs, query]
  )

  if (app.userRole !== "super-admin") return <div className="p-10 text-center text-slate-500">Platform administrator access only.</div>

  const resetPassword = async account => {
    if (password.length < 8) return
    await app.updateCoach(account.id, { password, passwordResetAt: new Date().toISOString() })
    setMessage(`Password updated for ${account.fullName || account.username}.`)
    setResetId("")
    setPassword("")
  }

  const togglePlayerLogin = async club => {
    const enabled = !club.modules?.playerLogin
    await app.updateClub(club.id, { modules: { ...(club.modules || {}), playerLogin: enabled } })
    setMessage(`Player Login ${enabled ? "enabled" : "disabled"} for ${club.name}.`)
  }

  const confirmName = (kind, name) => window.prompt(
    `Permanently delete ${kind} “${name}” and all associated data?\n\nThis cannot be undone. Type the exact name to confirm:`
  ) === name

  const removeTeam = async team => {
    if (!confirmName("team", team.name)) return
    setDeletingId(`team:${team.id}`)
    setError("")
    try {
      await app.deleteTeam(team.id)
      setMessage(`${team.name} and all associated team data were permanently deleted.`)
    } catch (deleteError) {
      setError(deleteError.message || `Could not delete ${team.name}.`)
    } finally {
      setDeletingId("")
    }
  }

  const removeClub = async club => {
    if (!confirmName("club", club.name)) return
    setDeletingId(`club:${club.id}`)
    setError("")
    try {
      await app.deleteClub(club.id)
      setMessage(`${club.name}, its teams, accounts, and all associated data were permanently deleted.`)
    } catch (deleteError) {
      setError(deleteError.message || `Could not delete ${club.name}.`)
    } finally {
      setDeletingId("")
    }
  }

  const openClub = club => {
    localStorage.setItem("unyra-platform-session", JSON.stringify(app.currentUserProfile || {}))
    localStorage.setItem("team-manager-role", "club-admin")
    app.setUserRole("club-admin")
    app.setCurrentUserProfile({ ...app.currentUserProfile, role: "club-admin", onboardingComplete: true, platformOverride: true })
    app.setCurrentClubId(club.id)
    app.setCurrentTeamId(app.teams.find(team => team.clubId === club.id)?.id || "")
    navigate("/dashboard")
  }

  return <div className="platform-page min-h-screen p-4 md:p-8">
    <div className="max-w-6xl mx-auto space-y-7">
      <header className="page-hero platform-title-row">
        <div>
          <span className="eyebrow">Platform directory</span>
          <h1 className="text-3xl md:text-5xl font-black text-slate-950 flex items-center gap-3"><Users className="text-cyan-500" /> Teams & accounts</h1>
          <p className="text-slate-500 mt-2">Review clubs, staff and enter a club workspace with audited administrator authority.</p>
        </div>
        <div className="directory-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search clubs" /></div>
      </header>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 flex items-center gap-2"><CheckCircle2 size={17} />{message}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>}

      <div className="space-y-5">
        {visibleClubs.map(club => {
          const clubTeams = app.teams.filter(team => team.clubId === club.id)
          const staff = app.coaches.filter(account => account.clubId === club.id && account.role !== "super-admin")
          const deletingClub = deletingId === `club:${club.id}`
          return <section key={club.id} className="ops-card overflow-hidden">
            <header className="directory-club-head">
              <div className="flex items-center gap-3">
                <span className="directory-club-mark">{(club.code || club.name).slice(0, 3).toUpperCase()}</span>
                <div><h2>{club.name}</h2><p>{club.region || "No region"} · {clubTeams.length} teams · {staff.length} staff</p></div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => togglePlayerLogin(club)} className={`module-toggle ${club.modules?.playerLogin ? "enabled" : ""}`} disabled={Boolean(deletingId)}><span /><div><strong>Player Login</strong><small>{club.modules?.playerLogin ? "Enabled" : "Disabled"}</small></div></button>
                <button className="reset-trigger" onClick={() => openClub(club)} disabled={Boolean(deletingId)}>Open as admin</button>
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50" onClick={() => removeClub(club)} disabled={Boolean(deletingId)}><Trash2 size={14} />{deletingClub ? "Deleting…" : "Delete club"}</button>
              </div>
            </header>
            <div className="directory-grid">
              <div className="directory-column">
                <h3><Building2 size={15} /> Teams</h3>
                {clubTeams.map(team => <div key={team.id} className="directory-row">
                  <div><strong>{team.name}</strong><span>{getSport(team.sportId).name} · {team.ageGroup || "Open"}</span></div>
                  <button className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50" title={`Delete ${team.name}`} onClick={() => removeTeam(team)} disabled={Boolean(deletingId)}><Trash2 size={16} /></button>
                </div>)}
                {!clubTeams.length && <p className="text-xs text-slate-400">No teams configured.</p>}
              </div>
              <div className="directory-column">
                <h3><Shield size={15} /> Administrators & coaches</h3>
                {staff.map(account => <div key={account.id} className="account-row">
                  <div className="account-copy"><strong>{account.fullName || account.username}</strong><span>{account.role}</span><code>{account.username}</code></div>
                  {resetId === account.id
                    ? <div className="reset-inline"><input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="New password" /><button onClick={() => resetPassword(account)}>Save</button></div>
                    : <button className="reset-trigger" onClick={() => setResetId(account.id)}><KeyRound size={14} /> Reset</button>}
                </div>)}
              </div>
            </div>
          </section>
        })}
      </div>
    </div>
  </div>
}
