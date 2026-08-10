import { useEffect, useMemo, useState } from "react"
import { Activity, Bell, CalendarDays, CheckCircle2, Clipboard, Clock, MapPin, Plus, Printer, ShieldCheck, Trash2, Trophy, Users, X } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { getAvailabilitySummary, getDeclinedPlayerIds, getMedicallyUnavailablePlayerIds, isPlayerMatchEligible } from "../utils/matchDayEligibility"
import { getMatchRules } from "../config/matchRules"
import { getSport } from "../config/sports"
import { canAccountVote, getMatchVoterKey, getVoteWinner } from "../utils/matchFinalisation"

const blankFixture = { teamId: "", opponent: "", date: "", time: "", availabilityDeadline: "", homeAway: "Home", venue: "", competition: "", status: "Upcoming" }

export default function MatchDayHub() {
  const { fixtures, teams, players, injuries, currentClubId, currentPlayerId, currentUser, currentUserProfile, userRole, addFixture, updateFixture, updateFixtureAvailability, resetFixtureAvailability, sendFixtureAvailabilityReminders, deleteFixture } = useApp()
  const clubTeams = teams.filter(team => team.clubId === currentClubId)
  const [teamFilter, setTeamFilter] = useState("all")
  const [tab, setTab] = useState("upcoming")
  const [selectedId, setSelectedId] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState("")
  const [form, setForm] = useState(blankFixture)
  const [showSquad, setShowSquad] = useState(false)
  const [squadIds, setSquadIds] = useState([])
  const [showScore, setShowScore] = useState(false)
  const [showLineup, setShowLineup] = useState(false)
  const [showEvent, setShowEvent] = useState(false)
  const [eventDraft, setEventDraft] = useState({ type: "", playerId: "", secondaryPlayerId: "", minute: "", value: "", notes: "" })
  const [copied, setCopied] = useState(false)
  const [showFinalise, setShowFinalise] = useState(false)
  const [matchNotes, setMatchNotes] = useState("")
  const [matchAttendance, setMatchAttendance] = useState({})
  const [potmChoice, setPotmChoice] = useState("")
  const [overrideWinnerId, setOverrideWinnerId] = useState("")
  const [lineup, setLineup] = useState({ starters: [], substitutes: [], positions: {}, captainId: "", specialistId: "", formation: "" })
  const [score, setScore] = useState({ home: "", away: "" })
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState("")
  const [deadlineDraft, setDeadlineDraft] = useState("")
  const canManage = userRole === "club-admin" || userRole === "super-admin" || userRole === "coach"
  const isAdmin = userRole === "club-admin" || userRole === "super-admin"

  const visible = useMemo(() => fixtures
    .filter(item => teamFilter === "all" || (item.teamId || item.team) === teamFilter)
    .filter(item => tab === "results" ? item.status === "Completed" : item.status !== "Completed")
    .sort((a, b) => tab === "results" ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date)), [fixtures, teamFilter, tab])
  const selected = visible.find(item => item.id === selectedId) || visible[0]
  const selectedTeam = clubTeams.find(team => team.id === (selected?.teamId || selected?.team))
  const sport = getSport(selectedTeam?.sportId)
  const matchRules = getMatchRules(selectedTeam?.sportId)
  const teamPlayers = players.filter(player => player.teamId === selectedTeam?.id)
  const squadRoster = teamPlayers.filter(player => selected?.squadPlayerIds?.includes(player.id))
  const medicallyUnavailableIds = getMedicallyUnavailablePlayerIds(injuries)
  const declinedIds = getDeclinedPlayerIds(selected?.availabilityResponses)
  const isPlayerEligible = player => isPlayerMatchEligible(player.id, medicallyUnavailableIds, declinedIds)
  const selectedSquad = squadRoster
  const playerInvited = Boolean(currentPlayerId && selected?.squadPlayerIds?.includes(currentPlayerId))
  const playerSelected = Boolean(currentPlayerId && selected?.squadPlayerIds?.includes(currentPlayerId) && !medicallyUnavailableIds.has(currentPlayerId) && !declinedIds.has(currentPlayerId))
  const myAvailability = selected?.availabilityResponses?.[currentPlayerId]?.status || "pending"
  const invitedIds = selected?.squadPlayerIds || []
  const medicalTeamIds = teamPlayers.filter(player => medicallyUnavailableIds.has(player.id)).map(player => player.id)
  const dashboardPlayerIds = [...new Set([...invitedIds, ...medicalTeamIds])]
  const availabilitySummary = getAvailabilitySummary(dashboardPlayerIds, selected?.availabilityResponses, medicallyUnavailableIds)
  const pendingPlayerIds = invitedIds.filter(id => !medicallyUnavailableIds.has(id) && !selected?.availabilityResponses?.[id]?.status)
  const myReminder = selected?.availabilityReminders?.[currentPlayerId]
  const myResponseTime = selected?.availabilityResponses?.[currentPlayerId]?.respondedAt
  const hasActiveReminder = Boolean(myReminder?.sentAt && (!myResponseTime || new Date(myReminder.sentAt) > new Date(myResponseTime)))
  const voterKey = getMatchVoterKey({ userRole, currentUserProfile, currentUser, currentPlayerId })
  const canVote = canAccountVote({ userRole, currentPlayerId, linkedPlayerIds: currentUserProfile?.playerIds || [], squadPlayerIds: selected?.squadPlayerIds || [], attendance: selected?.matchAttendance || {}, voting: selected?.potmVoting })
  const existingVote = selected?.potmVotes?.[voterKey]?.playerId || ""
  const voteWinnerId = selected?.potmWinnerId || getVoteWinner(selected?.potmVotes)
  const potmCandidates = squadRoster.filter(player => !["absent", "injured"].includes(selected?.matchAttendance?.[player.id]))

  useEffect(() => {
    if (selected && !visible.some(item => item.id === selectedId)) setSelectedId(selected.id)
  }, [selected, selectedId, visible])

  useEffect(() => {
    setDeadlineDraft(selected?.availabilityDeadline ? new Date(selected.availabilityDeadline).toISOString().slice(0, 16) : "")
  }, [selected?.id, selected?.availabilityDeadline])

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const openNew = () => { setEditingId(""); setForm({ ...blankFixture, teamId: teamFilter === "all" ? "" : teamFilter }); setShowForm(true) }
  const openEdit = item => { setEditingId(item.id); setForm({ ...blankFixture, ...item, teamId: item.teamId || item.team || "" }); setShowForm(true) }
  const save = async event => {
    event.preventDefault()
    const team = clubTeams.find(item => item.id === form.teamId)
    setSaving(true)
    setActionError("")
    try {
      const record = { ...form, team: form.teamId, teamName: team?.name || "Team" }
      if (editingId) await updateFixture(editingId, record)
      else await addFixture(record)
      setShowForm(false)
    } catch (error) { setActionError(error?.message || "The fixture could not be saved.") }
    finally { setSaving(false) }
  }
  const openSquad = () => { setSquadIds(selected?.squadPlayerIds || []); setShowSquad(true) }
  const togglePlayer = player => {
    if (!isPlayerEligible(player)) return
    setSquadIds(ids => {
      if (ids.includes(player.id)) return ids.filter(item => item !== player.id)
      if (ids.length >= matchRules.maxSquad) {
        setActionError(`${sport.name} squads are limited to ${matchRules.maxSquad} players.`)
        return ids
      }
      setActionError("")
      return [...ids, player.id]
    })
  }
  const saveSquad = async () => {
    setSaving(true)
    setActionError("")
    try {
      const allowedIds = new Set(teamPlayers.filter(isPlayerEligible).map(player => player.id))
      await updateFixture(selected.id, { squadPlayerIds: squadIds.filter(id => allowedIds.has(id)), squadPublishedAt: new Date().toISOString() })
      setShowSquad(false)
    } catch (error) { setActionError(error?.message || "The squad could not be published.") }
    finally { setSaving(false) }
  }
  const respondToAvailability = async status => {
    if (!selected || selected.availabilityLocked || !currentPlayerId || !playerInvited || medicallyUnavailableIds.has(currentPlayerId)) return
    setSaving(true)
    setActionError("")
    try {
      await updateFixtureAvailability(selected.id, currentPlayerId, { status, respondedAt: new Date().toISOString() })
    } catch (error) { setActionError(error?.message || "Your response could not be saved.") }
    finally { setSaving(false) }
  }
  const resetPlayerResponse = async playerId => {
    setSaving(true)
    setActionError("")
    try {
      await resetFixtureAvailability(selected.id, playerId)
      setSquadIds(ids => ids.includes(playerId) ? ids : [...ids, playerId])
    } catch (error) { setActionError(error?.message || "The player could not be reinvited.") }
    finally { setSaving(false) }
  }
  const sendReminders = async playerIds => {
    setSaving(true)
    setActionError("")
    try { await sendFixtureAvailabilityReminders(selected.id, playerIds) }
    catch (error) { setActionError(error?.message || "The reminder could not be sent.") }
    finally { setSaving(false) }
  }
  const saveAvailabilitySettings = async shouldLock => {
    if (shouldLock && !deadlineDraft) {
      setActionError("Choose a response deadline before locking availability.")
      return
    }
    setSaving(true)
    setActionError("")
    try {
      await updateFixture(selected.id, {
        availabilityDeadline: deadlineDraft ? new Date(deadlineDraft).toISOString() : "",
        availabilityLocked: shouldLock,
        availabilityLockedAt: shouldLock ? new Date().toISOString() : ""
      })
    } catch (error) { setActionError(error?.message || "Availability settings could not be saved.") }
    finally { setSaving(false) }
  }
  const openScore = () => {
    setScore({ home: selected?.homeScore ?? "", away: selected?.awayScore ?? "" })
    setShowScore(true)
  }
  const openLineup = () => {
    const saved = selected?.lineup || {}
    const eligibleIds = new Set(selectedSquad.map(player => player.id))
    setLineup({
      starters: (saved.starters || []).filter(id => eligibleIds.has(id)),
      substitutes: (saved.substitutes || []).filter(id => eligibleIds.has(id)),
      positions: saved.positions || {}, captainId: saved.captainId || "",
      specialistId: saved.specialistId || "", formation: saved.formation || ""
    })
    setShowLineup(true)
  }
  const setLineupRole = (playerId, role) => setLineup(current => {
    const starters = current.starters.filter(id => id !== playerId)
    const substitutes = current.substitutes.filter(id => id !== playerId)
    if (role === "starter" && starters.length >= matchRules.starters) {
      setActionError(`Only ${matchRules.starters} starting players are allowed for ${sport.name}.`)
      return current
    }
    return { ...current, starters: role === "starter" ? [...starters, playerId] : starters, substitutes: role === "substitute" ? [...substitutes, playerId] : substitutes }
  })
  const saveLineup = async () => {
    setSaving(true); setActionError("")
    try {
      await updateFixture(selected.id, { lineup: { ...lineup, publishedAt: new Date().toISOString() } })
      setShowLineup(false)
    } catch (error) { setActionError(error?.message || "The lineup could not be saved.") }
    finally { setSaving(false) }
  }
  const playerName = player => player?.name || `${player?.firstName || ""} ${player?.lastName || ""}`.trim() || player?.username || "Unknown player"
  const eventLabel = type => type?.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") || "Event"
  const addMatchEvent = async event => {
    event.preventDefault()
    if (!eventDraft.type) return
    const record = { ...eventDraft, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`, createdAt: new Date().toISOString() }
    setSaving(true); setActionError("")
    try {
      await updateFixture(selected.id, { matchEvents: [...(selected.matchEvents || []), record] })
      setEventDraft({ type: "", playerId: "", secondaryPlayerId: "", minute: "", value: "", notes: "" })
      setShowEvent(false)
    } catch (error) { setActionError(error?.message || "The match event could not be saved.") }
    finally { setSaving(false) }
  }
  const removeMatchEvent = async eventId => {
    if (!window.confirm("Delete this match event?")) return
    setSaving(true); setActionError("")
    try { await updateFixture(selected.id, { matchEvents: (selected.matchEvents || []).filter(item => item.id !== eventId) }) }
    catch (error) { setActionError(error?.message || "The match event could not be deleted.") }
    finally { setSaving(false) }
  }
  const shareTeamSheet = async () => {
    const lineupData = selected?.lineup || {}
    const text = [
      `${selectedTeam?.name || "Team"} vs ${selected?.opponent || "Opponent"}`,
      [selected?.date, selected?.time, selected?.venue].filter(Boolean).join(" · "),
      lineupData.formation ? `Setup: ${lineupData.formation}` : "",
      "", "STARTERS",
      ...(lineupData.starters || []).map((id, index) => `${index + 1}. ${playerName(teamPlayers.find(player => player.id === id))}${lineupData.positions?.[id] ? ` — ${lineupData.positions[id]}` : ""}${lineupData.captainId === id ? " (C)" : ""}`),
      "", "SUBSTITUTES",
      ...(lineupData.substitutes || []).map((id, index) => `${index + 1}. ${playerName(teamPlayers.find(player => player.id === id))}${lineupData.positions?.[id] ? ` — ${lineupData.positions[id]}` : ""}`)
    ].filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n")
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) }
    catch { setActionError("Copying is blocked by this browser. Use Print team sheet instead.") }
  }
  const setVotingOpen = async open => {
    setSaving(true); setActionError("")
    try { await updateFixture(selected.id, { potmVoting: { ...(selected.potmVoting || {}), open, openedAt: open ? new Date().toISOString() : selected.potmVoting?.openedAt || "", closedAt: open ? "" : new Date().toISOString() } }) }
    catch (error) { setActionError(error?.message || "Voting settings could not be saved.") }
    finally { setSaving(false) }
  }
  const submitPotmVote = async () => {
    if (!canVote || !voterKey || !potmChoice || existingVote) return
    setSaving(true); setActionError("")
    try { await updateFixture(selected.id, { potmVotes: { ...(selected.potmVotes || {}), [voterKey]: { playerId: potmChoice, votedAt: new Date().toISOString(), voterRole: userRole } } }) }
    catch (error) { setActionError(error?.message || "Your vote could not be saved.") }
    finally { setSaving(false) }
  }
  const openFinalise = () => {
    setMatchNotes(selected?.matchNotes || "")
    setMatchAttendance(Object.fromEntries((selected?.squadPlayerIds || []).map(id => [id, selected?.matchAttendance?.[id] || ""])))
    setOverrideWinnerId(selected?.potmWinnerId || getVoteWinner(selected?.potmVotes) || "")
    setShowFinalise(true)
  }
  const finaliseMatch = async event => {
    event.preventDefault()
    if (!Number.isInteger(Number(selected.homeScore)) || !Number.isInteger(Number(selected.awayScore))) return setActionError("Enter and publish the final score before finalising the match.")
    if (selected.potmVoting?.open) return setActionError("Close player-of-the-match voting before finalising.")
    if ((selected.squadPlayerIds || []).some(id => !matchAttendance[id])) return setActionError("Review attendance for every squad player before finalising.")
    const calculatedWinner = getVoteWinner(selected.potmVotes)
    const winnerId = isAdmin && overrideWinnerId ? overrideWinnerId : calculatedWinner
    setSaving(true); setActionError("")
    try {
      await updateFixture(selected.id, { matchAttendance, matchNotes, potmWinnerId: winnerId, potmPublishedAt: winnerId ? new Date().toISOString() : "", matchLocked: true, matchLockedAt: new Date().toISOString(), status: "Completed", resultPublishedAt: new Date().toISOString(), finalisedAt: new Date().toISOString() })
      setShowFinalise(false)
    } catch (error) { setActionError(error?.message || "The match could not be finalised.") }
    finally { setSaving(false) }
  }
  const reopenMatch = async () => {
    if (!isAdmin || !window.confirm("Reopen this finalised match for editing?")) return
    setSaving(true); setActionError("")
    try { await updateFixture(selected.id, { matchLocked:false, reopenedAt:new Date().toISOString(), reopenedBy:currentUser || currentUserProfile?.username || "admin" }) }
    catch (error) { setActionError(error?.message || "The match could not be reopened.") }
    finally { setSaving(false) }
  }
  const saveScore = async event => {
    event.preventDefault()
    const home = Number(score.home)
    const away = Number(score.away)
    if (!Number.isInteger(home) || home < 0 || !Number.isInteger(away) || away < 0) return
    const teamScore = selected.homeAway === "Away" ? away : home
    const opponentScore = selected.homeAway === "Away" ? home : away
    const result = teamScore > opponentScore ? "Win" : teamScore < opponentScore ? "Loss" : "Draw"
    setSaving(true)
    setActionError("")
    try {
      await updateFixture(selected.id, { homeScore: home, awayScore: away, score: `${home} - ${away}`, result, scoreDraftSavedAt: new Date().toISOString() })
      setShowScore(false)
    } catch (error) { setActionError(error?.message || "The result could not be published.") }
    finally { setSaving(false) }
  }

  return <div className="match-hub-page min-h-screen p-4 md:p-8"><div className="max-w-7xl mx-auto space-y-6">
    <header className="match-hub-head"><div><span className="eyebrow">Club competition centre</span><h1>Match Day Hub</h1><p>Fixtures, match squads and results in one place.</p></div>{canManage && <button onClick={openNew}><Plus size={17}/> Add fixture</button>}</header>
    {actionError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{actionError}</div>}
    <div className="match-hub-toolbar"><div className="match-tabs"><button className={tab === "upcoming" ? "active" : ""} onClick={() => setTab("upcoming")}>Upcoming</button><button className={tab === "results" ? "active" : ""} onClick={() => setTab("results")}>Results</button></div><select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}><option value="all">All club teams</option>{clubTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
    <div className="match-hub-layout"><section className="match-list">{visible.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={selected?.id === item.id ? "active" : ""}><time><strong>{item.date ? new Date(`${item.date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit" }) : "—"}</strong><span>{item.date ? new Date(`${item.date}T00:00:00`).toLocaleDateString("en-GB", { month: "short" }) : "TBC"}</span></time><div><small>{item.teamName || clubTeams.find(team => team.id === (item.teamId || item.team))?.name || "Team"}</small><h3>{item.homeAway === "Away" ? `${item.opponent} vs ${item.teamName || "Team"}` : `${item.teamName || "Team"} vs ${item.opponent}`}</h3><p>{[item.time, item.competition].filter(Boolean).join(" · ") || "Details not set"}</p></div>{item.status === "Completed" && <b>{item.score || item.result || "Result"}</b>}</button>)}{!visible.length && <div className="match-empty"><Trophy size={30}/><strong>No {tab} matches</strong><span>{canManage ? "Add a fixture for one of the club’s teams." : "There are no matches to show yet."}</span></div>}</section>
      <aside className="match-detail">{selected ? <><div className="match-detail-banner"><span>{selected.homeAway || "Match"}</span><h2>{selected.teamName || selectedTeam?.name || "Team"}<i>vs</i>{selected.opponent}</h2>{selected.status === "Completed" ? <strong className="match-final-score">{selected.score || `${selected.homeScore} - ${selected.awayScore}`} <small>{selected.result}</small></strong> : <p>{selected.competition || "Fixture"}</p>}</div><div className="match-facts"><div><CalendarDays/><span>Date<strong>{selected.date ? new Date(`${selected.date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "TBC"}</strong></span></div><div><Clock/><span>Kick-off<strong>{selected.time || "TBC"}</strong></span></div><div><MapPin/><span>Venue<strong>{selected.venue || "Not set"}</strong></span></div><div><Users/><span>Game-day squad<strong>{selectedSquad.length} selected</strong></span></div></div>
        {canManage && selected.squadPublishedAt && <div className="availability-settings"><label><span>Response deadline</span><input type="datetime-local" value={deadlineDraft} disabled={selected.availabilityLocked} onChange={event => setDeadlineDraft(event.target.value)}/></label><div><span className={selected.availabilityLocked ? "locked" : "open"}>{selected.availabilityLocked ? "Responses locked" : "Responses open"}</span>{selected.availabilityLocked ? <button disabled={saving} onClick={() => saveAvailabilitySettings(false)}>Reopen responses</button> : <><button disabled={saving} onClick={() => saveAvailabilitySettings(false)}>Save deadline</button><button className="lock" disabled={saving || !deadlineDraft} onClick={() => saveAvailabilitySettings(true)}>Lock responses</button></>}</div></div>}
        {canManage && selected.squadPublishedAt && <section className="availability-dashboard"><header><div><h3>Availability dashboard</h3><p>{selected.availabilityDeadline ? `Responses due ${new Date(selected.availabilityDeadline).toLocaleString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}` : "Choose a response deadline above"}</p></div><button disabled={saving || selected.availabilityLocked || !pendingPlayerIds.length} onClick={() => sendReminders(pendingPlayerIds)}><Bell size={14}/> Remind pending ({pendingPlayerIds.length})</button></header><div className="availability-metrics"><span><strong>{availabilitySummary.available}</strong>Available</span><span><strong>{availabilitySummary.pending}</strong>Pending</span><span><strong>{availabilitySummary.unavailable}</strong>Unavailable</span><span><strong>{availabilitySummary.medical}</strong>Injury / absence</span></div><div className="availability-roster">{dashboardPlayerIds.map(id => { const player=teamPlayers.find(item=>item.id===id); if(!player) return null; const medical=medicallyUnavailableIds.has(id); const response=selected.availabilityResponses?.[id]; const status=medical?"medical":response?.status||"pending"; const reminder=selected.availabilityReminders?.[id]; return <div key={id}><span className={`availability-dot ${status}`}/><div><strong>{player.name||`${player.firstName||""} ${player.lastName||""}`.trim()||player.username}</strong><small>{medical?"Injury or absence active":response?.status==="available"?`Available · ${response.respondedAt?new Date(response.respondedAt).toLocaleString("en-GB"):"responded"}`:response?.status==="unavailable"?"Unavailable":reminder?.sentAt?`Reminder sent ${new Date(reminder.sentAt).toLocaleString("en-GB")}`:"Awaiting response"}</small></div>{status==="pending"&&!selected.availabilityLocked&&<button disabled={saving} onClick={()=>sendReminders([id])}><Bell size={13}/> Remind</button>}</div>})}</div></section>}
        {(userRole === "player" || userRole === "guardian") && <>{hasActiveReminder && !selected.availabilityLocked && <div className="availability-reminder"><Bell size={18}/><div><strong>Availability response needed</strong><span>Your coach sent a reminder for this match.</span></div></div>}<div className={`player-squad-status ${playerSelected ? "selected" : ""}`}><Users size={20}/><div><strong>{selected.squadPublishedAt ? (playerSelected ? (userRole === "guardian" ? "Your child is in the game-day squad" : "You are in the game-day squad") : myAvailability === "unavailable" ? "Availability was marked as unavailable" : (userRole === "guardian" ? "Your child is not in this squad" : "You are not in this squad")) : "Squad not announced yet"}</strong><span>{medicallyUnavailableIds.has(currentPlayerId) ? "Selection is blocked while an injury or absence is active." : selected.availabilityLocked ? "The coach has locked availability responses for this match." : selected.squadPublishedAt ? (playerInvited ? "Please answer the availability poll below." : "Speak to the coach if you have questions.") : "The coach is still making the selection."}</span></div></div>{playerInvited && !selected.availabilityLocked && !medicallyUnavailableIds.has(currentPlayerId) && selected.status !== "Completed" && <div className="availability-poll"><div><strong>{userRole === "guardian" ? "Can your child play in this match?" : "Can you play in this match?"}</strong><span>Your response is sent to the coaching team immediately.</span></div><div><button disabled={saving} className={myAvailability === "available" ? "active available" : ""} onClick={() => respondToAvailability("available")}>Available</button><button disabled={saving} className={myAvailability === "unavailable" ? "active unavailable" : ""} onClick={() => respondToAvailability("unavailable")}>Unavailable</button></div></div>}</>}
        <div className="match-readiness"><h3><ShieldCheck size={17}/> Match preparation</h3><p className={selected.squadPublishedAt ? "" : "muted"}><CheckCircle2/> {selected.squadPublishedAt ? `${selectedSquad.length} players selected for the game-day squad` : "Game-day squad still required"}</p><p className={selected.venue ? "" : "muted"}><CheckCircle2/> Venue details {selected.venue ? "complete" : "still required"}</p><p className={selected.time ? "" : "muted"}><CheckCircle2/> Kick-off time {selected.time ? "complete" : "still required"}</p></div>
        {selectedSquad.length > 0 && <div className="selected-squad-preview"><h3>Selected squad</h3><div>{selectedSquad.map(player => { const response = selected.availabilityResponses?.[player.id]?.status || "pending"; return <span key={player.id} className={`response-${response}`}>{player.name || `${player.firstName || ""} ${player.lastName || ""}`.trim() || player.username}<small>{response}</small></span> })}</div></div>}
        {selected.lineup?.publishedAt && <section className="match-team-sheet" id="match-team-sheet"><header><div><small>{sport.name} team sheet</small><h3>{selectedTeam?.name} vs {selected.opponent}</h3><p>{[selected.date, selected.time, selected.venue].filter(Boolean).join(" · ")}</p></div><div className="team-sheet-tools"><button onClick={() => window.print()}><Printer size={14}/> Print</button><button onClick={shareTeamSheet}><Clipboard size={14}/> {copied ? "Copied" : "Copy"}</button></div></header>{selected.lineup.formation && <p className="team-sheet-formation">Setup: <strong>{selected.lineup.formation}</strong></p>}<div className="team-sheet-columns"><div><h4>Starting {matchRules.starters}</h4>{selected.lineup.starters.map((id,index)=>{const player=teamPlayers.find(item=>item.id===id);return <p key={id}><b>{index+1}</b><span>{playerName(player)}<small>{selected.lineup.positions?.[id]||player?.position||"Position not set"}</small></span>{selected.lineup.captainId===id&&<em>C</em>}{selected.lineup.specialistId===id&&<em>S</em>}</p>})}</div><div><h4>Substitutes</h4>{selected.lineup.substitutes.map((id,index)=>{const player=teamPlayers.find(item=>item.id===id);return <p key={id}><b>{index+1}</b><span>{playerName(player)}<small>{selected.lineup.positions?.[id]||player?.position||"Position not set"}</small></span></p>})}</div></div></section>}
        {(selected.matchEvents || []).length > 0 && <section className="match-event-timeline"><header><div><h3><Activity size={16}/> Match events</h3><p>{selected.matchEvents.length} recorded</p></div></header>{[...(selected.matchEvents||[])].sort((a,b)=>(Number(a.minute)||999)-(Number(b.minute)||999)).map(item=>{const player=teamPlayers.find(p=>p.id===item.playerId);const secondary=teamPlayers.find(p=>p.id===item.secondaryPlayerId);return <div className="match-event-row" key={item.id}><time>{item.minute ? `${item.minute}′` : "—"}</time><div><strong>{eventLabel(item.type)}{item.value ? ` · ${item.value}` : ""}</strong><span>{[player ? playerName(player) : "Team event", secondary ? `with ${playerName(secondary)}` : "", item.notes].filter(Boolean).join(" · ")}</span></div>{canManage&&!selected.matchLocked&&<button disabled={saving} onClick={()=>removeMatchEvent(item.id)}><Trash2 size={14}/></button>}</div>})}</section>}
        {selected.squadPublishedAt && <section className="potm-panel"><header><div><small>Post-match award</small><h3>Player of the match</h3></div>{canManage&&!selected.matchLocked&&(selected.potmVoting?.open?<button disabled={saving} onClick={()=>setVotingOpen(false)}>Close voting</button>:<button disabled={saving} onClick={()=>setVotingOpen(true)}>{selected.potmVoting?.openedAt?"Reopen voting":"Open voting"}</button>)}</header>{selected.potmPublishedAt&&voteWinnerId?<div className="potm-winner"><Trophy/><div><strong>{playerName(teamPlayers.find(player=>player.id===voteWinnerId))}</strong><span>Published player of the match</span></div></div>:canVote?<div className="potm-vote"><p>{existingVote?`Your vote is recorded for ${playerName(teamPlayers.find(player=>player.id===existingVote))}.`:(userRole==="guardian"?"Vote once on behalf of your linked player account.":"Choose your player of the match. You have one vote.")}</p>{!existingVote&&<div><select value={potmChoice} onChange={e=>setPotmChoice(e.target.value)}><option value="">Choose a player</option>{potmCandidates.map(player=><option key={player.id} value={player.id}>{playerName(player)}</option>)}</select><button disabled={saving||!potmChoice} onClick={submitPotmVote}>Submit vote</button></div>}</div>:<p className="potm-closed">{selected.potmVoting?.open?"Voting is only available to eligible squad players and their linked guardian accounts.":"Voting is currently closed."} {Object.keys(selected.potmVotes||{}).length} vote(s) recorded.</p>}</section>}
        {selected.matchLocked&&<section className="match-finalised"><ShieldCheck/><div><strong>Match finalised and locked</strong><span>{selected.matchNotes||"Result, attendance and match details have been published."}</span></div>{isAdmin&&<button disabled={saving} onClick={reopenMatch}>Reopen match</button>}</section>}
        {canManage && <div className="match-actions"><button disabled={selected.matchLocked} onClick={openSquad}>Select squad</button><button disabled={selected.matchLocked||!selectedSquad.length} onClick={openLineup}>Build lineup</button><button disabled={selected.matchLocked||!selectedSquad.length} onClick={()=>setShowEvent(true)}>Record event</button><button disabled={selected.matchLocked} className="primary" onClick={openScore}>{selected.status === "Completed" ? "Edit score" : "Enter score"}</button><button disabled={selected.matchLocked} onClick={() => openEdit(selected)}>Edit fixture</button>{!selected.matchLocked&&<button className="primary" onClick={openFinalise}>Finalise match</button>}<button disabled={selected.matchLocked} onClick={() => window.confirm("Delete this fixture?") && deleteFixture(selected.id)}>Delete</button></div>}</> : <div className="match-detail-empty">Select a match to view its details.</div>}</aside>
    </div>
    {showForm && <div className="team-modal-backdrop" onMouseDown={() => setShowForm(false)}><form className="team-modal" onSubmit={save} onMouseDown={e => e.stopPropagation()}><header><div><span className="eyebrow">Match Day Hub</span><h2>{editingId ? "Edit fixture" : "Add fixture"}</h2></div><button type="button" onClick={() => setShowForm(false)}><X/></button></header><div className="team-modal-body"><label className="form-field"><span className="form-label">Team <i>Required</i></span><select value={form.teamId} onChange={e => set("teamId", e.target.value)} required><option value="">Choose a team</option>{clubTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><label className="form-field"><span className="form-label">Opponent <i>Required</i></span><input value={form.opponent} onChange={e => set("opponent", e.target.value)} required/></label><div className="grid grid-cols-2 gap-3"><label className="form-field"><span className="form-label">Date</span><input type="date" value={form.date} onChange={e => set("date", e.target.value)}/></label><label className="form-field"><span className="form-label">Time</span><input type="time" value={form.time} onChange={e => set("time", e.target.value)}/></label></div><div className="grid grid-cols-2 gap-3"><label className="form-field"><span className="form-label">Home or away</span><select value={form.homeAway} onChange={e => set("homeAway", e.target.value)}><option>Home</option><option>Away</option></select></label><label className="form-field"><span className="form-label">Competition</span><input value={form.competition} onChange={e => set("competition", e.target.value)}/></label></div><label className="form-field"><span className="form-label">Venue</span><input value={form.venue} onChange={e => set("venue", e.target.value)}/></label></div><footer><button type="button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving…" : "Save fixture"}</button></footer></form></div>}
    {showSquad && <div className="team-modal-backdrop" onMouseDown={() => setShowSquad(false)}><div className="team-modal squad-modal" onMouseDown={e => e.stopPropagation()}><header><div><span className="eyebrow">{selectedTeam?.name} · {sport.name}</span><h2>Select game-day squad</h2><p>{squadIds.filter(id => teamPlayers.find(player => player.id === id && isPlayerEligible(player))).length} of {matchRules.maxSquad} maximum</p></div><button onClick={() => setShowSquad(false)}><X/></button></header><div className="squad-picker">{teamPlayers.map(player => { const checked = squadIds.includes(player.id); const injured = medicallyUnavailableIds.has(player.id); const declined = declinedIds.has(player.id); const disabled = injured || declined; return <div key={player.id} className="squad-picker-row"><label className={`${checked && !disabled ? "selected" : ""} ${disabled ? "disabled" : ""}`}><input type="checkbox" checked={checked && !disabled} disabled={disabled} onChange={() => togglePlayer(player)}/><span>{player.name || `${player.firstName || ""} ${player.lastName || ""}`.trim() || player.username}<small>{injured ? "Injured or absent — unavailable" : declined ? "Player declined availability" : selected?.availabilityResponses?.[player.id]?.status === "available" ? "Confirmed available" : player.position || player.role || "Awaiting selection"}</small></span><CheckCircle2/></label>{declined && !injured && <button type="button" className="reinvite-player" disabled={saving} onClick={() => resetPlayerResponse(player.id)}>Reinvite</button>}</div> })}{!teamPlayers.length && <p className="match-empty">No players are assigned to this team.</p>}</div><footer><button onClick={() => setShowSquad(false)}>Cancel</button><button className="primary" onClick={saveSquad} disabled={saving}>{saving ? "Publishing…" : "Publish squad & poll"}</button></footer></div></div>}
    {showLineup && <div className="team-modal-backdrop" onMouseDown={() => setShowLineup(false)}><div className="team-modal squad-modal" onMouseDown={e => e.stopPropagation()}><header><div><span className="eyebrow">{sport.name} lineup</span><h2>Starting {matchRules.starters} and substitutes</h2><p>{lineup.starters.length}/{matchRules.starters} starters selected</p></div><button onClick={() => setShowLineup(false)}><X/></button></header><div className="team-modal-body"><label className="form-field"><span className="form-label">Formation or setup</span><input value={lineup.formation} onChange={e => setLineup(current => ({...current, formation:e.target.value}))} placeholder="Optional tactical setup"/></label><div className="squad-picker">{selectedSquad.map(player => { const name=player.name||`${player.firstName||""} ${player.lastName||""}`.trim()||player.username; const role=lineup.starters.includes(player.id)?"starter":lineup.substitutes.includes(player.id)?"substitute":""; return <div className="squad-picker-row" key={player.id}><div className="w-full rounded-xl border border-slate-200 p-3"><strong>{name}</strong><div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2"><select value={role} onChange={e=>setLineupRole(player.id,e.target.value)}><option value="">Unassigned</option><option value="starter">Starter</option><option value="substitute">Substitute</option></select><select value={lineup.positions[player.id]||""} onChange={e=>setLineup(current=>({...current,positions:{...current.positions,[player.id]:e.target.value}}))}><option value="">Position</option>{matchRules.positions.map(position=><option key={position}>{position}</option>)}</select><label><input type="radio" name="captain" checked={lineup.captainId===player.id} onChange={()=>setLineup(current=>({...current,captainId:player.id}))}/> Captain</label>{matchRules.specialist&&<label><input type="radio" name="specialist" checked={lineup.specialistId===player.id} onChange={()=>setLineup(current=>({...current,specialistId:player.id}))}/> {matchRules.specialist}</label>}</div></div></div>})}</div></div><footer><button onClick={()=>setShowLineup(false)}>Cancel</button><button className="primary" disabled={saving||lineup.starters.length!==matchRules.starters} onClick={saveLineup}>{saving?"Saving…":"Publish lineup"}</button></footer></div></div>}
    {showEvent && <div className="team-modal-backdrop" onMouseDown={()=>setShowEvent(false)}><form className="team-modal" onSubmit={addMatchEvent} onMouseDown={e=>e.stopPropagation()}><header><div><span className="eyebrow">{sport.name} match</span><h2>Record match event</h2></div><button type="button" onClick={()=>setShowEvent(false)}><X/></button></header><div className="team-modal-body"><label className="form-field"><span className="form-label">Event <i>Required</i></span><select required value={eventDraft.type} onChange={e=>setEventDraft(current=>({...current,type:e.target.value}))}><option value="">Choose event</option>{matchRules.events.map(type=><option key={type} value={type}>{eventLabel(type)}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="form-field"><span className="form-label">Player</span><select value={eventDraft.playerId} onChange={e=>setEventDraft(current=>({...current,playerId:e.target.value}))}><option value="">Team event / none</option>{selectedSquad.map(player=><option key={player.id} value={player.id}>{playerName(player)}</option>)}</select></label><label className="form-field"><span className="form-label">Second player</span><select value={eventDraft.secondaryPlayerId} onChange={e=>setEventDraft(current=>({...current,secondaryPlayerId:e.target.value}))}><option value="">None</option>{selectedSquad.map(player=><option key={player.id} value={player.id}>{playerName(player)}</option>)}</select></label></div><div className="grid grid-cols-2 gap-3"><label className="form-field"><span className="form-label">Minute / over</span><input type="number" min="0" value={eventDraft.minute} onChange={e=>setEventDraft(current=>({...current,minute:e.target.value}))}/></label><label className="form-field"><span className="form-label">Value</span><input value={eventDraft.value} onChange={e=>setEventDraft(current=>({...current,value:e.target.value}))} placeholder="Points, runs or detail"/></label></div><label className="form-field"><span className="form-label">Notes</span><textarea rows="3" value={eventDraft.notes} onChange={e=>setEventDraft(current=>({...current,notes:e.target.value}))}/></label></div><footer><button type="button" onClick={()=>setShowEvent(false)}>Cancel</button><button className="primary" disabled={saving}>{saving?"Saving…":"Save event"}</button></footer></form></div>}
    {showFinalise&&<div className="team-modal-backdrop" onMouseDown={()=>setShowFinalise(false)}><form className="team-modal squad-modal finalise-modal" onSubmit={finaliseMatch} onMouseDown={e=>e.stopPropagation()}><header><div><span className="eyebrow">Publish match</span><h2>Review and finalise</h2><p>This locks the score, attendance, events and match details.</p></div><button type="button" onClick={()=>setShowFinalise(false)}><X/></button></header><div className="team-modal-body"><section className="finalise-score-check"><span>Final score</span><strong>{Number.isInteger(Number(selected.homeScore))&&Number.isInteger(Number(selected.awayScore))?`${selected.homeScore} – ${selected.awayScore}`:"Score still required"}</strong></section><fieldset className="finalise-attendance"><legend>Match attendance</legend>{selectedSquad.map(player=><div key={player.id}><strong>{playerName(player)}</strong><select required value={matchAttendance[player.id]||""} onChange={e=>setMatchAttendance(current=>({...current,[player.id]:e.target.value}))}><option value="">Review status</option><option value="attended">Attended</option><option value="absent">Absent</option><option value="injured">Injured</option><option value="unused-substitute">Unused substitute</option></select></div>)}</fieldset><label className="form-field"><span className="form-label">Match notes</span><textarea rows="4" value={matchNotes} onChange={e=>setMatchNotes(e.target.value)} placeholder="Summary, coaching observations or important context"/></label><section className="finalise-potm"><span>Player-of-the-match result</span>{selected.potmVoting?.open?<strong className="text-red-600">Voting must be closed</strong>:isAdmin?<select value={overrideWinnerId} onChange={e=>setOverrideWinnerId(e.target.value)}><option value="">No winner / tied vote</option>{potmCandidates.map(player=><option key={player.id} value={player.id}>{playerName(player)}</option>)}</select>:<strong>{getVoteWinner(selected.potmVotes)?playerName(teamPlayers.find(player=>player.id===getVoteWinner(selected.potmVotes))):"No clear winner"}</strong>}<small>{Object.keys(selected.potmVotes||{}).length} vote(s). Administrators may override the published winner.</small></section></div><footer><button type="button" onClick={()=>setShowFinalise(false)}>Cancel</button><button className="primary" disabled={saving||selected.potmVoting?.open}>{saving?"Publishing…":"Finalise and lock match"}</button></footer></form></div>}
    {showScore && <div className="team-modal-backdrop" onMouseDown={() => setShowScore(false)}><form className="team-modal score-modal" onSubmit={saveScore} onMouseDown={e => e.stopPropagation()}><header><div><span className="eyebrow">Publish result</span><h2>Enter final score</h2></div><button type="button" onClick={() => setShowScore(false)}><X/></button></header><div className="score-entry"><label><span>{selected.homeAway === "Away" ? selected.opponent : selected.teamName || selectedTeam?.name}</span><input type="number" min="0" step="1" required value={score.home} onChange={e => setScore(current => ({ ...current, home: e.target.value }))}/><small>Home</small></label><b>–</b><label><span>{selected.homeAway === "Away" ? selected.teamName || selectedTeam?.name : selected.opponent}</span><input type="number" min="0" step="1" required value={score.away} onChange={e => setScore(current => ({ ...current, away: e.target.value }))}/><small>Away</small></label></div><p className="score-note">Publishing marks this fixture as completed. The result will update immediately for coaches and players.</p><footer><button type="button" onClick={() => setShowScore(false)}>Cancel</button><button type="submit" className="primary" disabled={saving}>{saving ? "Publishing…" : "Publish result"}</button></footer></form></div>}
  </div></div>
}
