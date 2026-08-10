export const SPORTS = [
  {
    id: "football",
    name: "Football",
    teamLabel: "Squad",
    participantLabel: "Player",
    matchLabel: "Fixture",
    roles: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
    metrics: ["Goals", "Assists", "Minutes", "Yellow cards", "Red cards"]
  },
  {
    id: "rugby",
    name: "Rugby",
    teamLabel: "Squad",
    participantLabel: "Player",
    matchLabel: "Fixture",
    roles: ["Prop", "Hooker", "Lock", "Flanker", "Number 8", "Scrum-half", "Fly-half", "Centre", "Wing", "Fullback"],
    metrics: ["Tries", "Conversions", "Penalties", "Tackles", "Carries"]
  },
  {
    id: "cricket",
    name: "Cricket",
    teamLabel: "XI",
    participantLabel: "Player",
    matchLabel: "Match",
    roles: ["Batter", "Bowler", "All-rounder", "Wicketkeeper"],
    metrics: ["Runs", "Wickets", "Overs", "Catches", "Strike rate"]
  },
  {
    id: "hockey",
    name: "Hockey",
    teamLabel: "Squad",
    participantLabel: "Player",
    matchLabel: "Fixture",
    roles: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
    metrics: ["Goals", "Assists", "Minutes", "Green cards", "Yellow cards"]
  },
  {
    id: "netball",
    name: "Netball",
    teamLabel: "Squad",
    participantLabel: "Player",
    matchLabel: "Fixture",
    roles: ["Goal Shooter", "Goal Attack", "Wing Attack", "Centre", "Wing Defence", "Goal Defence", "Goal Keeper"],
    metrics: ["Goals", "Goal attempts", "Assists", "Intercepts", "Turnovers"]
  },
  {
    id: "basketball",
    name: "Basketball",
    teamLabel: "Roster",
    participantLabel: "Player",
    matchLabel: "Game",
    roles: ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Centre"],
    metrics: ["Points", "Rebounds", "Assists", "Steals", "Blocks"]
  }
]

export const getSport = sportId => SPORTS.find(sport => sport.id === sportId) || SPORTS[0]
