const rules = {
  football: { starters:11, maxSquad:18, specialist:"Goalkeeper", positions:["GK","RB","CB","LB","DM","CM","AM","RW","LW","ST"], events:["goal","assist","yellow-card","red-card","substitution","player-of-match"] },
  rugby: { starters:15, maxSquad:23, specialist:"Goal kicker", positions:["Prop","Hooker","Lock","Flanker","Number 8","Scrum-half","Fly-half","Centre","Wing","Fullback"], events:["try","conversion","penalty","drop-goal","yellow-card","red-card","substitution","player-of-match"] },
  cricket: { starters:11, maxSquad:15, specialist:"Wicketkeeper", positions:["Batter","All-rounder","Wicketkeeper","Bowler"], events:["runs","wicket","catch","run-out","over","player-of-match"] },
  hockey: { starters:11, maxSquad:18, specialist:"Goalkeeper", positions:["GK","Defender","Midfielder","Forward"], events:["goal","assist","green-card","yellow-card","red-card","substitution","player-of-match"] },
  netball: { starters:7, maxSquad:12, specialist:null, positions:["GS","GA","WA","C","WD","GD","GK"], events:["goal","interception","turnover","substitution","player-of-match"] },
  basketball: { starters:5, maxSquad:12, specialist:null, positions:["PG","SG","SF","PF","C"], events:["point","rebound","assist","steal","block","foul","substitution","player-of-match"] }
}
export const getMatchRules = sportId => rules[sportId] || { starters:0, maxSquad:30, specialist:null, positions:[], events:["substitution","player-of-match"] }
export const MATCH_RULES = rules
