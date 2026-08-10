import { useEffect, useMemo, useState } from "react"
import { ArchiveRestore, History, Save, ShieldAlert } from "lucide-react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/config"
import { useApp } from "../contexts/AppContext"

const archiveCollections = ["players", "guardians", "coaches", "fixtures", "injuries"]

export default function AdminControlCenter() {
  const { fixtures, players, teams, currentClubId, auditLogs, adminOverrideFixture, restoreArchivedRecord } = useApp()
  const [teamId, setTeamId] = useState("all")
  const [fixtureId, setFixtureId] = useState("")
  const [playerId, setPlayerId] = useState("")
  const [availability, setAvailability] = useState("available")
  const [reason, setReason] = useState("")
  const [archived, setArchived] = useState([])
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const clubTeams = teams.filter(team => team.clubId === currentClubId)
  const filteredFixtures = fixtures.filter(item => teamId === "all" || item.teamId === teamId || item.team === teamId)
  const selectedFixture = filteredFixtures.find(item => item.id === fixtureId)
  const fixturePlayers = useMemo(() => players.filter(player => selectedFixture?.teamId === player.teamId), [players, selectedFixture])
  const filteredArchived = archived.filter(item => teamId === "all" || item.teamId === teamId)
  const filteredAuditLogs = auditLogs.filter(log => teamId === "all" || log.teamId === teamId)

  useEffect(() => {
    const unsubscribers = archiveCollections.map(collectionName => onSnapshot(collection(db, collectionName), snapshot => {
      const records = snapshot.docs.map(item => ({ id:item.id, collectionName, ...item.data() })).filter(item => item.archived && (!currentClubId || item.clubId === currentClubId))
      setArchived(current => [...current.filter(item => item.collectionName !== collectionName), ...records])
    }))
    return () => unsubscribers.forEach(unsubscribe => unsubscribe())
  }, [currentClubId])

  const override = async event => {
    event.preventDefault()
    if (!selectedFixture || !playerId) return
    setSaving(true); setMessage("")
    try {
      const responses = { ...(selectedFixture.availabilityResponses || {}), [playerId]: { status: availability, respondedAt: new Date().toISOString(), overriddenByAdmin: true } }
      await adminOverrideFixture(selectedFixture.id, { availabilityResponses: responses }, reason)
      setMessage("Availability corrected and recorded in the audit log.")
      setReason("")
    } catch (error) { setMessage(error.message) }
    finally { setSaving(false) }
  }

  return <div className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="match-hub-head"><div><span className="eyebrow">Administrator tools</span><h1>Admin Control Centre</h1><p>Correct operational data, restore archived records and review accountability.</p></div><label className="admin-team-filter"><span>Team view</span><select value={teamId} onChange={event=>{setTeamId(event.target.value);setFixtureId("");setPlayerId("")}}><option value="all">All club teams</option>{clubTeams.map(team=><option key={team.id} value={team.id}>{team.name}</option>)}</select></label></header>
    {message && <p className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm font-bold text-cyan-800">{message}</p>}
    <div className="grid gap-6 xl:grid-cols-2"><section className="admin-control-panel"><header><ShieldAlert/><div><h2>Availability override</h2><p>Administrators can correct a response even after the deadline is locked.</p></div></header><form onSubmit={override}><label className="form-field"><span className="form-label">Fixture</span><select required value={fixtureId} onChange={e=>{setFixtureId(e.target.value);setPlayerId("")}}><option value="">Choose fixture</option>{filteredFixtures.map(item=><option key={item.id} value={item.id}>{item.teamName||"Team"} vs {item.opponent} · {item.date}</option>)}</select></label><label className="form-field"><span className="form-label">Player</span><select required value={playerId} onChange={e=>setPlayerId(e.target.value)}><option value="">Choose player</option>{fixturePlayers.map(player=><option key={player.id} value={player.id}>{player.firstName} {player.lastName}</option>)}</select></label><label className="form-field"><span className="form-label">Corrected response</span><select value={availability} onChange={e=>setAvailability(e.target.value)}><option value="available">Available</option><option value="unavailable">Unavailable</option><option value="pending">Pending</option></select></label><label className="form-field"><span className="form-label">Reason <i>Required</i></span><textarea required value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Parent confirmed by telephone"/></label><button disabled={saving}><Save size={15}/>{saving?"Saving…":"Apply override"}</button></form></section>
      <section className="admin-control-panel"><header><ArchiveRestore/><div><h2>Archived records</h2><p>Restore records that were removed by mistake.</p></div></header><div className="archive-list">{filteredArchived.map(item=><div key={`${item.collectionName}-${item.id}`}><div><strong>{item.fullName||item.name||item.opponent||item.description||item.username||item.id}</strong><small>{item.collectionName} · {item.archivedReason||"Archived"}</small></div><button onClick={async()=>{await restoreArchivedRecord(item.collectionName,item.id,"Restored from Admin Control Centre");setMessage("Record restored.")}}>Restore</button></div>)}{!filteredArchived.length&&<p>No archived records for this team.</p>}</div></section></div>
    <section className="admin-control-panel"><header><History/><div><h2>Audit history</h2><p>Recent administrative and operational changes.</p></div></header><div className="audit-list">{filteredAuditLogs.slice(0,100).map(log=><div key={log.id}><time>{log.createdAt?new Date(log.createdAt).toLocaleString("en-GB"):"—"}</time><strong>{log.actor||"System"} · {log.action}</strong><span>{log.entityType} {log.entityId} {log.changes?.reason?`· ${log.changes.reason}`:""}</span></div>)}{!filteredAuditLogs.length&&<p>No audit records for this team.</p>}</div></section>
  </div></div>
}
