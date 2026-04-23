import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from "lucide-react"
import { collection, onSnapshot } from "firebase/firestore"
import { useApp } from "../contexts/AppContext"
import { db } from "../firebase/config"

const RESERVE_KICKOFF = "13:45"
const FIRST_TEAM_KICKOFF = "15:30"

const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ").toUpperCase()

const getTeamIdFromKickoffTime = (timeValue, fallbackTeam = "") => {
  if (timeValue === RESERVE_KICKOFF) return "reserve"
  if (timeValue === FIRST_TEAM_KICKOFF) return "first"

  const normalizedTeam = String(fallbackTeam || "").toLowerCase()
  if (normalizedTeam.includes("reserve")) return "reserve"
  if (normalizedTeam.includes("first")) return "first"
  return "other"
}

const getTeamLabel = (timeValue, teamValue) => {
  const teamId = getTeamIdFromKickoffTime(timeValue, teamValue)
  if (teamId === "reserve") return "Reserve Team"
  if (teamId === "first") return "First Team"
  return "Team"
}

const isValidDateKey = (dateValue) => /^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ""))

const getTodayKey = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const isUpcomingFixture = (fixture) => {
  if (!isValidDateKey(fixture?.date)) return true
  return fixture.date >= getTodayKey()
}

const buildFixtureKey = (fixture) => {
  const teamId = getTeamIdFromKickoffTime(fixture?.time, fixture?.team)
  return [
    fixture?.date || "",
    normalizeText(fixture?.opponent || ""),
    fixture?.homeAway || "",
    fixture?.time || "",
    teamId
  ].join("|")
}

const buildAwayKey = (awayGame) => {
  const teamId = getTeamIdFromKickoffTime(awayGame?.time, awayGame?.team)
  return [
    awayGame?.date || "",
    normalizeText(awayGame?.opponent || awayGame?.title || ""),
    "Away",
    awayGame?.time || "",
    teamId
  ].join("|")
}

const getLineupByFixtureTeam = (awayGame, fixtureTeamId) => {
  const lineups = awayGame?.lineups || {}
  if (fixtureTeamId === "reserve") return lineups.reserveTeam || { starters: [], bench: [], isConfirmed: false }
  return lineups.firstTeam || awayGame?.lineup || { starters: [], bench: [], isConfirmed: false }
}

const getPlayerNameById = (players, playerId) => {
  const player = players.find((item) => item.id === playerId)
  if (!player) return "Unknown Player"
  return `${player.firstName || ""} ${player.lastName || ""}`.trim()
}

