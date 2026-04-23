/* eslint-disable no-console */
const admin = require("firebase-admin")
require("dotenv").config()

const serviceAccount = require("./firebase-service-account.json")

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

const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ").toUpperCase()

const buildFixtureKey = (fixture) => {
  const teamId = getTeamIdFromKickoffTime(fixture?.time, fixture?.team)
  return [fixture?.date || "", normalizeText(fixture?.opponent || ""), fixture?.homeAway || "", fixture?.time || "", teamId].join("|")
}

const buildAwayKey = (awayGame) => {
  const teamId = getTeamIdFromKickoffTime(awayGame?.time, awayGame?.team)
  return [awayGame?.date || "", normalizeText(awayGame?.opponent || awayGame?.title || ""), "Away", awayGame?.time || "", teamId].join("|")
}

const todayKey = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const isUpcoming = (fixture) => {
  if (!fixture?.date) return true
  return String(fixture.date) >= todayKey()
}

const getLineupByFixtureTeam = (awayGame, fixtureTeamId) => {
  const lineups = awayGame?.lineups || {}
  if (fixtureTeamId === "reserve") return lineups.reserveTeam || { starters: [], bench: [], isConfirmed: false }
  return lineups.firstTeam || awayGame?.lineup || { starters: [], bench: [], isConfirmed: false }
}

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    })
  }

  const db = admin.firestore()
  const [fixtureSnap, homePlanSnap, awaySnap] = await Promise.all([
    db.collection("fixtures").get(),
    db.collection("homeDayPlans").get(),
    db.collection("awayGames").get()
  ])

  const fixtures = fixtureSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(isUpcoming)
  const homePlans = homePlanSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const awayGames = awaySnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const homeByFixtureId = new Map(homePlans.map((p) => [p.fixtureId, p]))
  const awayByFixtureId = new Map(awayGames.filter((g) => g.fixtureId).map((g) => [g.fixtureId, g]))
  const awayByKey = new Map(awayGames.map((g) => [buildAwayKey(g), g]))

  const rows = fixtures.map((fixture) => {
    const blockers = []
    const warnings = []

    if ((fixture.homeAway || "").toLowerCase() === "home") {
      const plan = homeByFixtureId.get(fixture.id)
      if (!plan) blockers.push("No home day plan")
      else {
        const squad = plan.squadPlayerIds || []
        if (squad.length === 0) blockers.push("No selected squad")
        const confirmations = plan.playerConfirmations || {}
        const missing = squad.filter((id) => !confirmations[id]?.availability)
        if (missing.length > 0) blockers.push(`${missing.length} missing availability confirmations`)
      }
      return { fixture, blockers, warnings }
    }

    const fixtureTeamId = getTeamIdFromKickoffTime(fixture.time, fixture.team)
    const away = awayByFixtureId.get(fixture.id) || awayByKey.get(buildFixtureKey(fixture))
    if (!away) {
      blockers.push("No away game record")
      return { fixture, blockers, warnings }
    }

    const lineup = getLineupByFixtureTeam(away, fixtureTeamId)
    const selected = Array.from(new Set([...(lineup.starters || []), ...(lineup.bench || [])]))
    if (selected.length === 0) blockers.push("No selected lineup players")
    if (!lineup.isConfirmed) warnings.push("Lineup still draft")

    const attendance = away.attendance || {}
    const offers = away.transportOffers || {}
    const requests = away.transportRequests || {}

    const missingAvailability = selected.filter((id) => !attendance[id]?.status)
    if (missingAvailability.length > 0) blockers.push(`${missingAvailability.length} missing availability confirmations`)

    const missingTransport = selected.filter((id) => {
      const status = attendance[id]?.status
      if (status === "no") return false
      return !offers[id] && !requests[id]
    })

    if (missingTransport.length > 0) blockers.push(`${missingTransport.length} missing transport response`)

    return { fixture, blockers, warnings }
  })

  const blocked = rows.filter((r) => r.blockers.length > 0)
  const warning = rows.filter((r) => r.blockers.length === 0 && r.warnings.length > 0)
  const ready = rows.filter((r) => r.blockers.length === 0 && r.warnings.length === 0)

  console.log("=== ADMIN READINESS AUDIT ===")
  console.log(`Upcoming fixtures: ${rows.length}`)
  console.log(`Ready: ${ready.length}`)
  console.log(`Warnings: ${warning.length}`)
  console.log(`Blocked: ${blocked.length}`)
  console.log("")

  rows.forEach((row) => {
    const fixture = row.fixture
    const header = `${fixture.homeAway || ""} vs ${fixture.opponent || "Opponent"} on ${fixture.date || "No date"} ${fixture.time || ""}`
    if (row.blockers.length > 0) {
      console.log(`[BLOCKED] ${header}`)
      row.blockers.forEach((item) => console.log(`  - ${item}`))
      return
    }

    if (row.warnings.length > 0) {
      console.log(`[WARNING] ${header}`)
      row.warnings.forEach((item) => console.log(`  - ${item}`))
      return
    }

    console.log(`[READY] ${header}`)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
