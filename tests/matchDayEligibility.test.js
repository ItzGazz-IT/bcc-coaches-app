import test from "node:test"
import assert from "node:assert/strict"
import { getAvailabilitySummary, getDeclinedPlayerIds, getMedicallyUnavailablePlayerIds, isPlayerMatchEligible } from "../src/utils/matchDayEligibility.js"

test("active injuries and absences make players medically unavailable", () => {
  const ids = getMedicallyUnavailablePlayerIds([
    { playerId: "injured", status: "injured" },
    { playerId: "absent", status: "unavailable" },
    { playerId: "recovered", status: "recovered" }
  ])
  assert.deepEqual([...ids], ["injured", "absent"])
})

test("only an unavailable poll response declines selection", () => {
  const ids = getDeclinedPlayerIds({ yes: { status: "available" }, no: { status: "unavailable" }, pending: {} })
  assert.deepEqual([...ids], ["no"])
})

test("a player must pass both medical and poll eligibility", () => {
  assert.equal(isPlayerMatchEligible("ready", new Set(), new Set()), true)
  assert.equal(isPlayerMatchEligible("injured", new Set(["injured"]), new Set()), false)
  assert.equal(isPlayerMatchEligible("declined", new Set(), new Set(["declined"])), false)
})

test("availability summary separates responses and medical blocks", () => {
  const summary = getAvailabilitySummary(["yes", "no", "waiting", "injured"], {
    yes: { status: "available" },
    no: { status: "unavailable" }
  }, new Set(["injured"]))
  assert.deepEqual(summary, { total: 4, available: 1, pending: 1, unavailable: 1, medical: 1 })
})