function DeployReadiness() {
  const { fixtures, players, userRole } = useApp()
  const [homePlans, setHomePlans] = useState([])
  const [awayGames, setAwayGames] = useState([])

  useEffect(() => {
    const unsubHome = onSnapshot(collection(db, "homeDayPlans"), (snapshot) => {
      setHomePlans(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })))
    })

    const unsubAway = onSnapshot(collection(db, "awayGames"), (snapshot) => {
      setAwayGames(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })))
    })

    return () => {
      unsubHome()
      unsubAway()
    }
  }, [])

  const readinessRows = useMemo(() => {
    const upcomingFixtures = fixtures.filter(isUpcomingFixture)
    const homePlanByFixtureId = new Map(homePlans.map((plan) => [plan.fixtureId, plan]))
    const awayByFixtureId = new Map(awayGames.filter((game) => game.fixtureId).map((game) => [game.fixtureId, game]))
    const awayByKey = new Map(awayGames.map((game) => [buildAwayKey(game), game]))

    return upcomingFixtures.map((fixture) => {
      const fixtureTeamId = getTeamIdFromKickoffTime(fixture.time, fixture.team)
      const base = {
        fixture,
        blockers: [],
        warnings: []
      }

      if ((fixture.homeAway || "").toLowerCase() === "home") {
        const plan = homePlanByFixtureId.get(fixture.id)
        if (!plan) {
          base.blockers.push("No home day plan created")
          return base
        }

        const squadIds = plan.squadPlayerIds || []
        if (squadIds.length === 0) {
          base.blockers.push("No players selected in home squad")
        }

        const confirmations = plan.playerConfirmations || {}
        const missing = squadIds.filter((playerId) => !confirmations[playerId]?.availability)
        if (missing.length > 0) {
          base.blockers.push(`${missing.length} selected player(s) missing availability confirmation`)
        }

        return base
      }

      const awayGame = awayByFixtureId.get(fixture.id) || awayByKey.get(buildFixtureKey(fixture))
      if (!awayGame) {
        base.blockers.push("No away day record linked to fixture")
        return base
      }

      const lineup = getLineupByFixtureTeam(awayGame, fixtureTeamId)
      const selectedIds = Array.from(new Set([...(lineup.starters || []), ...(lineup.bench || [])]))

      if (selectedIds.length === 0) {
        base.blockers.push("No players selected in away lineup")
        return base
      }

      if (!lineup.isConfirmed) {
        base.warnings.push("Lineup is still draft")
      }

      const attendance = awayGame.attendance || {}
      const missingAvailability = selectedIds.filter((playerId) => !attendance[playerId]?.status)
      if (missingAvailability.length > 0) {
        base.blockers.push(`${missingAvailability.length} selected player(s) missing availability confirmation`)
      }

      const offers = awayGame.transportOffers || {}
      const requests = awayGame.transportRequests || {}
      const missingTransport = selectedIds.filter((playerId) => {
        const status = attendance[playerId]?.status
        if (status === "no") return false
        return !offers[playerId] && !requests[playerId]
      })

      if (missingTransport.length > 0) {
        const previewNames = missingTransport.slice(0, 3).map((id) => getPlayerNameById(players, id)).join(", ")
        const suffix = missingTransport.length > 3 ? "..." : ""
        base.blockers.push(`${missingTransport.length} selected player(s) missing transport response (${previewNames}${suffix})`)
      }

      return base
    })
  }, [fixtures, homePlans, awayGames, players])

  const summary = useMemo(() => {
    const total = readinessRows.length
    const ready = readinessRows.filter((row) => row.blockers.length === 0).length
    const blocked = readinessRows.filter((row) => row.blockers.length > 0).length
    const warning = readinessRows.filter((row) => row.blockers.length === 0 && row.warnings.length > 0).length

    return { total, ready, blocked, warning }
  }, [readinessRows])

  if (userRole !== "coach" && userRole !== "super-admin") {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 font-semibold">
          This page is only available to coach or super-admin users.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-800">Deploy Readiness</h1>
        <p className="text-sm text-gray-600 mt-1">Operational readiness for upcoming fixtures before go-live.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-gray-500 text-xs">Upcoming Fixtures</p>
          <p className="text-2xl font-black text-gray-800">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-emerald-700 text-xs">Ready</p>
          <p className="text-2xl font-black text-emerald-700">{summary.ready}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-amber-700 text-xs">Warnings</p>
          <p className="text-2xl font-black text-amber-700">{summary.warning}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-red-700 text-xs">Blocked</p>
          <p className="text-2xl font-black text-red-700">{summary.blocked}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow p-4 md:p-5 space-y-3">
        {readinessRows.length === 0 ? (
          <p className="text-sm text-gray-600">No upcoming fixtures found.</p>
        ) : (
          readinessRows.map(({ fixture, blockers, warnings }) => {
            const isBlocked = blockers.length > 0
            const isWarning = !isBlocked && warnings.length > 0
            return (
              <div
                key={fixture.id}
                className={`rounded-xl border p-3 ${
                  isBlocked
                    ? "border-red-200 bg-red-50"
                    : isWarning
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-800">{fixture.homeAway || ""} vs {fixture.opponent || "Opponent"}</p>
                    <p className="text-xs text-gray-600">{fixture.date || "No date"} {fixture.time || ""} • {getTeamLabel(fixture.time, fixture.team)}</p>
                  </div>
                  <div>
                    {isBlocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 rounded px-2 py-1">
                        <AlertTriangle size={12} /> Blocked
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 rounded px-2 py-1">
                        <Clock3 size={12} /> Warning
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 rounded px-2 py-1">
                        <CheckCircle2 size={12} /> Ready
                      </span>
                    )}
                  </div>
                </div>

                {blockers.length > 0 && (
                  <ul className="mt-2 text-xs text-red-800 space-y-1">
                    {blockers.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                )}

                {warnings.length > 0 && (
                  <ul className="mt-2 text-xs text-amber-800 space-y-1">
                    {warnings.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-bold inline-flex items-center gap-1 mb-1"><ShieldCheck size={15} /> Gate rules active in app</p>
        <p>- Away lineup confirm is blocked when selected players still have missing availability or missing transport response.</p>
        <p>- Home readiness tracks selected squad confirmations.</p>
      </div>
    </div>
  )
}

export default DeployReadiness
