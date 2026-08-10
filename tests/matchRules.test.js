import test from "node:test"
import assert from "node:assert/strict"
import { getMatchRules } from "../src/config/matchRules.js"
test("loads sport-specific lineup limits",()=>{assert.equal(getMatchRules("netball").starters,7);assert.equal(getMatchRules("rugby").maxSquad,23)})
test("provides a safe configurable fallback",()=>{assert.deepEqual(getMatchRules("unknown").events,["substitution","player-of-match"])})
