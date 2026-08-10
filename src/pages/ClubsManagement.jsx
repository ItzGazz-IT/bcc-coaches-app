import { useEffect, useState } from "react"
import { ArrowRight, Building2, Check, CheckCircle2, Copy, Flag, Plus, Shield, Trash2, Users, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useApp } from "../contexts/AppContext"
import { getSport, SPORTS } from "../config/sports"

const field = "w-full px-4 py-3.5 border border-slate-200 rounded-xl bg-white text-slate-900 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition"

export default function ClubsManagement() {
  const app = useApp()
  if (app.userRole !== "super-admin" && app.userRole !== "club-admin") return <div className="p-10 text-center text-slate-500">Administrator access only.</div>
  return app.userRole === "super-admin" ? <PlatformClubs app={app} /> : <ClubOnboarding app={app} />
}

function PlatformClubs({ app }) {
  const { clubs, teams, coaches, addClub, deleteClub, addCoach } = app
  const [form, setForm] = useState({ name: "", code: "", contactPerson: "", email: "", phone: "", region: "", activeSeason: String(new Date().getFullYear()), adminName: "", username: "", password: "", enabledSports: SPORTS.map(s => s.id) })
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState(null)
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const toggleSport = id => set("enabledSports", form.enabledSports.includes(id) ? form.enabledSports.filter(item => item !== id) : [...form.enabledSports, id])

  const createWorkspace = async event => {
    event.preventDefault()
    if (!form.enabledSports.length) return
    setCreating(true)
    try {
      const clubRef = await addClub({ name: form.name.trim(), code: form.code.trim().toUpperCase(), contactPerson: form.contactPerson.trim(), email: form.email.trim(), phone: form.phone.trim(), region: form.region.trim(), activeSeason: form.activeSeason.trim(), enabledSports: form.enabledSports, status: "onboarding", onboardingComplete: false, modules: { playerLogin: false } })
      await addCoach({ clubId: clubRef.id, teamId: "", teamIds: [], fullName: form.adminName.trim(), username: form.username.trim(), password: form.password, role: "club-admin", onboardingComplete: false })
      setResult({ club: form.name.trim(), username: form.username.trim(), password: form.password })
      setForm({ name: "", code: "", contactPerson: "", email: "", phone: "", region: "", activeSeason: String(new Date().getFullYear()), adminName: "", username: "", password: "", enabledSports: SPORTS.map(s => s.id) })
    } finally { setCreating(false) }
  }

  return <div className="platform-page min-h-screen p-4 md:p-8">
    <div className="max-w-6xl mx-auto space-y-7">
      <header className="page-hero platform-title-row"><div className="platform-title-copy"><span className="eyebrow">UNYRA network</span><h1 className="text-3xl md:text-5xl font-black text-slate-950 flex items-center gap-3"><Building2 className="text-cyan-500" /> Club workspaces</h1><p className="text-slate-500 mt-2 max-w-2xl">Create a club and its first administrator together. They will finish the sporting setup inside their own workspace.</p></div><div className="network-inline"><div><strong>{clubs.length}</strong><span>Clubs</span></div><i /><div><strong>{clubs.filter(c => c.onboardingComplete).length}</strong><span>Live</span></div><i /><div><strong>{clubs.filter(c => !c.onboardingComplete).length}</strong><span>Setup</span></div></div></header>

      {result && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4"><CheckCircle2 className="text-emerald-600 shrink-0" /><div className="flex-1"><h3 className="font-black text-emerald-950">{result.club} is ready for onboarding</h3><p className="text-sm text-emerald-800">Share these temporary credentials securely with the club administrator.</p></div><div className="rounded-xl bg-white/80 px-4 py-2 text-xs font-mono"><p>{result.username}</p><p>{result.password}</p></div><button type="button" onClick={() => navigator.clipboard?.writeText(`UNYRA club login\nUsername: ${result.username}\nPassword: ${result.password}`)} className="text-xs font-black text-emerald-800 flex items-center gap-1"><Copy size={14} /> Copy details</button></div>}

      <div>
        <form onSubmit={createWorkspace} className="ops-card ops-card-primary p-6 md:p-8 space-y-7">
          <div className="flex items-start gap-4"><span className="workspace-step">01</span><div><span className="text-[10px] font-black tracking-[.2em] uppercase text-cyan-700">Organisation</span><h2 className="text-2xl font-black mt-1">Club identity</h2><p className="text-sm text-slate-500 mt-1">The essential account details. The club administrator completes the sporting setup later.</p></div></div>
          <div className="grid md:grid-cols-2 gap-4"><Field label="Club name" required><input className={field} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. North City Sports Club" required /></Field><Field label="Club code"><input className={field} value={form.code} onChange={e => set("code", e.target.value)} placeholder="e.g. NCSC" maxLength={8} /></Field><Field label="Primary contact"><input className={field} value={form.contactPerson} onChange={e => set("contactPerson", e.target.value)} placeholder="Contact name" /></Field><Field label="Club email"><input className={field} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="club@example.com" /></Field><Field label="Phone"><input className={field} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+27 …" /></Field><Field label="Region or league"><input className={field} value={form.region} onChange={e => set("region", e.target.value)} placeholder="Competition region" /></Field></div>
          <Field label="Active season"><input className={`${field} md:max-w-[calc(50%-0.5rem)]`} value={form.activeSeason} onChange={e => set("activeSeason", e.target.value)} placeholder="2026" /></Field>
          <fieldset><legend className="form-label mb-3">Available sports</legend><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{SPORTS.map(sport => <button type="button" key={sport.id} onClick={() => toggleSport(sport.id)} className={`sport-toggle ${form.enabledSports.includes(sport.id) ? "is-selected" : ""}`}><span className="sport-check">{form.enabledSports.includes(sport.id) && <Check size={12} />}</span>{sport.name}</button>)}</div><p className="text-xs text-slate-400 mt-2">Maximum 5 teams per sport · Maximum 30 players per team</p></fieldset>
          <div className="border-t border-slate-100 pt-7"><div className="flex items-start gap-4 mb-4"><span className="workspace-step">02</span><div><h3 className="font-black flex items-center gap-2"><Shield size={17} className="text-cyan-600" /> First club administrator</h3><p className="text-xs text-slate-500 mt-1">A temporary account for completing onboarding.</p></div></div><div className="grid md:grid-cols-3 gap-4"><Field label="Administrator name" required><input className={field} value={form.adminName} onChange={e => set("adminName", e.target.value)} placeholder="Full name" required /></Field><Field label="Username" required><input className={field} value={form.username} onChange={e => set("username", e.target.value)} placeholder="Unique username" required /></Field><Field label="Temporary password" required hint="At least 8 characters"><input className={field} type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Create secure password" minLength={8} required /></Field></div></div>
          <button disabled={creating || !form.enabledSports.length} className="w-full rounded-xl bg-slate-950 text-white py-4 font-black flex items-center justify-center gap-2 hover:bg-cyan-700 disabled:opacity-50 transition">{creating ? "Creating workspace…" : <>Create club workspace <ArrowRight size={18} /></>}</button>
        </form>

      </div>

    </div>
  </div>
}

function ClubOnboarding({ app }) {
  const { clubs, teams, coaches, currentClubId, currentUserProfile, updateClub, addTeam, deleteTeam, addCoach, updateCoach, setCurrentUserProfile } = app
  const navigate = useNavigate()
  const club = clubs.find(item => item.id === currentClubId)
  const clubTeams = teams.filter(item => item.clubId === currentClubId)
  const clubCoaches = coaches.filter(item => item.clubId === currentClubId && item.role === "coach")
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState({ name: club?.name || "", code: club?.code || "", email: club?.email || "", phone: club?.phone || "", address: club?.address || "", region: club?.region || "", activeSeason: club?.activeSeason || String(new Date().getFullYear()) })
  const [sports, setSports] = useState(club?.enabledSports || [])
  const [team, setTeam] = useState({ name: "", sportId: "", ageGroup: "", division: "", homeVenue: "" })
  const [coach, setCoach] = useState({ fullName: "", username: "", password: "", teamId: "" })
  const [error, setError] = useState("")
  const steps = ["Club profile", "Sports", "Teams", "Coaches", "Launch"]
  const setDetail = (key, value) => setDetails(current => ({ ...current, [key]: value }))

  useEffect(() => {
    if (club) {
      setDetails({ name: club.name || "", code: club.code || "", email: club.email || "", phone: club.phone || "", address: club.address || "", region: club.region || "", activeSeason: club.activeSeason || String(new Date().getFullYear()) })
      setSports(club.enabledSports || [])
    }
  }, [club?.id])

  if (!club) return <div className="p-10 text-center text-slate-500">Loading your club workspace…</div>
  if (club.onboardingComplete) return <ClubOperations app={app} club={club} />
  const saveDetails = async () => { await updateClub(club.id, details); setStep(1) }
  const saveSports = async () => { if (!sports.length) return; await updateClub(club.id, { enabledSports: sports }); setStep(2) }
  const createTeam = async e => { e.preventDefault(); if (!team.name || !team.sportId || !team.homeVenue) return; setError(""); try { await addTeam({ ...team, clubId: club.id, status: "active" }); setTeam({ name: "", sportId: "", ageGroup: "", division: "", homeVenue: "" }) } catch (err) { setError(err.message) } }
  const createCoach = async e => { e.preventDefault(); if (!coach.fullName || !coach.username || !coach.password || !coach.teamId) return; await addCoach({ ...coach, clubId: club.id, teamIds: [coach.teamId], role: "coach" }); setCoach({ fullName: "", username: "", password: "", teamId: "" }) }
  const launch = async () => { await updateClub(club.id, { onboardingComplete: true, status: "active", launchedAt: new Date().toISOString() }); if (currentUserProfile?.id) await updateCoach(currentUserProfile.id, { onboardingComplete: true }); const profile = { ...currentUserProfile, onboardingComplete: true }; setCurrentUserProfile(profile); navigate("/dashboard") }
  const canLaunch = details.name && details.email && details.phone && details.address && details.region && sports.length && clubTeams.length && clubCoaches.length

  return <div className="platform-page min-h-screen p-4 md:p-8"><div className="max-w-5xl mx-auto">
    <header className="page-hero mb-7"><span className="eyebrow">Club activation</span><h1 className="text-3xl md:text-5xl font-black text-slate-950">Build your UNYRA workspace</h1><p className="text-slate-500 mt-2">A guided setup for {club.name}. Your progress is saved as you continue.</p></header>
    <nav className="grid grid-cols-5 gap-1 md:gap-3 mb-6">{steps.map((label, index) => <button key={label} onClick={() => index <= step && setStep(index)} className={`rounded-xl p-2 md:p-3 text-[10px] md:text-xs font-black transition ${index === step ? "bg-slate-950 text-white" : index < step ? "bg-emerald-50 text-emerald-700" : "bg-white text-slate-400 border border-slate-100"}`}><span className="block text-base mb-1">{index < step ? <Check size={16} className="mx-auto" /> : `0${index + 1}`}</span>{label}</button>)}</nav>
    <section className="ops-card p-5 md:p-8">
      {step === 0 && <div className="space-y-5"><StepHead number="01" title="Complete the club profile" text="Contact, venue and competition details are required before launch." /><div className="grid md:grid-cols-2 gap-4">{[["name","Club name",true],["code","Club code",false],["email","Club email",true],["phone","Phone",true],["address","Home ground / address",true],["region","Region / league",true],["activeSeason","Active season",true]].map(([key,label,required]) => <Field key={key} label={label} required={required}><input className={field} value={details[key]} onChange={e => setDetail(key,e.target.value)} placeholder={label} required={required} /></Field>)}</div><Next onClick={saveDetails} disabled={!details.name || !details.email || !details.phone || !details.address || !details.region || !details.activeSeason}>Save and continue</Next></div>}
      {step === 1 && <div className="space-y-5"><StepHead number="02" title="Choose your sports" text="Enable only the sports operated by your club. You can expand later." /><div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">{SPORTS.map(s => <button key={s.id} onClick={() => setSports(current => current.includes(s.id) ? current.filter(id => id !== s.id) : [...current,s.id])} className={`rounded-2xl border p-5 text-left transition ${sports.includes(s.id) ? "bg-slate-950 border-slate-950 text-white" : "border-slate-200 hover:border-cyan-400"}`}><span className="font-black block">{s.name}</span><span className="text-[10px] opacity-60 uppercase">{s.teamLabel}</span></button>)}</div><Next onClick={saveSports} disabled={!sports.length}>Save sports</Next></div>}
      {step === 2 && <div className="space-y-5"><StepHead number="03" title="Create your teams" text="Add the team details needed for fixtures, players and scheduling. Limits: 5 teams per sport and 30 players per team." />{error && <p className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm font-bold">{error}</p>}<form onSubmit={createTeam} className="grid md:grid-cols-2 gap-4"><Field label="Team name" required><input className={field} value={team.name} onChange={e => setTeam({...team,name:e.target.value})} placeholder="e.g. Senior Women" required /></Field><Field label="Sport" required><select className={field} value={team.sportId} onChange={e => setTeam({...team,sportId:e.target.value})} required><option value="">Choose a sport</option>{sports.map(id => <option key={id} value={id}>{getSport(id).name}</option>)}</select></Field><Field label="Age group"><input className={field} value={team.ageGroup} onChange={e => setTeam({...team,ageGroup:e.target.value})} placeholder="e.g. U18 or Senior" /></Field><Field label="League or division"><input className={field} value={team.division} onChange={e => setTeam({...team,division:e.target.value})} placeholder="e.g. Premier Division" /></Field><Field label="Home venue" required><input className={field} value={team.homeVenue} onChange={e => setTeam({...team,homeVenue:e.target.value})} placeholder="Team home ground" required /></Field><div className="flex items-end"><button className="w-full rounded-xl bg-cyan-600 text-slate-950 min-h-[3.25rem] font-black flex justify-center items-center gap-2"><Plus size={18} /> Add team</button></div></form><div className="grid md:grid-cols-2 gap-3">{clubTeams.map(t => <div key={t.id} className="rounded-xl bg-slate-50 p-4 flex justify-between"><div><strong>{t.name}</strong><small className="block text-slate-400">{getSport(t.sportId).name} · {t.ageGroup || "Open"} · 0/30 players</small></div><button onClick={() => deleteTeam(t.id)} className="text-red-400"><Trash2 size={16} /></button></div>)}</div><Next onClick={() => setStep(3)} disabled={!clubTeams.length}>Continue to coaches</Next></div>}
      {step === 3 && <div className="space-y-5"><StepHead number="04" title="Invite your coaching team" text="Add at least one coach. Coaches only gain access to their assigned team; club administrators retain access to every team." /><form onSubmit={createCoach} className="grid md:grid-cols-2 gap-4"><Field label="Coach name" required><input className={field} value={coach.fullName} onChange={e => setCoach({...coach,fullName:e.target.value})} placeholder="Full name" /></Field><Field label="Assigned team" required><select className={field} value={coach.teamId} onChange={e => setCoach({...coach,teamId:e.target.value})}><option value="">Choose a team</option>{clubTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field><Field label="Username" required><input className={field} value={coach.username} onChange={e => setCoach({...coach,username:e.target.value})} placeholder="Unique username" /></Field><Field label="Temporary password" required><input className={field} type="password" value={coach.password} onChange={e => setCoach({...coach,password:e.target.value})} placeholder="Secure temporary password" /></Field><button className="md:col-span-2 rounded-xl bg-cyan-600 text-slate-950 py-3 font-black">Add coach</button></form>{clubCoaches.map(c => <div key={c.id} className="rounded-xl bg-slate-50 p-3 text-sm"><strong>{c.fullName}</strong><span className="text-slate-400 ml-2">{clubTeams.find(t => t.id === c.teamId)?.name}</span></div>)}<Next onClick={() => setStep(4)} disabled={!clubCoaches.length}>Review workspace</Next></div>}
      {step === 4 && <div className="text-center py-4"><div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto"><Flag size={30} /></div><StepHead number="05" title="Ready to launch" text="Your club workspace is configured. Launching unlocks the operational dashboard for your administrators." /><div className="grid sm:grid-cols-3 gap-3 my-7"><Metric value={sports.length} label="Sports" /><Metric value={clubTeams.length} label="Teams" /><Metric value={clubCoaches.length} label="Coaches" /></div><button onClick={launch} disabled={!canLaunch} className="rounded-xl bg-emerald-600 text-white px-8 py-4 font-black disabled:opacity-40">Launch {club.name}</button></div>}
    </section>
  </div></div>
}

function ClubOperations({ app, club }) {
  const { teams, players, addTeam, deleteTeam } = app
  const clubTeams = teams.filter(item => item.clubId === club.id)
  const [team, setTeam] = useState({ name: "", sportId: "", ageGroup: "", division: "", homeVenue: "" })
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const createTeam = async event => {
    event.preventDefault(); setError("")
    try { await addTeam({ ...team, clubId: club.id, status: "active" }); setTeam({ name: "", sportId: "", ageGroup: "", division: "", homeVenue: "" }); setShowForm(false) }
    catch (err) { setError(err.message) }
  }
  const totalPlayers = players.filter(player => clubTeams.some(item => item.id === player.teamId)).length
  return <div className="platform-page min-h-screen p-4 md:p-8"><div className="max-w-6xl mx-auto space-y-7">
    <header className="page-hero team-directory-head"><div><span className="eyebrow">Club operations</span><h1 className="text-3xl md:text-5xl font-black text-slate-950">Teams</h1><p className="text-slate-500 mt-2">{club.name} · Manage squads, team details and roster capacity.</p></div><button onClick={() => { setShowForm(true); setError("") }} className="team-add-button"><Plus size={17} /> Add team</button></header>
    <section className="team-summary"><div><strong>{clubTeams.length}</strong><span>Active teams</span></div><i /><div><strong>{new Set(clubTeams.map(item => item.sportId)).size}</strong><span>Sports</span></div><i /><div><strong>{totalPlayers}</strong><span>Players</span></div><i /><div><strong>{clubTeams.length * 30 - totalPlayers}</strong><span>Open roster places</span></div></section>
    <section className="team-directory-grid">{clubTeams.map(item => { const count = players.filter(player => player.teamId === item.id).length; return <article key={item.id} className="team-directory-card"><div className="team-card-top"><span>{getSport(item.sportId).name}</span><button onClick={() => window.confirm(`Delete ${item.name}?`) && deleteTeam(item.id)}><Trash2 size={15} /></button></div><h3>{item.name || "Unnamed team"}</h3><p>{[item.ageGroup,item.division].filter(Boolean).join(" · ") || "Open team"}</p><dl><div><dt>Home venue</dt><dd>{item.homeVenue || "Not set"}</dd></div><div><dt>Roster</dt><dd>{count} of 30</dd></div></dl><div className="team-roster-bar"><span style={{width:`${Math.min(100,count/30*100)}%`}} /></div></article> })}{!clubTeams.length && <div className="team-directory-empty"><Users size={28} /><strong>No teams yet</strong><span>Create the first team for {club.name}.</span><button onClick={() => setShowForm(true)}><Plus size={15} /> Add first team</button></div>}</section>
    {showForm && <div className="team-modal-backdrop" onMouseDown={() => setShowForm(false)}><form onSubmit={createTeam} className="team-modal" onMouseDown={event => event.stopPropagation()}><header><div><span className="eyebrow">New team</span><h2>Create a team</h2></div><button type="button" onClick={() => setShowForm(false)}><X size={19} /></button></header><div className="team-modal-body">{error && <p className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm font-bold">{error}</p>}<Field label="Team name" required><input className={field} value={team.name} onChange={e => setTeam({...team,name:e.target.value})} placeholder="e.g. Senior Women" required /></Field><Field label="Sport" required><select className={field} value={team.sportId} onChange={e => setTeam({...team,sportId:e.target.value})} required><option value="">Choose a sport</option>{(club.enabledSports || []).map(id => <option key={id} value={id}>{getSport(id).name}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Age group"><input className={field} value={team.ageGroup} onChange={e => setTeam({...team,ageGroup:e.target.value})} placeholder="e.g. U18" /></Field><Field label="Division"><input className={field} value={team.division} onChange={e => setTeam({...team,division:e.target.value})} placeholder="e.g. Premier" /></Field></div><Field label="Home venue" required><input className={field} value={team.homeVenue} onChange={e => setTeam({...team,homeVenue:e.target.value})} placeholder="Team home ground" required /></Field></div><footer><button type="button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit">Create team</button></footer></form></div>}
  </div></div>
}

function StepHead({ number, title, text }) { return <div><span className="text-xs font-black text-cyan-600 tracking-widest">STEP {number}</span><h2 className="text-2xl md:text-3xl font-black text-slate-950 mt-1">{title}</h2><p className="text-slate-500 mt-1">{text}</p></div> }
function Next({ children, ...props }) { return <div className="flex justify-end"><button {...props} className="rounded-xl bg-slate-950 text-white px-6 py-3 font-black flex items-center gap-2 disabled:opacity-40">{children}<ArrowRight size={17} /></button></div> }
function Metric({ value, label }) { return <div className="rounded-xl bg-slate-50 p-4 text-center"><strong className="text-2xl text-slate-950 block">{value}</strong><span className="text-[10px] uppercase tracking-widest text-slate-400 font-black">{label}</span></div> }
function Field({ label, required, hint, children }) { return <label className="form-field"><span className="form-label">{label}{required && <i>Required</i>}</span>{children}{hint && <small>{hint}</small>}</label> }
