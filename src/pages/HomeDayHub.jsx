import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, Save, Shield, Users } from "lucide-react"
import { collection, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore"
import { useApp } from "../contexts/AppContext"
import { db } from "../firebase/config"

const isCoachUser = (role) => role === "coach" || role === "super-admin"
const RESERVE_KICKOFF = "13:45"
const FIRST_TEAM_KICKOFF = "15:30"

const getTeamIdFromKickoffTime = (timeValue, fallbackTeam = "") => {
  if (timeValue === RESERVE_KICKOFF) return "reserve"
  if (timeValue === FIRST_TEAM_KICKOFF) return "first"

  const normalizedTeam = String(fallbackTeam || "").toLowerCase()
  if (normalizedTeam.includes("reserve")) return "reserve"
  if (normalizedTeam.includes("first")) return "first"
  return "other"
}

const getTeamLabel = (fixture) => {
  const teamId = getTeamIdFromKickoffTime(fixture?.time, fixture?.team)
  if (teamId === "reserve") return "Reserve Team"
  if (teamId === "first") return "First Team"
  return "Team"
}

const parseDateSafe = (dateString) => {
  if (!dateString) return null
  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const formatDateLabel = (dateString) => {
  const parsed = parseDateSafe(dateString)
  if (!parsed) return "No date"
  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
}

const sortPlayers = (players) => {
  return [...players].sort((a, b) => {
    const positionA = (a.position || "").toLowerCase()
    const positionB = (b.position || "").toLowerCase()
    if (positionA !== positionB) return positionA.localeCompare(positionB)
    const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase()
    const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase()
    return nameA.localeCompare(nameB)
  })
}

const getPlayerName = (player) => `${player?.firstName || ""} ${player?.lastName || ""}`.trim()

const defaultChecklist = {
  bibsAndCones: false,
  firstAidKit: false,
  waterAndHydration: false,
  matchBalls: false,
  tacticsBoard: false
}

const buildDefaultPlan = (fixture) => ({
  fixtureId: fixture?.id || "",
  fixtureDate: fixture?.date || "",
  fixtureTime: fixture?.time || "",
  opponent: fixture?.opponent || "",
  venue: fixture?.venue || "",
  competition: fixture?.competition || "",
  coachNote: "",
  tacticalFocus: "",
  meetingTime: "",
  arrivalTime: "",
  squadPlayerIds: [],
  starters: [],
  bench: [],
  captainId: "",
  viceCaptainId: "",
  reminders: [],
  checklist: defaultChecklist,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
})

function HomeDayHub() {
  const { players, fixtures, injuries, userRole, currentUser, currentPlayerId } = useApp()
  const canManage = isCoachUser(userRole)

  const [plans, setPlans] = useState([])
  const [selectedFixtureId, setSelectedFixtureId] = useState("")
  const [teamView, setTeamView] = useState("first")
  const [showPastFixtures, setShowPastFixtures] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [saving, setSaving] = useState(false)
  const [savingPlayerResponse, setSavingPlayerResponse] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

  useEffect(() => {
    const q = query(collection(db, "homeDayPlans"), orderBy("fixtureDate", "asc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const planData = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      setPlans(planData)
    })

    return () => unsubscribe()
  }, [])

  const homeFixtures = useMemo(() => {
    const homeOnly = fixtures
      .filter((fixture) => (fixture.homeAway || "").toLowerCase() === "home")
      .filter((fixture) => {
        if (teamView === "all") return true
        return getTeamIdFromKickoffTime(fixture.time, fixture.team) === teamView
      })
      .filter((fixture) => {
        if (canManage || !currentPlayerId) return true
        const fixturePlan = plans.find((plan) => plan.fixtureId === fixture.id)
        return Boolean(fixturePlan && (fixturePlan.squadPlayerIds || []).includes(currentPlayerId))
      })
      .sort((a, b) => {
        const aDate = parseDateSafe(a.date)?.getTime() || 0
        const bDate = parseDateSafe(b.date)?.getTime() || 0
        return aDate - bDate
      })

    if (showPastFixtures) return homeOnly

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return homeOnly.filter((fixture) => {
      const fixtureDate = parseDateSafe(fixture.date)
      if (!fixtureDate) return true
      return fixtureDate.getTime() >= today.getTime()
    })
  }, [fixtures, showPastFixtures, teamView, canManage, currentPlayerId, plans])

  useEffect(() => {
    if (!selectedFixtureId && homeFixtures.length > 0) {
      setSelectedFixtureId(homeFixtures[0].id)
      return
    }

    if (selectedFixtureId && !homeFixtures.some((fixture) => fixture.id === selectedFixtureId)) {
      setSelectedFixtureId(homeFixtures[0]?.id || "")
    }
  }, [selectedFixtureId, homeFixtures])

  const selectedFixture = useMemo(
    () => homeFixtures.find((fixture) => fixture.id === selectedFixtureId) || null,
    [homeFixtures, selectedFixtureId]
  )

  const planForFixture = useMemo(
    () => plans.find((plan) => plan.fixtureId === selectedFixtureId) || null,
    [plans, selectedFixtureId]
  )

  const playerInSelectedSquad = useMemo(() => {
    if (!currentPlayerId || !planForFixture) return false
    return (planForFixture.squadPlayerIds || []).includes(currentPlayerId)
  }, [currentPlayerId, planForFixture])

  const playerAvailabilityResponse = useMemo(() => {
    if (!currentPlayerId || !planForFixture?.playerConfirmations) return null
    return planForFixture.playerConfirmations[currentPlayerId] || null
  }, [currentPlayerId, planForFixture])

  const confirmationSummary = useMemo(() => {
    const squadIds = planForFixture?.squadPlayerIds || []
    const confirmations = planForFixture?.playerConfirmations || {}
    const responded = squadIds.filter((id) => Boolean(confirmations[id]?.availability)).length
    const available = squadIds.filter((id) => confirmations[id]?.availability === "yes").length
    return {
      responded,
      available,
      squad: squadIds.length
    }
  }, [planForFixture])

  const [draft, setDraft] = useState(buildDefaultPlan(null))
  const [coachNoteInput, setCoachNoteInput] = useState("")
  const [tacticalFocusInput, setTacticalFocusInput] = useState("")
  const [remindersInput, setRemindersInput] = useState("")

  useEffect(() => {
    const source = planForFixture || buildDefaultPlan(selectedFixture)
    setDraft({
      ...buildDefaultPlan(selectedFixture),
      ...source,
      checklist: {
        ...defaultChecklist,
        ...(source?.checklist || {})
      },
      squadPlayerIds: source?.squadPlayerIds || [],
      starters: source?.starters || [],
      bench: source?.bench || [],
      reminders: source?.reminders || []
    })

    setCoachNoteInput(source?.coachNote || "")
    setTacticalFocusInput(source?.tacticalFocus || "")
    setRemindersInput((source?.reminders || []).join("\n"))
  }, [planForFixture, selectedFixture])

  const injuryByPlayerId = useMemo(() => {
    const map = new Map()
    for (const injury of injuries) {
      if (!injury?.playerId) continue
      if (String(injury.status || "").toLowerCase() === "recovered") continue
      map.set(injury.playerId, injury)
    }
    return map
  }, [injuries])

  const sortedPlayers = useMemo(() => sortPlayers(players), [players])

  const visiblePlayers = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) return sortedPlayers

    return sortedPlayers.filter((player) => {
      const name = getPlayerName(player).toLowerCase()
      const position = String(player.position || "").toLowerCase()
      return name.includes(normalized) || position.includes(normalized)
    })
  }, [sortedPlayers, searchTerm])

  const squadPlayerSet = useMemo(() => new Set(draft.squadPlayerIds || []), [draft.squadPlayerIds])

  const lineupWarnings = useMemo(() => {
    const warnings = []
    if ((draft.starters || []).length > 11) warnings.push("You have more than 11 starters selected.")
    if ((draft.starters || []).length < 11) warnings.push("Starter list is below 11 players.")
    if ((draft.bench || []).length > 9) warnings.push("Bench has more than 9 players.")
    if (!draft.captainId) warnings.push("Captain is not selected.")
    if (!draft.viceCaptainId) warnings.push("Vice-captain is not selected.")
    return warnings
  }, [draft])

  const setFeedback = (type, text) => {
    setMessage({ type, text })
    window.setTimeout(() => setMessage({ type: "", text: "" }), 3500)
  }

  const toggleSquadPlayer = (playerId) => {
    if (!canManage) return

    const current = new Set(draft.squadPlayerIds || [])
    if (current.has(playerId)) {
      current.delete(playerId)
      setDraft((prev) => ({
        ...prev,
        squadPlayerIds: Array.from(current),
        starters: (prev.starters || []).filter((id) => id !== playerId),
        bench: (prev.bench || []).filter((id) => id !== playerId),
        captainId: prev.captainId === playerId ? "" : prev.captainId,
        viceCaptainId: prev.viceCaptainId === playerId ? "" : prev.viceCaptainId
      }))
      return
    }

    current.add(playerId)
    setDraft((prev) => ({ ...prev, squadPlayerIds: Array.from(current) }))
  }

  const setPlayerRole = (playerId, role) => {
    if (!canManage || !squadPlayerSet.has(playerId)) return

    setDraft((prev) => {
      const starters = new Set(prev.starters || [])
      const bench = new Set(prev.bench || [])

      starters.delete(playerId)
      bench.delete(playerId)

      if (role === "starter") starters.add(playerId)
      if (role === "bench") bench.add(playerId)

      return {
        ...prev,
        starters: Array.from(starters),
        bench: Array.from(bench)
      }
    })
  }

  const autofillSquad = () => {
    if (!canManage) return

    const available = sortedPlayers
      .filter((player) => !injuryByPlayerId.has(player.id))
      .slice(0, 20)
      .map((player) => player.id)

    const starters = available.slice(0, 11)
    const bench = available.slice(11, 20)

    setDraft((prev) => ({
      ...prev,
      squadPlayerIds: available,
      starters,
      bench,
      captainId: prev.captainId && available.includes(prev.captainId) ? prev.captainId : starters[0] || "",
      viceCaptainId: prev.viceCaptainId && available.includes(prev.viceCaptainId) ? prev.viceCaptainId : starters[1] || ""
    }))
  }

  const savePlan = async () => {
    if (!canManage) return
    if (!selectedFixture) {
      setFeedback("error", "Please select a fixture first.")
      return
    }

    const reminders = remindersInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    const payload = {
      ...draft,
      fixtureId: selectedFixture.id,
      fixtureDate: selectedFixture.date || "",
      fixtureTime: selectedFixture.time || "",
      opponent: selectedFixture.opponent || "",
      venue: selectedFixture.venue || "",
      competition: selectedFixture.competition || "",
      coachNote: coachNoteInput.trim(),
      tacticalFocus: tacticalFocusInput.trim(),
      reminders,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser || "coach"
    }

    setSaving(true)
    try {
      await setDoc(doc(db, "homeDayPlans", selectedFixture.id), payload, { merge: true })
      setFeedback("success", "Home day plan saved.")
    } catch (error) {
      console.error("Error saving home day plan:", error)
      setFeedback("error", "Could not save plan. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const savePlayerAvailability = async (availability) => {
    if (!selectedFixture || !currentPlayerId) return

    setSavingPlayerResponse(true)
    try {
      const existingConfirmations = planForFixture?.playerConfirmations || {}
      await setDoc(
        doc(db, "homeDayPlans", selectedFixture.id),
        {
          fixtureId: selectedFixture.id,
          fixtureDate: selectedFixture.date || "",
          fixtureTime: selectedFixture.time || "",
          opponent: selectedFixture.opponent || "",
          playerConfirmations: {
            ...existingConfirmations,
            [currentPlayerId]: {
              availability,
              updatedAt: new Date().toISOString(),
              updatedBy: "player"
            }
          },
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      )
      setFeedback("success", `Availability marked as ${availability}.`)
    } catch (error) {
      console.error("Error saving player availability:", error)
      setFeedback("error", "Could not save your availability. Please try again.")
    } finally {
      setSavingPlayerResponse(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-800">Home Day Hub</h1>
            <p className="text-sm text-gray-600 mt-1">Build your matchday squad, lock key notes, and keep home-game prep in one place.</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 rounded-xl px-3 py-2 border border-blue-100">
            <CalendarDays size={16} className="text-blue-600" />
            {selectedFixture
              ? `${getTeamLabel(selectedFixture)} • ${selectedFixture.opponent || "Opponent"} • ${formatDateLabel(selectedFixture.date)} ${selectedFixture.time || ""}`
              : "Select a home fixture"}
          </div>
        </div>

        {message.text && (
          <div
            className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium ${
              message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide">Fixtures</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPastFixtures((prev) => !prev)}
                  className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {showPastFixtures ? "Hide past" : "Show past"}
                </button>
              </div>
            </div>

            <div className="mb-3 inline-flex w-full bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setTeamView("reserve")}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold ${teamView === "reserve" ? "bg-orange-500 text-white" : "text-gray-700"}`}
              >
                Reserve 13:45
              </button>
              <button
                type="button"
                onClick={() => setTeamView("first")}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold ${teamView === "first" ? "bg-blue-600 text-white" : "text-gray-700"}`}
              >
                First 15:30
              </button>
            </div>

            {homeFixtures.length === 0 ? (
              <p className="text-sm text-gray-600">No home fixtures found.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {homeFixtures.map((fixture) => {
                  const active = fixture.id === selectedFixtureId
                  const hasPlan = plans.some((item) => item.fixtureId === fixture.id)
                  return (
                    <button
                      key={fixture.id}
                      type="button"
                      onClick={() => setSelectedFixtureId(fixture.id)}
                      className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                        active
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-sm font-bold text-gray-800">vs {fixture.opponent || "Opponent"}</p>
                      <p className="text-xs text-gray-600">{formatDateLabel(fixture.date)} {fixture.time || ""}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{getTeamLabel(fixture)}</span>
                        <span className="text-[11px] text-gray-500">{fixture.competition || "Friendly"}</span>
                        {hasPlan && <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">Saved</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow p-4">
            <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide mb-3">Useful Snapshot</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Squad Size</p>
                <p className="text-lg font-black text-gray-800">{draft.squadPlayerIds.length}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Starters</p>
                <p className="text-lg font-black text-gray-800">{draft.starters.length}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Bench</p>
                <p className="text-lg font-black text-gray-800">{draft.bench.length}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-gray-500">Unavailable</p>
                <p className="text-lg font-black text-red-700">{injuryByPlayerId.size}</p>
              </div>
              {canManage && (
                <>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500">Confirmed</p>
                    <p className="text-lg font-black text-emerald-700">{confirmationSummary.responded}/{confirmationSummary.squad}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500">Available Yes</p>
                    <p className="text-lg font-black text-blue-700">{confirmationSummary.available}</p>
                  </div>
                </>
              )}
            </div>

            {lineupWarnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {lineupWarnings.map((warning) => (
                  <p key={warning} className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 border border-amber-100">
                    {warning}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          {!canManage && selectedFixture && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow p-4 md:p-5">
              <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide mb-3">Your Availability Confirmation</h2>

              {playerInSelectedSquad ? (
                <>
                  <p className="text-sm text-gray-700 mb-3">
                    You were selected for this fixture. Please confirm your availability.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingPlayerResponse}
                      onClick={() => savePlayerAvailability("yes")}
                      className="rounded-lg bg-emerald-100 text-emerald-700 px-3 py-2 text-xs font-bold hover:bg-emerald-200 disabled:opacity-60"
                    >
                      Available
                    </button>
                    <button
                      type="button"
                      disabled={savingPlayerResponse}
                      onClick={() => savePlayerAvailability("maybe")}
                      className="rounded-lg bg-amber-100 text-amber-700 px-3 py-2 text-xs font-bold hover:bg-amber-200 disabled:opacity-60"
                    >
                      Maybe
                    </button>
                    <button
                      type="button"
                      disabled={savingPlayerResponse}
                      onClick={() => savePlayerAvailability("no")}
                      className="rounded-lg bg-red-100 text-red-700 px-3 py-2 text-xs font-bold hover:bg-red-200 disabled:opacity-60"
                    >
                      Unavailable
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-gray-600">
                    Current response: <span className="font-bold uppercase">{playerAvailabilityResponse?.availability || "not confirmed"}</span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">You are not selected in the matchday squad for this fixture yet.</p>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide">Matchday Squad</h2>
              {canManage && (
                <button
                  type="button"
                  onClick={autofillSquad}
                  className="inline-flex items-center justify-center gap-2 text-xs font-bold px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  <Users size={14} />
                  Autofill Available 20
                </button>
              )}
            </div>

            <div className="mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search players by name or position..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2 max-h-[430px] overflow-y-auto pr-1">
              {visiblePlayers.map((player) => {
                const inSquad = squadPlayerSet.has(player.id)
                const isStarter = (draft.starters || []).includes(player.id)
                const isBench = (draft.bench || []).includes(player.id)
                const unavailable = injuryByPlayerId.get(player.id)

                return (
                  <div key={player.id} className="rounded-xl border border-gray-200 p-3 bg-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{getPlayerName(player)}</p>
                        <p className="text-xs text-gray-500">{player.position || "No position"}</p>
                        {unavailable && (
                          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-red-700 bg-red-50 border border-red-100 rounded px-2 py-0.5">
                            <AlertTriangle size={12} />
                            {String(unavailable.type || unavailable.status || "Unavailable")}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => toggleSquadPlayer(player.id)}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg ${
                            inSquad
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          } disabled:opacity-60`}
                        >
                          {inSquad ? "In Squad" : "Add Squad"}
                        </button>

                        {inSquad && (
                          <>
                            <button
                              type="button"
                              disabled={!canManage}
                              onClick={() => setPlayerRole(player.id, "starter")}
                              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg ${
                                isStarter ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              } disabled:opacity-60`}
                            >
                              Starter
                            </button>
                            <button
                              type="button"
                              disabled={!canManage}
                              onClick={() => setPlayerRole(player.id, "bench")}
                              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg ${
                                isBench ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              } disabled:opacity-60`}
                            >
                              Bench
                            </button>
                            <button
                              type="button"
                              disabled={!canManage}
                              onClick={() => setPlayerRole(player.id, "none")}
                              className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                            >
                              Squad Only
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow p-4 md:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-gray-600" />
              <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide">Coach Notes & Setup</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Meeting Time</label>
                <input
                  type="time"
                  value={draft.meetingTime || ""}
                  disabled={!canManage}
                  onChange={(event) => setDraft((prev) => ({ ...prev, meetingTime: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Arrival Time</label>
                <input
                  type="time"
                  value={draft.arrivalTime || ""}
                  disabled={!canManage}
                  onChange={(event) => setDraft((prev) => ({ ...prev, arrivalTime: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Captain</label>
                <select
                  value={draft.captainId || ""}
                  disabled={!canManage}
                  onChange={(event) => setDraft((prev) => ({ ...prev, captainId: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-100"
                >
                  <option value="">Select captain</option>
                  {(draft.squadPlayerIds || []).map((playerId) => {
                    const player = players.find((item) => item.id === playerId)
                    return (
                      <option key={playerId} value={playerId}>{getPlayerName(player)}</option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Vice-Captain</label>
                <select
                  value={draft.viceCaptainId || ""}
                  disabled={!canManage}
                  onChange={(event) => setDraft((prev) => ({ ...prev, viceCaptainId: event.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-100"
                >
                  <option value="">Select vice-captain</option>
                  {(draft.squadPlayerIds || []).map((playerId) => {
                    const player = players.find((item) => item.id === playerId)
                    return (
                      <option key={playerId} value={playerId}>{getPlayerName(player)}</option>
                    )
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Coach Note</label>
              <textarea
                value={coachNoteInput}
                disabled={!canManage}
                onChange={(event) => setCoachNoteInput(event.target.value)}
                placeholder="Key message for the squad, matchday priorities, and expectations..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Tactical Focus</label>
              <textarea
                value={tacticalFocusInput}
                disabled={!canManage}
                onChange={(event) => setTacticalFocusInput(event.target.value)}
                placeholder="Example: press on their right side, control second balls, protect half-spaces..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Reminders (one per line)</label>
              <textarea
                value={remindersInput}
                disabled={!canManage}
                onChange={(event) => setRemindersInput(event.target.value)}
                placeholder="Bring own strapping\nArrive 60 mins before kickoff\nSet-piece review at warm-up"
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-100"
              />
            </div>

            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">Matchday Checklist</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(draft.checklist || defaultChecklist).map(([key, checked]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    <input
                      type="checkbox"
                      checked={Boolean(checked)}
                      disabled={!canManage}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          checklist: {
                            ...prev.checklist,
                            [key]: event.target.checked
                          }
                        }))
                      }
                    />
                    {key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (char) => char.toUpperCase())}
                  </label>
                ))}
              </div>
            </div>

            {canManage ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={savePlan}
                  disabled={saving || !selectedFixture}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Home Day Plan"}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-500 inline-flex items-center gap-1">
                <Shield size={14} />
                Read-only view. Only coaches can edit this page.
              </p>
            )}

            {!canManage && remindersInput.trim() && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs font-bold text-blue-700 mb-1 inline-flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  Today&apos;s Reminders
                </p>
                <ul className="text-sm text-blue-900 space-y-1">
                  {remindersInput.split("\n").filter(Boolean).map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomeDayHub
