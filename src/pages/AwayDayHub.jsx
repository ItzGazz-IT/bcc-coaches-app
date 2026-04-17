import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, Bus, CalendarDays, CarFront, CheckCircle2, ClipboardCheck, MapPin, Plus, ShieldCheck, Users, XCircle } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { addDoc, collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore"
import { db } from "../firebase/config"

const isDiv1Team = (team) => team === "Div 1" || team === "Others"

const getTeamLabel = (team) => {
  if (team === "Others") return "Div 1"
  return team
}

const isCoachUser = (role) => role === "coach" || role === "super-admin"

const getPlayerName = (player) => `${player?.firstName || ""} ${player?.lastName || ""}`.trim()

const parseSeatCount = (value) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

const parseNonNegativeInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

const getKickoffDateTime = (date, time) => {
  if (!date) return null
  const kickoff = new Date(`${date}T${time || "00:00"}`)
  if (Number.isNaN(kickoff.getTime())) return null
  return kickoff
}

const getSubmissionState = (game) => {
  if (!game) {
    return {
      isLocked: false,
      reason: "Open",
      cutoff: null
    }
  }

  const manualLock = Boolean(game.submissionsLocked)
  const minutes = parseNonNegativeInt(game.lockMinutesBeforeKickoff, 90)
  const kickoff = getKickoffDateTime(game.date, game.time)
  const cutoff = kickoff ? new Date(kickoff.getTime() - (minutes * 60 * 1000)) : null
  const autoLock = cutoff ? Date.now() >= cutoff.getTime() : false

  if (manualLock) {
    return {
      isLocked: true,
      reason: "Locked by coach",
      cutoff
    }
  }

  if (autoLock) {
    return {
      isLocked: true,
      reason: "Auto-locked before kickoff",
      cutoff
    }
  }

  return {
    isLocked: false,
    reason: "Open",
    cutoff
  }
}

const formatCountdown = (milliseconds) => {
  if (milliseconds <= 0) return "00:00:00"
  const totalSeconds = Math.floor(milliseconds / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

const emptyLineup = {
  formation: "4-3-3",
  starters: [],
  bench: [],
  notes: "",
  publishedAt: null,
  publishedBy: null
}

function AwayDayHub() {
  const { players, fixtures, userRole, currentPlayerId, currentUser } = useApp()
  const [games, setGames] = useState([])
  const [selectedGameId, setSelectedGameId] = useState("")
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncingFixtures, setSyncingFixtures] = useState(false)
  const [lockMinutesInput, setLockMinutesInput] = useState("90")
  const [message, setMessage] = useState({ type: "", text: "" })
  const creatingFixtureIdsRef = useRef(new Set())
  const [lineupOverrideEnabled, setLineupOverrideEnabled] = useState(false)
  const [nowMs, setNowMs] = useState(Date.now())

  const [newGame, setNewGame] = useState({
    title: "",
    opponent: "",
    date: "",
    time: "",
    meetingTime: "",
    meetingPoint: "",
    venue: "",
    team: "First Team",
    notes: ""
  })

  const [offerForm, setOfferForm] = useState({ seats: "", from: "", notes: "" })
  const [requestForm, setRequestForm] = useState({ seats: "1", pickup: "", notes: "" })
  const [lineupForm, setLineupForm] = useState(emptyLineup)

  useEffect(() => {
    const q = query(collection(db, "awayGames"), orderBy("date", "asc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }))

      setGames(data)

      if (!selectedGameId && data.length > 0) {
        const upcoming = data.find((game) => new Date(game.date) >= new Date(new Date().toDateString()))
        setSelectedGameId((upcoming || data[0]).id)
      }

      if (selectedGameId && !data.some((game) => game.id === selectedGameId)) {
        setSelectedGameId(data[0]?.id || "")
      }
    })

    return () => unsubscribe()
  }, [selectedGameId])

  const selectedGame = useMemo(() => games.find((game) => game.id === selectedGameId) || null, [games, selectedGameId])
  const canManage = isCoachUser(userRole)
  const currentPlayer = useMemo(() => players.find((player) => player.id === currentPlayerId) || null, [players, currentPlayerId])

  const teamPlayers = useMemo(() => {
    if (!selectedGame) return players
    if (selectedGame.team === "All Teams") return players
    if (selectedGame.team === "Div 1") {
      return players.filter((player) => isDiv1Team(player.team))
    }
    return players.filter((player) => player.team === selectedGame.team)
  }, [players, selectedGame])

  useEffect(() => {
    if (!selectedGame || !currentPlayerId) {
      setOfferForm({ seats: "", from: "", notes: "" })
      setRequestForm({ seats: "1", pickup: "", notes: "" })
      return
    }

    const existingOffer = selectedGame.transportOffers?.[currentPlayerId]
    const existingRequest = selectedGame.transportRequests?.[currentPlayerId]

    setOfferForm({
      seats: existingOffer?.seats ? String(existingOffer.seats) : "",
      from: existingOffer?.from || "",
      notes: existingOffer?.notes || ""
    })

    setRequestForm({
      seats: existingRequest?.seats ? String(existingRequest.seats) : "1",
      pickup: existingRequest?.pickup || "",
      notes: existingRequest?.notes || ""
    })
  }, [selectedGame, currentPlayerId])

  useEffect(() => {
    if (!selectedGame) {
      setLineupForm(emptyLineup)
      return
    }
    setLineupForm({
      ...emptyLineup,
      ...selectedGame.lineup,
      starters: selectedGame.lineup?.starters || [],
      bench: selectedGame.lineup?.bench || []
    })
  }, [selectedGame])

  useEffect(() => {
    if (!selectedGame) {
      setLockMinutesInput("90")
      return
    }
    setLockMinutesInput(String(parseNonNegativeInt(selectedGame.lockMinutesBeforeKickoff, 90)))
  }, [selectedGame])

  const setFeedback = (type, text) => {
    setMessage({ type, text })
    window.setTimeout(() => setMessage({ type: "", text: "" }), 3500)
  }

  const syncAwayGamesFromFixtures = async ({ silent = false } = {}) => {
    if (!canManage || fixtures.length === 0) {
      if (!silent) setFeedback("error", "No fixtures available to sync.")
      return { createdCount: 0, attempted: 0 }
    }

    const awayFixtures = fixtures.filter(
      (fixture) => (fixture.homeAway || "").toLowerCase() === "away"
    )

    const missing = awayFixtures.filter(
      (fixture) =>
        !games.some((game) => game.fixtureId === fixture.id) &&
        !creatingFixtureIdsRef.current.has(fixture.id)
    )

    if (missing.length === 0) {
      if (!silent) setFeedback("success", "Sync complete. No new Away fixtures to add.")
      return { createdCount: 0, attempted: 0 }
    }

    setSyncingFixtures(true)
    let createdCount = 0

    for (const fixture of missing) {
      creatingFixtureIdsRef.current.add(fixture.id)
      try {
        await addDoc(collection(db, "awayGames"), {
          fixtureId: fixture.id,
          title: `${getTeamLabel(fixture.team || "Team")} vs ${fixture.opponent}`,
          opponent: fixture.opponent || "",
          date: fixture.date || "",
          time: fixture.time || "",
          meetingTime: "",
          meetingPoint: "",
          venue: fixture.venue || "",
          team: fixture.team === "Others" ? "Div 1" : (fixture.team || "First Team"),
          notes: fixture.competition ? `Auto-created from fixture (${fixture.competition})` : "Auto-created from fixture",
          attendance: {},
          transportOffers: {},
          transportRequests: {},
          lineup: emptyLineup,
          submissionsLocked: false,
          lockMinutesBeforeKickoff: 90,
          lineupEditOverride: false,
          status: "Open",
          autoCreated: true,
          createdAt: new Date().toISOString(),
          createdBy: currentUser || "coach"
        })
        createdCount += 1
      } catch (error) {
        console.error("Error auto-creating away game from fixture:", error)
      } finally {
        creatingFixtureIdsRef.current.delete(fixture.id)
      }
    }

    setSyncingFixtures(false)
    if (!silent) {
      setFeedback("success", `Sync complete. Added ${createdCount} away game${createdCount === 1 ? "" : "s"}.`)
    }
    return { createdCount, attempted: missing.length }
  }

  useEffect(() => {
    if (!canManage) return
    syncAwayGamesFromFixtures({ silent: true })
  }, [canManage, fixtures, games, currentUser])

  useEffect(() => {
    if (!selectedGame) {
      setLineupOverrideEnabled(false)
      return
    }
    setLineupOverrideEnabled(Boolean(selectedGame.lineupEditOverride))
  }, [selectedGame])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const updateSelectedGame = async (patch) => {
    if (!selectedGame) return
    setSaving(true)
    try {
      await updateDoc(doc(db, "awayGames", selectedGame.id), patch)
      return true
    } catch (error) {
      console.error("Error updating away game:", error)
      setFeedback("error", "Could not save changes. Please try again.")
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleCreateGame = async (event) => {
    event.preventDefault()
    if (!newGame.title || !newGame.date || !newGame.opponent || !newGame.team) {
      setFeedback("error", "Please fill in title, opponent, date, and team.")
      return
    }

    setSaving(true)
    try {
      const created = await addDoc(collection(db, "awayGames"), {
        ...newGame,
        attendance: {},
        transportOffers: {},
        transportRequests: {},
        lineup: emptyLineup,
        submissionsLocked: false,
        lockMinutesBeforeKickoff: 90,
        lineupEditOverride: false,
        status: "Open",
        createdAt: new Date().toISOString(),
        createdBy: currentUser || "coach"
      })

      setSelectedGameId(created.id)
      setShowCreatePanel(false)
      setNewGame({
        title: "",
        opponent: "",
        date: "",
        time: "",
        meetingTime: "",
        meetingPoint: "",
        venue: "",
        team: "First Team",
        notes: ""
      })
      setFeedback("success", "Away game created.")
    } catch (error) {
      console.error("Error creating away game:", error)
      setFeedback("error", "Could not create away game.")
    } finally {
      setSaving(false)
    }
  }

  const handleAttendance = async (status) => {
    if (!selectedGame || !currentPlayerId || !currentPlayer) return
    if (getSubmissionState(selectedGame).isLocked) {
      setFeedback("error", "Submissions are locked for this game.")
      return
    }
    const updated = {
      ...(selectedGame.attendance || {}),
      [currentPlayerId]: {
        status,
        by: getPlayerName(currentPlayer),
        updatedAt: new Date().toISOString()
      }
    }

    const ok = await updateSelectedGame({ attendance: updated })
    if (ok) setFeedback("success", `Attendance marked as ${status}.`)
  }

  const handleSaveOffer = async (event) => {
    event.preventDefault()
    if (!selectedGame || !currentPlayerId || !currentPlayer) return
    if (getSubmissionState(selectedGame).isLocked) {
      setFeedback("error", "Submissions are locked for this game.")
      return
    }

    const seats = parseSeatCount(offerForm.seats)
    if (seats < 1) {
      setFeedback("error", "Please enter at least 1 seat to offer.")
      return
    }

    const updatedOffers = {
      ...(selectedGame.transportOffers || {}),
      [currentPlayerId]: {
        seats,
        from: offerForm.from.trim(),
        notes: offerForm.notes.trim(),
        by: getPlayerName(currentPlayer),
        updatedAt: new Date().toISOString()
      }
    }

    const ok = await updateSelectedGame({ transportOffers: updatedOffers })
    if (ok) setFeedback("success", "Transport offer saved.")
  }

  const handleSaveRequest = async (event) => {
    event.preventDefault()
    if (!selectedGame || !currentPlayerId || !currentPlayer) return
    if (getSubmissionState(selectedGame).isLocked) {
      setFeedback("error", "Submissions are locked for this game.")
      return
    }

    const seats = parseSeatCount(requestForm.seats)
    if (seats < 1) {
      setFeedback("error", "Please request at least 1 seat.")
      return
    }

    const updatedRequests = {
      ...(selectedGame.transportRequests || {}),
      [currentPlayerId]: {
        seats,
        pickup: requestForm.pickup.trim(),
        notes: requestForm.notes.trim(),
        by: getPlayerName(currentPlayer),
        updatedAt: new Date().toISOString()
      }
    }

    const ok = await updateSelectedGame({ transportRequests: updatedRequests })
    if (ok) setFeedback("success", "Transport request saved.")
  }

  const handleClearEntry = async (type) => {
    if (!selectedGame || !currentPlayerId) return
    if (getSubmissionState(selectedGame).isLocked) {
      setFeedback("error", "Submissions are locked for this game.")
      return
    }
    if (type === "offer") {
      const updated = { ...(selectedGame.transportOffers || {}) }
      delete updated[currentPlayerId]
      const ok = await updateSelectedGame({ transportOffers: updated })
      if (ok) setFeedback("success", "Transport offer removed.")
      return
    }

    const updated = { ...(selectedGame.transportRequests || {}) }
    delete updated[currentPlayerId]
    const ok = await updateSelectedGame({ transportRequests: updated })
    if (ok) setFeedback("success", "Transport request removed.")
  }

  const handleToggleLineupPlayer = (section, playerId) => {
    setLineupForm((prev) => {
      const starters = prev.starters.filter((id) => id !== playerId)
      const bench = prev.bench.filter((id) => id !== playerId)
      const target = section === "starters" ? starters : bench

      if (!target.includes(playerId)) {
        target.push(playerId)
      }

      return {
        ...prev,
        starters,
        bench
      }
    })
  }

  const handleSaveLineup = async () => {
    if (!selectedGame || !canManage) return
    const payload = {
      ...lineupForm,
      publishedAt: new Date().toISOString(),
      publishedBy: currentUser || "coach"
    }

    const ok = await updateSelectedGame({ lineup: payload })
    if (ok) setFeedback("success", "Lineup published.")
  }

  const attendanceEntries = selectedGame ? Object.entries(selectedGame.attendance || {}) : []
  const transportOfferEntries = selectedGame ? Object.entries(selectedGame.transportOffers || {}) : []
  const transportRequestEntries = selectedGame ? Object.entries(selectedGame.transportRequests || {}) : []

  const attendanceSummary = attendanceEntries.reduce(
    (acc, [, value]) => {
      const status = value?.status
      if (status === "yes") acc.yes += 1
      if (status === "no") acc.no += 1
      if (status === "maybe") acc.maybe += 1
      return acc
    },
    { yes: 0, no: 0, maybe: 0 }
  )

  const offeredSeats = transportOfferEntries.reduce((sum, [, value]) => sum + parseSeatCount(value?.seats), 0)
  const requestedSeats = transportRequestEntries.reduce((sum, [, value]) => sum + parseSeatCount(value?.seats), 0)
  const seatGap = requestedSeats - offeredSeats
  const submissionState = getSubmissionState(selectedGame)
  const cutoffMs = submissionState.cutoff ? submissionState.cutoff.getTime() : null
  const countdownMs = cutoffMs ? cutoffMs - nowMs : null
  const showPlayerCountdown = userRole === "player" && !submissionState.isLocked && cutoffMs !== null
  const lineupLockedBySubmission = submissionState.isLocked
  const canEditLineup = canManage && (!lineupLockedBySubmission || lineupOverrideEnabled)

  const handleToggleManualLock = async () => {
    if (!selectedGame || !canManage) return
    const nextLocked = !Boolean(selectedGame.submissionsLocked)
    const ok = await updateSelectedGame({
      submissionsLocked: nextLocked,
      lockedAt: nextLocked ? new Date().toISOString() : null,
      lockedBy: nextLocked ? (currentUser || "coach") : null
    })
    if (ok) {
      setFeedback("success", nextLocked ? "Submissions locked by coach." : "Submissions reopened.")
    }
  }

  const handleSaveLockWindow = async () => {
    if (!selectedGame || !canManage) return
    const minutes = parseNonNegativeInt(lockMinutesInput, 90)
    setLockMinutesInput(String(minutes))
    const ok = await updateSelectedGame({ lockMinutesBeforeKickoff: minutes })
    if (ok) {
      setFeedback("success", `Auto-lock window saved (${minutes} min before kickoff).`)
    }
  }

  const handleToggleLineupOverride = async () => {
    if (!selectedGame || !canManage) return
    const nextValue = !lineupOverrideEnabled
    const ok = await updateSelectedGame({ lineupEditOverride: nextValue })
    if (ok) {
      setLineupOverrideEnabled(nextValue)
      setFeedback("success", nextValue ? "Lineup edit override enabled." : "Lineup edit override disabled.")
    }
  }

  if (!userRole) {
    return (
      <div className="flex-1 p-6 bg-slate-100 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={40} />
          <p className="text-slate-700 font-semibold">Please sign in to use Away Day Hub.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-screen bg-[radial-gradient(circle_at_top_left,_#ffedd5,_#fff7ed_35%,_#ecfeff_100%)] p-4 md:p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-r from-orange-600 via-amber-500 to-cyan-600 p-6 text-white shadow-2xl">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -left-8 -bottom-12 h-36 w-36 rounded-full bg-cyan-200/30 blur-2xl" />
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">Away Day Hub</h1>
              <p className="mt-2 text-sm md:text-base text-orange-50/95 max-w-2xl">
                One place for match attendance, travel offers, travel requests, and coach lineup publishing.
              </p>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => syncAwayGamesFromFixtures()}
                  disabled={syncingFixtures}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 font-semibold hover:bg-white/30 transition-colors disabled:opacity-60"
                >
                  {syncingFixtures ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  onClick={() => setShowCreatePanel((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 font-semibold hover:bg-white/30 transition-colors"
                >
                  <Plus size={18} />
                  New Away Game
                </button>
              </div>
            )}
          </div>
        </section>

        {message.text && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
              message.type === "error"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {canManage && showCreatePanel && (
          <form onSubmit={handleCreateGame} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Create Away Game</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                value={newGame.title}
                onChange={(event) => setNewGame((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Game title"
                className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-500"
              />
              <input
                value={newGame.opponent}
                onChange={(event) => setNewGame((prev) => ({ ...prev, opponent: event.target.value }))}
                placeholder="Opponent"
                className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-500"
              />
              <select
                value={newGame.team}
                onChange={(event) => setNewGame((prev) => ({ ...prev, team: event.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-500"
              >
                <option value="First Team">First Team</option>
                <option value="Reserve Team">Reserve Team</option>
                <option value="Div 1">Div 1</option>
                <option value="All Teams">All Teams</option>
              </select>
              <input
                type="date"
                value={newGame.date}
                onChange={(event) => setNewGame((prev) => ({ ...prev, date: event.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-500"
              />
              <input
                type="time"
                value={newGame.time}
                onChange={(event) => setNewGame((prev) => ({ ...prev, time: event.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-500"
              />
              <input
                type="time"
                value={newGame.meetingTime}
                onChange={(event) => setNewGame((prev) => ({ ...prev, meetingTime: event.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-500"
                placeholder="Meeting time"
              />
              <input
                value={newGame.meetingPoint}
                onChange={(event) => setNewGame((prev) => ({ ...prev, meetingPoint: event.target.value }))}
                placeholder="Meeting point"
                className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-500"
              />
              <input
                value={newGame.venue}
                onChange={(event) => setNewGame((prev) => ({ ...prev, venue: event.target.value }))}
                placeholder="Venue"
                className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-500"
              />
              <input
                value={newGame.notes}
                onChange={(event) => setNewGame((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Coach notes"
                className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-500"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 text-white px-4 py-2.5 font-semibold hover:bg-slate-700 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create Game"}
              </button>
            </div>
          </form>
        )}

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <aside className="rounded-2xl border border-slate-200 bg-white shadow-md p-4 xl:col-span-1">
            <h2 className="font-bold text-slate-800 mb-3">Away Games</h2>
            {games.length === 0 ? (
              <p className="text-sm text-slate-500">No games created yet.</p>
            ) : (
              <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                {games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGameId(game.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                      selectedGameId === game.id
                        ? "border-cyan-300 bg-cyan-50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-800">{game.title || `Away vs ${game.opponent}`}</p>
                    <p className="text-xs text-slate-500 mt-1">{game.date} {game.time ? `at ${game.time}` : ""}</p>
                    <p className="text-xs font-semibold text-cyan-700 mt-1">{getTeamLabel(game.team)}</p>
                  </button>
                ))}
              </div>
            )}
          </aside>

          {!selectedGame ? (
            <div className="xl:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-slate-600">
              Select an away game to manage attendance, transport, and lineup.
            </div>
          ) : (
            <div className="xl:col-span-2 space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white shadow-md p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">{selectedGame.title || `Away vs ${selectedGame.opponent}`}</h3>
                    <p className="text-sm text-slate-600 mt-1">Opposition: {selectedGame.opponent}</p>
                    <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold">
                      <span className={`px-2 py-1 rounded-full ${submissionState.isLocked ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {submissionState.isLocked ? "Submissions Locked" : "Submissions Open"}
                      </span>
                      <span className="text-slate-600">{submissionState.reason}</span>
                    </div>
                  </div>
                  <div className="text-sm text-slate-700 space-y-1">
                    <p className="inline-flex items-center gap-2"><CalendarDays size={16} /> {selectedGame.date} {selectedGame.time ? `at ${selectedGame.time}` : ""}</p>
                    <p className="inline-flex items-center gap-2"><MapPin size={16} /> {selectedGame.venue || "Venue not set"}</p>
                    <p className="inline-flex items-center gap-2"><Users size={16} /> {getTeamLabel(selectedGame.team)}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-700 uppercase mb-2">Coach Submission Controls</p>
                    <div className="flex flex-col md:flex-row md:items-end gap-2.5">
                      <div className="w-full md:w-52">
                        <label className="text-xs font-semibold text-slate-600">Auto-lock minutes before kickoff</label>
                        <input
                          type="number"
                          min="0"
                          value={lockMinutesInput}
                          onChange={(event) => setLockMinutesInput(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                        />
                      </div>
                      <button
                        onClick={handleSaveLockWindow}
                        disabled={saving}
                        className="rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-bold hover:bg-slate-700 transition-colors disabled:opacity-60"
                      >
                        Save Auto-lock
                      </button>
                      <button
                        onClick={handleToggleManualLock}
                        disabled={saving}
                        className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${
                          selectedGame.submissionsLocked
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                      >
                        {selectedGame.submissionsLocked ? "Unlock Submissions" : "Lock Submissions Now"}
                      </button>
                    </div>
                    {submissionState.cutoff && (
                      <p className="mt-2 text-xs text-slate-500">
                        Auto-lock cutoff: {submissionState.cutoff.toLocaleString("en-GB")}
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                    <p className="text-xs font-bold text-emerald-700 uppercase">Confirmed</p>
                    <p className="text-2xl font-black text-emerald-700">{attendanceSummary.yes}</p>
                  </div>
                  <div className="rounded-xl bg-cyan-50 border border-cyan-200 p-3">
                    <p className="text-xs font-bold text-cyan-700 uppercase">Offered Seats</p>
                    <p className="text-2xl font-black text-cyan-700">{offeredSeats}</p>
                  </div>
                  <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                    <p className="text-xs font-bold text-orange-700 uppercase">Requested Seats</p>
                    <p className="text-2xl font-black text-orange-700">{requestedSeats}</p>
                  </div>
                  <div className={`rounded-xl border p-3 ${seatGap > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                    <p className="text-xs font-bold uppercase text-slate-700">Seat Balance</p>
                    <p className={`text-2xl font-black ${seatGap > 0 ? "text-red-700" : "text-emerald-700"}`}>
                      {seatGap > 0 ? `-${seatGap}` : `+${Math.abs(seatGap)}`}
                    </p>
                  </div>
                </div>
                {selectedGame.notes && (
                  <p className="mt-4 rounded-xl bg-slate-100 text-slate-700 text-sm px-3 py-2">{selectedGame.notes}</p>
                )}
                {showPlayerCountdown && (
                  <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-indigo-900">Submissions close in:</span>{" "}
                    <span className="font-black text-indigo-700">{formatCountdown(countdownMs)}</span>
                  </div>
                )}
                {userRole === "player" && submissionState.isLocked && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    Submissions are closed for this game.
                  </div>
                )}
              </section>

              {userRole === "player" && currentPlayerId && (
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                    <h4 className="font-bold text-slate-800 mb-3 inline-flex items-center gap-2"><ClipboardCheck size={18} /> Attendance</h4>
                    <p className="text-xs text-slate-500 mb-3">Confirm availability for this away match.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => handleAttendance("yes")} disabled={saving || submissionState.isLocked} className="rounded-lg bg-emerald-100 text-emerald-700 px-2 py-2 text-xs font-bold hover:bg-emerald-200 transition-colors disabled:opacity-50">Yes</button>
                      <button onClick={() => handleAttendance("maybe")} disabled={saving || submissionState.isLocked} className="rounded-lg bg-amber-100 text-amber-700 px-2 py-2 text-xs font-bold hover:bg-amber-200 transition-colors disabled:opacity-50">Maybe</button>
                      <button onClick={() => handleAttendance("no")} disabled={saving || submissionState.isLocked} className="rounded-lg bg-red-100 text-red-700 px-2 py-2 text-xs font-bold hover:bg-red-200 transition-colors disabled:opacity-50">No</button>
                    </div>
                    <p className="text-xs text-slate-600 mt-3">Current: <span className="font-bold uppercase">{selectedGame.attendance?.[currentPlayerId]?.status || "not set"}</span></p>
                    {submissionState.isLocked && <p className="mt-2 text-xs font-semibold text-red-600">Attendance updates are locked.</p>}
                  </div>

                  <form onSubmit={handleSaveOffer} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                    <h4 className="font-bold text-slate-800 mb-3 inline-flex items-center gap-2"><CarFront size={18} /> Offer Transport</h4>
                    <div className="space-y-2">
                      <input
                        type="number"
                        min="1"
                        value={offerForm.seats}
                        onChange={(event) => setOfferForm((prev) => ({ ...prev, seats: event.target.value }))}
                        placeholder="Seats available"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                      />
                      <input
                        value={offerForm.from}
                        onChange={(event) => setOfferForm((prev) => ({ ...prev, from: event.target.value }))}
                        placeholder="Leaving from"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                      />
                      <input
                        value={offerForm.notes}
                        onChange={(event) => setOfferForm((prev) => ({ ...prev, notes: event.target.value }))}
                        placeholder="Notes"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="submit" disabled={saving || submissionState.isLocked} className="flex-1 rounded-lg bg-cyan-600 text-white px-3 py-2 text-xs font-bold hover:bg-cyan-700 transition-colors disabled:opacity-50">Save Offer</button>
                      <button type="button" onClick={() => handleClearEntry("offer")} disabled={saving || submissionState.isLocked} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">Clear</button>
                    </div>
                  </form>

                  <form onSubmit={handleSaveRequest} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                    <h4 className="font-bold text-slate-800 mb-3 inline-flex items-center gap-2"><Bus size={18} /> Request Transport</h4>
                    <div className="space-y-2">
                      <input
                        type="number"
                        min="1"
                        value={requestForm.seats}
                        onChange={(event) => setRequestForm((prev) => ({ ...prev, seats: event.target.value }))}
                        placeholder="Seats needed"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
                      />
                      <input
                        value={requestForm.pickup}
                        onChange={(event) => setRequestForm((prev) => ({ ...prev, pickup: event.target.value }))}
                        placeholder="Pickup area"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
                      />
                      <input
                        value={requestForm.notes}
                        onChange={(event) => setRequestForm((prev) => ({ ...prev, notes: event.target.value }))}
                        placeholder="Notes"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button type="submit" disabled={saving || submissionState.isLocked} className="flex-1 rounded-lg bg-orange-500 text-white px-3 py-2 text-xs font-bold hover:bg-orange-600 transition-colors disabled:opacity-50">Save Request</button>
                      <button type="button" onClick={() => handleClearEntry("request")} disabled={saving || submissionState.isLocked} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">Clear</button>
                    </div>
                  </form>
                </section>
              )}

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                  <h4 className="font-bold text-slate-800 mb-3">Transport Offers</h4>
                  {transportOfferEntries.length === 0 ? (
                    <p className="text-sm text-slate-500">No transport offers yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {transportOfferEntries.map(([playerId, value]) => (
                        <div key={playerId} className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                          <p className="font-semibold text-cyan-900">{value?.by || getPlayerName(players.find((player) => player.id === playerId)) || "Player"}</p>
                          <p className="text-xs text-cyan-800">Seats: {value?.seats || 0} {value?.from ? `| From: ${value.from}` : ""}</p>
                          {value?.notes && <p className="text-xs text-cyan-700 mt-1">{value.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                  <h4 className="font-bold text-slate-800 mb-3">Transport Requests</h4>
                  {transportRequestEntries.length === 0 ? (
                    <p className="text-sm text-slate-500">No transport requests yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {transportRequestEntries.map(([playerId, value]) => (
                        <div key={playerId} className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                          <p className="font-semibold text-orange-900">{value?.by || getPlayerName(players.find((player) => player.id === playerId)) || "Player"}</p>
                          <p className="text-xs text-orange-800">Seats: {value?.seats || 0} {value?.pickup ? `| Pickup: ${value.pickup}` : ""}</p>
                          {value?.notes && <p className="text-xs text-orange-700 mt-1">{value.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                <h4 className="font-bold text-slate-800 mb-3 inline-flex items-center gap-2"><ShieldCheck size={18} /> Match Lineup</h4>

                {canManage ? (
                  <>
                    {lineupLockedBySubmission && (
                      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-sm font-semibold text-amber-800">Lineup edits are locked because submissions are locked.</p>
                        <div className="mt-2">
                          <button
                            onClick={handleToggleLineupOverride}
                            disabled={saving}
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${
                              lineupOverrideEnabled
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "bg-amber-600 text-white hover:bg-amber-700"
                            }`}
                          >
                            {lineupOverrideEnabled ? "Override Active (Click to Disable)" : "Enable Override to Edit Lineup"}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <input
                        value={lineupForm.formation}
                        onChange={(event) => setLineupForm((prev) => ({ ...prev, formation: event.target.value }))}
                        placeholder="Formation"
                        disabled={!canEditLineup || saving}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:opacity-50"
                      />
                      <input
                        value={lineupForm.notes || ""}
                        onChange={(event) => setLineupForm((prev) => ({ ...prev, notes: event.target.value }))}
                        placeholder="Lineup notes"
                        disabled={!canEditLineup || saving}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 md:col-span-2 disabled:opacity-50"
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="font-bold text-emerald-800 text-sm mb-2">Starting XI</p>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                          {teamPlayers.map((player) => {
                            const active = lineupForm.starters.includes(player.id)
                            return (
                              <button
                                key={player.id}
                                onClick={() => handleToggleLineupPlayer("starters", player.id)}
                                disabled={!canEditLineup || saving}
                                className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors ${
                                  active ? "bg-emerald-600 text-white" : "bg-white text-slate-700 hover:bg-emerald-100"
                                } disabled:opacity-50`}
                              >
                                {getPlayerName(player)}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                        <p className="font-bold text-indigo-800 text-sm mb-2">Bench</p>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                          {teamPlayers.map((player) => {
                            const active = lineupForm.bench.includes(player.id)
                            return (
                              <button
                                key={`${player.id}-bench`}
                                onClick={() => handleToggleLineupPlayer("bench", player.id)}
                                disabled={!canEditLineup || saving}
                                className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors ${
                                  active ? "bg-indigo-600 text-white" : "bg-white text-slate-700 hover:bg-indigo-100"
                                } disabled:opacity-50`}
                              >
                                {getPlayerName(player)}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveLineup}
                      disabled={saving || !canEditLineup}
                      className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-bold hover:bg-slate-700 transition-colors disabled:opacity-60"
                    >
                      Publish Lineup
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="font-bold text-emerald-800 text-sm mb-2">Starting XI ({selectedGame.lineup?.starters?.length || 0})</p>
                      <div className="space-y-1 text-sm text-emerald-900">
                        {(selectedGame.lineup?.starters || []).length === 0 ? (
                          <p>No lineup published yet.</p>
                        ) : (
                          (selectedGame.lineup?.starters || []).map((id) => {
                            const player = players.find((item) => item.id === id)
                            return <p key={id}>{getPlayerName(player)}</p>
                          })
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                      <p className="font-bold text-indigo-800 text-sm mb-2">Bench ({selectedGame.lineup?.bench?.length || 0})</p>
                      <div className="space-y-1 text-sm text-indigo-900">
                        {(selectedGame.lineup?.bench || []).length === 0 ? (
                          <p>No bench published yet.</p>
                        ) : (
                          (selectedGame.lineup?.bench || []).map((id) => {
                            const player = players.find((item) => item.id === id)
                            return <p key={id}>{getPlayerName(player)}</p>
                          })
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <p><span className="font-bold">Formation:</span> {selectedGame.lineup?.formation || "Not set"}</p>
                      <p><span className="font-bold">Notes:</span> {selectedGame.lineup?.notes || "No notes"}</p>
                    </div>
                  </div>
                )}
              </section>

              {canManage && (
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                  <h4 className="font-bold text-slate-800 mb-3">Team Response Tracker</h4>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {teamPlayers.map((player) => {
                      const attendanceStatus = selectedGame.attendance?.[player.id]?.status
                      const hasOffer = !!selectedGame.transportOffers?.[player.id]
                      const hasRequest = !!selectedGame.transportRequests?.[player.id]

                      return (
                        <div key={player.id} className="rounded-xl border border-slate-200 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800">{getPlayerName(player)}</p>
                            <p className="text-xs text-slate-500">{getTeamLabel(player.team)}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span
                              className={`px-2 py-1 rounded-full font-bold ${
                                attendanceStatus === "yes"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : attendanceStatus === "no"
                                  ? "bg-red-100 text-red-700"
                                  : attendanceStatus === "maybe"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {attendanceStatus || "No attendance"}
                            </span>
                            <span className={`px-2 py-1 rounded-full font-bold ${hasOffer ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>
                              {hasOffer ? "Offering lift" : "No offer"}
                            </span>
                            <span className={`px-2 py-1 rounded-full font-bold ${hasRequest ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                              {hasRequest ? "Needs lift" : "No request"}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </section>

        {selectedGame && !canManage && !currentPlayerId && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 inline-flex items-center gap-2">
            <XCircle size={16} />
            This account is not linked to a player profile, so only read-only data is available.
          </div>
        )}

        {selectedGame && selectedGame.meetingPoint && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm text-slate-700 inline-flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              Meeting at <span className="font-bold">{selectedGame.meetingPoint}</span>
              {selectedGame.meetingTime ? ` at ${selectedGame.meetingTime}` : ""}
            </p>
            <p className="text-xs text-slate-500">Keep your attendance and transport details updated before match day.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AwayDayHub