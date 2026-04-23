import { useEffect, useMemo, useState } from "react"
import { CalendarDays, CarFront, CheckCircle2, Home, MapPin, Users } from "lucide-react"
import { collection, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from "firebase/firestore"
import { db } from "../firebase/config"
import { useApp } from "../contexts/AppContext"

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

const getTeamLabel = (timeValue, fallbackTeam = "") => {
  const teamId = getTeamIdFromKickoffTime(timeValue, fallbackTeam)
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

const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ").toUpperCase()

const buildGameKey = ({ date, time, opponent, team }) => {
  const teamId = getTeamIdFromKickoffTime(time, team)
  return [date || "", normalizeText(opponent || ""), time || "", teamId].join("|")
}

const getPlayerSelectionStatus = (lineup, playerId) => {
  if (!lineup || !playerId) return "Not selected"
  if ((lineup.starters || []).includes(playerId)) return "Starting XI"
  if ((lineup.bench || []).includes(playerId)) return "Bench"
  return "Not selected"
}

const getGameLineups = (game) => {
  const savedLineups = game?.lineups || {}
  const fallback = game?.lineup || {}
  return {
    firstTeam: {
      starters: savedLineups.firstTeam?.starters || fallback.starters || [],
      bench: savedLineups.firstTeam?.bench || fallback.bench || []
    },
    reserveTeam: {
      starters: savedLineups.reserveTeam?.starters || [],
      bench: savedLineups.reserveTeam?.bench || []
    }
  }
}

const getSelectedAwayGameMeta = (awayGame, playerId) => {
  if (!awayGame || !playerId) return null
  const lineups = getGameLineups(awayGame)

  const firstStatus = getPlayerSelectionStatus(lineups.firstTeam, playerId)
  if (firstStatus !== "Not selected") {
    return { teamId: "firstTeam", teamLabel: "First Team", roleLabel: firstStatus }
  }

  const reserveStatus = getPlayerSelectionStatus(lineups.reserveTeam, playerId)
  if (reserveStatus !== "Not selected") {
    return { teamId: "reserveTeam", teamLabel: "Reserve Team", roleLabel: reserveStatus }
  }

  return null
}

export default function GameDayHub() {
  const { userRole, currentPlayerId, fixtures, currentUser } = useApp()
  const [homePlans, setHomePlans] = useState([])
  const [awayGames, setAwayGames] = useState([])
  const [selectedFixtureId, setSelectedFixtureId] = useState("")
  const [saving, setSaving] = useState(false)
  const [offerForm, setOfferForm] = useState({ seats: "", from: "", notes: "" })
  const [requestForm, setRequestForm] = useState({ seats: "1", pickup: "", notes: "" })
  const [message, setMessage] = useState({ type: "", text: "" })

  const setFeedback = (type, text) => {
    setMessage({ type, text })
    window.setTimeout(() => setMessage({ type: "", text: "" }), 3500)
  }

  useEffect(() => {
    const q = query(collection(db, "homeDayPlans"), orderBy("fixtureDate", "asc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHomePlans(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const q = query(collection(db, "awayGames"), orderBy("date", "asc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAwayGames(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    })

    return () => unsubscribe()
  }, [])

  const playerSelections = useMemo(() => {
    if (userRole !== "player" || !currentPlayerId) return []

    const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]))
    const homePlanByFixtureId = new Map(homePlans.map((plan) => [plan.fixtureId, plan]))
    const awayGameByKey = new Map(awayGames.map((game) => [buildGameKey(game), game]))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const selected = []

    for (const fixture of fixtures) {
      const fixtureDate = parseDateSafe(fixture.date)
      if (fixtureDate && fixtureDate.getTime() < today.getTime()) continue

      const homeAway = String(fixture.homeAway || "").toLowerCase()
      if (homeAway === "home") {
        const plan = homePlanByFixtureId.get(fixture.id)
        const inSquad = (plan?.squadPlayerIds || []).includes(currentPlayerId)
        if (!inSquad) continue

        selected.push({
          fixture,
          type: "home",
          homePlan: plan,
          awayGame: null,
          awayMeta: null
        })
      }

      if (homeAway === "away") {
        const awayGame = awayGameByKey.get(buildGameKey(fixture))
        const awayMeta = getSelectedAwayGameMeta(awayGame, currentPlayerId)
        if (!awayMeta) continue

        selected.push({
          fixture,
          type: "away",
          homePlan: null,
          awayGame,
          awayMeta
        })
      }
    }

    return selected.sort((a, b) => {
      const aDate = parseDateSafe(a.fixture?.date)?.getTime() || 0
      const bDate = parseDateSafe(b.fixture?.date)?.getTime() || 0
      return aDate - bDate
    }).map((item) => ({ ...item, fixture: fixtureById.get(item.fixture.id) || item.fixture }))
  }, [userRole, currentPlayerId, fixtures, homePlans, awayGames])

  useEffect(() => {
    if (!playerSelections.length) {
      setSelectedFixtureId("")
      return
    }

    if (!selectedFixtureId || !playerSelections.some((item) => item.fixture.id === selectedFixtureId)) {
      setSelectedFixtureId(playerSelections[0].fixture.id)
    }
  }, [playerSelections, selectedFixtureId])

  const selectedItem = useMemo(
    () => playerSelections.find((item) => item.fixture.id === selectedFixtureId) || null,
    [playerSelections, selectedFixtureId]
  )

  const selectedFixture = selectedItem?.fixture || null
  const selectedType = selectedItem?.type || ""
  const selectedHomePlan = selectedItem?.homePlan || null
  const selectedAwayGame = selectedItem?.awayGame || null
  const selectedAwayMeta = selectedItem?.awayMeta || null

  const homeAvailabilityResponse = useMemo(() => {
    if (!selectedHomePlan || !currentPlayerId) return null
    return selectedHomePlan.playerConfirmations?.[currentPlayerId] || null
  }, [selectedHomePlan, currentPlayerId])

  const awayAttendanceResponse = useMemo(() => {
    if (!selectedAwayGame || !currentPlayerId) return null
    return selectedAwayGame.attendance?.[currentPlayerId] || null
  }, [selectedAwayGame, currentPlayerId])

  const awayOfferResponse = useMemo(() => {
    if (!selectedAwayGame || !currentPlayerId) return null
    return selectedAwayGame.transportOffers?.[currentPlayerId] || null
  }, [selectedAwayGame, currentPlayerId])

  const awayRequestResponse = useMemo(() => {
    if (!selectedAwayGame || !currentPlayerId) return null
    return selectedAwayGame.transportRequests?.[currentPlayerId] || null
  }, [selectedAwayGame, currentPlayerId])

  useEffect(() => {
    if (!selectedAwayGame || !currentPlayerId) {
      setOfferForm({ seats: "", from: "", notes: "" })
      setRequestForm({ seats: "1", pickup: "", notes: "" })
      return
    }

    const existingOffer = selectedAwayGame.transportOffers?.[currentPlayerId]
    const existingRequest = selectedAwayGame.transportRequests?.[currentPlayerId]

    setOfferForm({
      seats: existingOffer?.selfManaged ? "" : (existingOffer?.seats ? String(existingOffer.seats) : ""),
      from: existingOffer?.from || "",
      notes: existingOffer?.notes || ""
    })

    setRequestForm({
      seats: existingRequest?.seats ? String(existingRequest.seats) : "1",
      pickup: existingRequest?.pickup || "",
      notes: existingRequest?.notes || ""
    })
  }, [selectedAwayGame, currentPlayerId])

  const saveHomeAvailability = async (availability) => {
    if (!selectedFixture || !selectedHomePlan || !currentPlayerId || saving) return

    setSaving(true)
    try {
      await setDoc(
        doc(db, "homeDayPlans", selectedHomePlan.id),
        {
          fixtureId: selectedFixture.id,
          playerConfirmations: {
            [currentPlayerId]: {
              availability,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser || "player"
            }
          },
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      )

      setFeedback("success", "Home game availability saved.")
    } catch (error) {
      console.error("Failed to save home availability", error)
      setFeedback("error", "Could not save availability right now.")
    } finally {
      setSaving(false)
    }
  }

  const saveAwayAttendance = async (status) => {
    if (!selectedAwayGame || !currentPlayerId || saving) return

    setSaving(true)
    try {
      await updateDoc(doc(db, "awayGames", selectedAwayGame.id), {
        [`attendance.${currentPlayerId}`]: {
          status,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser || "player"
        }
      })

      setFeedback("success", "Away game attendance saved.")
    } catch (error) {
      console.error("Failed to save away attendance", error)
      setFeedback("error", "Could not save attendance right now.")
    } finally {
      setSaving(false)
    }
  }

  const saveTransportOffer = async () => {
    if (!selectedAwayGame || !currentPlayerId || saving) return

    const seats = Number.parseInt(offerForm.seats, 10)
    if (!Number.isFinite(seats) || seats < 1) {
      setFeedback("error", "Please enter a valid number of seats.")
      return
    }

    setSaving(true)
    try {
      await updateDoc(doc(db, "awayGames", selectedAwayGame.id), {
        [`transportOffers.${currentPlayerId}`]: {
          seats,
          from: offerForm.from || "",
          notes: offerForm.notes || "",
          createdAt: new Date().toISOString(),
          createdBy: currentUser || "player",
          selfManaged: false
        },
        [`transportRequests.${currentPlayerId}`]: null
      })
      setFeedback("success", "Transport offer saved.")
    } catch (error) {
      console.error("Failed to save transport offer", error)
      setFeedback("error", "Could not save transport offer.")
    } finally {
      setSaving(false)
    }
  }

  const saveTransportRequest = async () => {
    if (!selectedAwayGame || !currentPlayerId || saving) return

    const seats = Number.parseInt(requestForm.seats, 10)
    if (!Number.isFinite(seats) || seats < 1) {
      setFeedback("error", "Please enter seats needed.")
      return
    }

    setSaving(true)
    try {
      await updateDoc(doc(db, "awayGames", selectedAwayGame.id), {
        [`transportRequests.${currentPlayerId}`]: {
          seats,
          pickup: requestForm.pickup || "",
          notes: requestForm.notes || "",
          createdAt: new Date().toISOString(),
          createdBy: currentUser || "player"
        },
        [`transportOffers.${currentPlayerId}`]: null
      })
      setFeedback("success", "Transport request saved.")
    } catch (error) {
      console.error("Failed to save transport request", error)
      setFeedback("error", "Could not save transport request.")
    } finally {
      setSaving(false)
    }
  }

  const saveOwnTransport = async () => {
    if (!selectedAwayGame || !currentPlayerId || saving) return

    setSaving(true)
    try {
      await updateDoc(doc(db, "awayGames", selectedAwayGame.id), {
        [`transportOffers.${currentPlayerId}`]: {
          seats: 0,
          from: "Own transport arranged",
          notes: "Player confirmed own transport",
          createdAt: new Date().toISOString(),
          createdBy: currentUser || "player",
          selfManaged: true
        },
        [`transportRequests.${currentPlayerId}`]: null
      })

      setFeedback("success", "Own transport noted.")
    } catch (error) {
      console.error("Failed to save own transport", error)
      setFeedback("error", "Could not save own transport status.")
    } finally {
      setSaving(false)
    }
  }

  const isPlayer = userRole === "player"

  if (!isPlayer) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          This page is for players. Coaches should use Home Day Hub and Away Day Hub.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Game Day</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              One place to confirm match availability and transport.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-accent/20 dark:text-accent">
            <Users size={14} />
            Player View
          </span>
        </div>
      </header>

      {message.text ? (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          message.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300"
            : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300"
        }`}>
          {message.text}
        </div>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Selected Fixtures</h2>

        {playerSelections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
            You are not selected in any upcoming fixture yet. Once coaches publish squad selections, your prompts will appear here.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {playerSelections.map((item) => {
              const fixture = item.fixture
              const isActive = fixture.id === selectedFixtureId
              const isAway = item.type === "away"
              return (
                <button
                  key={fixture.id}
                  type="button"
                  onClick={() => setSelectedFixtureId(fixture.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isActive
                      ? "border-primary bg-primary/5 dark:border-accent dark:bg-accent/10"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                      isAway
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    }`}>
                      {isAway ? <CarFront size={12} /> : <Home size={12} />}
                      {isAway ? "Away" : "Home"}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {getTeamLabel(fixture.time, fixture.team)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">vs {fixture.opponent || "Opponent"}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <CalendarDays size={12} /> {formatDateLabel(fixture.date)} at {fixture.time || "TBC"}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {selectedFixture && selectedType === "home" ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Home Match Confirmation</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Confirm your availability for this home game.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { id: "yes", label: "Available", style: "bg-emerald-600 hover:bg-emerald-700" },
              { id: "maybe", label: "Maybe", style: "bg-amber-600 hover:bg-amber-700" },
              { id: "no", label: "Unavailable", style: "bg-rose-600 hover:bg-rose-700" }
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={saving}
                onClick={() => saveHomeAvailability(option.id)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${option.style}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <span className="font-semibold">Current response:</span>{" "}
            {homeAvailabilityResponse?.availability ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 size={14} className="text-emerald-500" />
                {homeAvailabilityResponse.availability.toUpperCase()}
              </span>
            ) : (
              "Not confirmed yet"
            )}
          </div>
        </section>
      ) : null}

      {selectedFixture && selectedType === "away" ? (
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Away Match Confirmation</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Confirm attendance and transport for this away game.
            </p>
            {selectedAwayMeta ? (
              <p className="mt-2 text-xs font-medium text-primary dark:text-accent">
                Selected as {selectedAwayMeta.roleLabel} - {selectedAwayMeta.teamLabel}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">1) Can you attend?</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { id: "yes", label: "Yes", style: "bg-emerald-600 hover:bg-emerald-700" },
                { id: "maybe", label: "Maybe", style: "bg-amber-600 hover:bg-amber-700" },
                { id: "no", label: "No", style: "bg-rose-600 hover:bg-rose-700" }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={saving}
                  onClick={() => saveAwayAttendance(option.id)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${option.style}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Current: {awayAttendanceResponse?.status ? awayAttendanceResponse.status.toUpperCase() : "Not confirmed"}
            </p>
          </div>

          {awayAttendanceResponse?.status !== "no" ? (
            <>
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">2) Transport</h4>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Submit one of these options: offer a lift, request a lift, or mark your own transport as arranged.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Offer lifts</h5>
                    <input
                      value={offerForm.seats}
                      onChange={(event) => setOfferForm((prev) => ({ ...prev, seats: event.target.value }))}
                      type="number"
                      min="1"
                      placeholder="Seats available"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-900"
                    />
                    <input
                      value={offerForm.from}
                      onChange={(event) => setOfferForm((prev) => ({ ...prev, from: event.target.value }))}
                      placeholder="Leaving from"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-900"
                    />
                    <textarea
                      value={offerForm.notes}
                      onChange={(event) => setOfferForm((prev) => ({ ...prev, notes: event.target.value }))}
                      rows={2}
                      placeholder="Notes"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-900"
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={saveTransportOffer}
                      className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                    >
                      Save Lift Offer
                    </button>
                  </div>

                  <div className="space-y-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Request lift</h5>
                    <input
                      value={requestForm.seats}
                      onChange={(event) => setRequestForm((prev) => ({ ...prev, seats: event.target.value }))}
                      type="number"
                      min="1"
                      placeholder="Seats needed"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-900"
                    />
                    <input
                      value={requestForm.pickup}
                      onChange={(event) => setRequestForm((prev) => ({ ...prev, pickup: event.target.value }))}
                      placeholder="Pickup location"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-900"
                    />
                    <textarea
                      value={requestForm.notes}
                      onChange={(event) => setRequestForm((prev) => ({ ...prev, notes: event.target.value }))}
                      rows={2}
                      placeholder="Notes"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-900"
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={saveTransportRequest}
                      className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      Save Lift Request
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={saveOwnTransport}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                >
                  <MapPin size={14} />
                  I have my own transport
                </button>

                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  {awayOfferResponse || awayRequestResponse ? (
                    <span>
                      Transport saved: {awayOfferResponse?.selfManaged ? "Own transport" : awayOfferResponse ? "Offering lifts" : "Lift requested"}
                    </span>
                  ) : (
                    <span>No transport response saved yet.</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Transport is not required because you marked attendance as "No".
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
