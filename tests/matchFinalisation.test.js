import test from "node:test"
import assert from "node:assert/strict"
import { canAccountVote, getVoteWinner } from "../src/utils/matchFinalisation.js"

test("only represented squad accounts with attendance can vote", () => {
  const base = { voting:{open:true}, squadPlayerIds:["p1"], attendance:{p1:"attended"} }
  assert.equal(canAccountVote({...base,userRole:"guardian",linkedPlayerIds:["p1"]}),true)
  assert.equal(canAccountVote({...base,userRole:"guardian",linkedPlayerIds:["p2"]}),false)
  assert.equal(canAccountVote({...base,userRole:"player",currentPlayerId:"p1",attendance:{p1:"absent"}}),false)
})

test("vote winner is withheld on a tie", () => {
  assert.equal(getVoteWinner({a:{playerId:"p1"},b:{playerId:"p1"},c:{playerId:"p2"}}),"p1")
  assert.equal(getVoteWinner({a:{playerId:"p1"},b:{playerId:"p2"}}),"")
})
