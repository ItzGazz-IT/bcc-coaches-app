import { useMemo, useState } from "react"
import { Edit, Plus, ShieldCheck, Trash2, Users, X } from "lucide-react"
import { useApp } from "../contexts/AppContext"

const blank = { fullName: "", relationship: "Parent", email: "", phone: "", username: "", password: "", playerIds: [], consentStatus: "pending", mediaConsent: false, medicalConsent: false, emergencyContact: false }

export default function ParentsGuardians() {
  const { guardians, players, teams, currentClubId, addGuardian, updateGuardian, deleteGuardian } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState("")
  const [form, setForm] = useState(blank)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const clubPlayers = players.filter(item => item.clubId === currentClubId)
  const playerById = useMemo(() => Object.fromEntries(clubPlayers.map(player => [player.id, player])), [clubPlayers])
  const clubGuardians = guardians.filter(item => item.clubId === currentClubId && item.playerIds?.some(id => playerById[id]))

  const playerName = player => player?.name || `${player?.firstName || ""} ${player?.lastName || ""}`.trim() || player?.username || "Player"
  const openNew = () => { setEditingId(""); setForm(blank); setError(""); setShowForm(true) }
  const openEdit = guardian => { setEditingId(guardian.id); setForm({ ...blank, ...guardian, password: "" }); setError(""); setShowForm(true) }
  const togglePlayer = id => setForm(current => ({ ...current, playerIds: current.playerIds.includes(id) ? current.playerIds.filter(item => item !== id) : [...current.playerIds, id] }))
  const save = async event => {
    event.preventDefault()
    if (!form.playerIds.length) return setError("Link at least one player to this parent or guardian.")
    if (!editingId && clubGuardians.some(item => item.username?.toLowerCase() === form.username.trim().toLowerCase())) return setError("That username is already in use.")
    setSaving(true)
    setError("")
    try {
      const record = { ...form, username: form.username.trim(), clubId: currentClubId, teamIds: [...new Set(form.playerIds.map(id => playerById[id]?.teamId).filter(Boolean))] }
      if (editingId) {
        if (!record.password) delete record.password
        await updateGuardian(editingId, record)
      } else await addGuardian(record)
      setShowForm(false)
    } catch (saveError) {
      setError(saveError?.message || "The parent or guardian could not be saved.")
    } finally { setSaving(false) }
  }

  return <div className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="match-hub-head"><div><span className="eyebrow">Youth safeguarding</span><h1>Parents / Guardians</h1><p>Link approved adults to the players they represent.</p></div><button onClick={openNew}><Plus size={17}/> Add parent / guardian</button></header>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{clubGuardians.map(guardian => <article key={guardian.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700"><ShieldCheck size={20}/></span><div><h2 className="font-black text-slate-900">{guardian.fullName}</h2><p className="text-xs font-semibold text-slate-500">{guardian.relationship || "Guardian"}</p></div></div><div className="flex gap-1"><button onClick={() => openEdit(guardian)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Edit size={16}/></button><button onClick={() => window.confirm("Remove this parent or guardian account?") && deleteGuardian(guardian.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16}/></button></div></div><div className="mt-4 space-y-1 text-xs text-slate-500"><p>{guardian.email || "No email"}</p><p>{guardian.phone || "No phone"}</p><p className="font-bold text-slate-700">Username: {guardian.username}</p></div><div className="mt-4 border-t border-slate-100 pt-3"><p className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400"><Users size={13}/> Linked players</p><div className="flex flex-wrap gap-1.5">{guardian.playerIds?.map(id => <span key={id} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{playerName(playerById[id])}</span>)}</div></div></article>)}{!clubGuardians.length && <div className="match-empty md:col-span-2 xl:col-span-3"><Users size={30}/><strong>No parents or guardians added</strong><span>Create an account and link it to one or more youth players.</span></div>}</section>
    {showForm && <div className="team-modal-backdrop" onMouseDown={() => setShowForm(false)}><form className="team-modal" onSubmit={save} onMouseDown={event => event.stopPropagation()}><header><div><span className="eyebrow">Parent / guardian access</span><h2>{editingId ? "Edit account" : "Add account"}</h2></div><button type="button" onClick={() => setShowForm(false)}><X/></button></header><div className="team-modal-body space-y-3">{error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}<label className="form-field"><span className="form-label">Full name</span><input required value={form.fullName} onChange={e => setForm({...form,fullName:e.target.value})}/></label><div className="grid grid-cols-2 gap-3"><label className="form-field"><span className="form-label">Relationship</span><select value={form.relationship} onChange={e => setForm({...form,relationship:e.target.value})}><option>Parent</option><option>Legal guardian</option><option>Carer</option><option>Other approved adult</option></select></label><label className="form-field"><span className="form-label">Phone</span><input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})}/></label></div><label className="form-field"><span className="form-label">Email</span><input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})}/></label><div className="grid grid-cols-2 gap-3"><label className="form-field"><span className="form-label">Username</span><input required value={form.username} onChange={e => setForm({...form,username:e.target.value})}/></label><label className="form-field"><span className="form-label">{editingId ? "New password (optional)" : "Temporary password"}</span><input type="password" required={!editingId} value={form.password} onChange={e => setForm({...form,password:e.target.value})}/></label></div><fieldset><legend className="form-label mb-2">Linked players</legend><div className="guardian-player-picker">{clubPlayers.map(player => <label key={player.id} className={form.playerIds.includes(player.id) ? "selected" : ""}><input type="checkbox" checked={form.playerIds.includes(player.id)} onChange={() => togglePlayer(player.id)}/><span>{playerName(player)}<small>{teams.find(team => team.id === player.teamId)?.name || "Team"}</small></span></label>)}</div></fieldset></div><footer><button type="button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving…" : "Save account"}</button></footer></form></div>}
  </div></div>
}
