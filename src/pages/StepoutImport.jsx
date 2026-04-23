import { useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, FileUp, Loader2, Upload, Users } from "lucide-react"
import { addDoc, collection, doc, getDoc, setDoc, writeBatch } from "firebase/firestore"
import { useApp } from "../contexts/AppContext"
import { db } from "../firebase/config"

const STEP_OUT_ALIAS_DOC = ["importSettings", "stepoutAliases"]

const PLAYER_ALIASES = {
  "edwin chikaka": "Edwin (Spider) Chikaka",
  "jaden pieterse": "Jaden Pietersen",
  jose: "Jose Castel",
  "jose gk": "Jose Castel",
  motse: "Motse Moji",
  "motse bcc": "Motse Moji",
  "sibonelo majola": "Sbonelo Majola",
  "simphiwe mthethwa": "Simphiwe Mthetwa",
  "thami hlatswayo": "Thami Hlatshwayo",
  "thami snr hlatswayo": "Thami Hlatshwayo"
}

function normalizeName(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bgk\b/g, "")
    .replace(/\bbcc\b/g, "")
    .replace(/\bsnr\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function buildPlayerLookup(players) {
  const byNormalizedName = new Map()

  players.forEach((player) => {
    const fullName = `${player.firstName || ""} ${player.lastName || ""}`.trim()
    const normalizedName = normalizeName(fullName)

    if (!normalizedName) {
      return
    }

    const existing = byNormalizedName.get(normalizedName) || []
    existing.push({
      id: player.id,
      fullName,
      team: player.team || "",
      position: player.position || ""
    })
    byNormalizedName.set(normalizedName, existing)
  })

  return byNormalizedName
}

function getNameDraft(stepoutName = "") {
  const clean = stepoutName.trim().replace(/\s+/g, " ")
  if (!clean) {
    return { firstName: "", lastName: "" }
  }

  const parts = clean.split(" ")
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  }
}

function getOptionKickoffValue(option) {
  if (option?.kickoffTime) {
    return String(option.kickoffTime).trim()
  }

  const datePart = (option?.date || "").trim()
  const timePart = (option?.time || "").trim()

  if (!datePart) {
    return timePart
  }

  return timePart ? `${datePart} ${timePart}` : datePart
}

function getMatchOptionLabel(option) {
  const status = option?.status || (option?.sourceType === "analysis" ? "Imported" : "Upcoming")
  const kickoff = getOptionKickoffValue(option)
  const datePart = kickoff || option?.date || "No date"
  const competitionPart = status === "Imported" ? "" : (option?.competition ? ` - ${option.competition}` : "")
  const sourcePart = option?.sourceType === "analysis" ? " [Imported]" : " [Fixture]"
  return `${datePart} | ${option?.opponent || "Unknown Opponent"} | ${status}${competitionPart}${sourcePart}`
}

function toSortableTimestamp(option) {
  const kickoff = getOptionKickoffValue(option).replace("T ", "T")
  const parsed = new Date(kickoff).getTime()
  if (!Number.isNaN(parsed) && parsed > 0) {
    return parsed
  }

  const fallback = new Date(option?.date || 0).getTime()
  return Number.isNaN(fallback) ? 0 : fallback
}

function getNormalizedMatchStatus(option) {
  const rawStatus = String(option?.status || "").toLowerCase().trim()

  if (option?.sourceType === "analysis") {
    return "Completed"
  }

  if (["completed", "done", "final", "finished"].includes(rawStatus)) {
    return "Completed"
  }

  return "Upcoming"
}

function getKickoffHHMM(option) {
  const kickoff = getOptionKickoffValue(option)
  const match = kickoff.match(/\b(\d{1,2}):(\d{2})\b/)
  if (!match) {
    return ""
  }

  const hours = String(match[1]).padStart(2, "0")
  return `${hours}:${match[2]}`
}

function getMatchIdentityKey(option) {
  const kickoff = getOptionKickoffValue(option).replace("T ", "T")
  const fallbackDate = (option?.date || "").trim()
  const datePart = kickoff.includes("T") ? kickoff.split("T")[0] : (kickoff.split(" ")[0] || fallbackDate)
  const timePart = getKickoffHHMM(option)
  const opponentKey = String(option?.opponent || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  return `${datePart}|${timePart}|${opponentKey}`
}

function buildImportPreview(events, options, playerLookup, manualSelections, savedAliases, fileName, playersById) {
  const uniquePlayers = Array.from(new Set(events.map((event) => (event.player_name || "").trim()).filter(Boolean))).sort()
  const mappings = []
  const unmatched = []
  const ambiguous = []

  uniquePlayers.forEach((playerName) => {
    const manualPlayerId = manualSelections[playerName]
    if (manualPlayerId) {
      const selectedPlayer = playersById.get(manualPlayerId)
      if (selectedPlayer) {
        mappings.push({
          stepoutName: playerName,
          playerId: selectedPlayer.id,
          playerName: selectedPlayer.fullName,
          team: selectedPlayer.team,
          position: selectedPlayer.position,
          aliasApplied: "Manual selection",
          manualSelection: true
        })
        return
      }
    }

    const normalizedName = normalizeName(playerName)
    const savedAlias = savedAliases[normalizedName]
    if (savedAlias?.playerId) {
      const selectedPlayer = playersById.get(savedAlias.playerId)
      if (selectedPlayer) {
        mappings.push({
          stepoutName: playerName,
          playerId: selectedPlayer.id,
          playerName: selectedPlayer.fullName,
          team: selectedPlayer.team,
          position: selectedPlayer.position,
          aliasApplied: "Saved alias",
          manualSelection: false
        })
        return
      }
    }

    const aliasTarget = PLAYER_ALIASES[normalizedName]
    const resolvedNormalizedName = normalizeName(aliasTarget || playerName)
    const matches = playerLookup.get(resolvedNormalizedName) || []

    if (matches.length === 0) {
      unmatched.push({
        stepoutName: playerName,
        aliasTarget: aliasTarget || null
      })
      return
    }

    if (matches.length > 1) {
      ambiguous.push({
        stepoutName: playerName,
        matches: matches.map((match) => ({
          id: match.id,
          fullName: match.fullName,
          team: match.team
        }))
      })
      return
    }

    mappings.push({
      stepoutName: playerName,
      playerId: matches[0].id,
      playerName: matches[0].fullName,
      team: matches[0].team,
      position: matches[0].position,
      aliasApplied: aliasTarget || null,
      manualSelection: false
    })
  })

  const mappingsByName = new Map(mappings.map((mapping) => [mapping.stepoutName, mapping]))
  const summary = buildSummary(events, mappingsByName, options, fileName)

  return {
    summary,
    report: {
      matchLabel: summary.matchLabel,
      opponent: options.opponent,
      kickoffTime: options.kickoffTime,
      sourceMatchId: String(options.sourceMatchId),
      eventCount: events.length,
      uniquePlayers: uniquePlayers.length,
      matchedPlayers: mappings.length,
      unmatched,
      ambiguous,
      mappings
    }
  }
}

function createStatBucket() {
  return {
    appearances: 1,
    starts: 1,
    totalEvents: 0,
    passing: {
      total: 0,
      successful: 0,
      unsuccessful: 0,
      received: 0
    },
    defending: {
      total: 0,
      interceptions: 0,
      duelsWon: 0,
      duelsLost: 0
    },
    attacking: {
      total: 0,
      shots: 0,
      shotsOnTarget: 0,
      shotsOffTarget: 0,
      goals: 0,
      assists: 0
    },
    discipline: {
      yellowCards: 0,
      redCards: 0
    },
    encounters: {
      won: 0,
      lost: 0
    },
    eventsByAttribute: {},
    eventsBySubAttribute: {},
    eventsByAction: {},
    eventsBySpecialAction: {},
    eventsByBodyPart: {},
    eventsByPeriod: {}
  }
}

function incrementEventStats(playerStats, event) {
  playerStats.totalEvents += 1

  const attributeKey = event.attribute || "Unknown"
  const subAttributeKey = event.sub_attribute || "Unknown"
  const actionKey = event.action || "Unknown"
  const specialActionKey = event.special_action || "Unknown"
  const bodyPartKey = event.body_part || "Unknown"
  const periodKey = event.period || "Unknown"
  const attributeLower = (event.attribute || "").toLowerCase()
  const subAttributeLower = (event.sub_attribute || "").toLowerCase()
  const actionLower = (event.action || "").toLowerCase()
  const descriptionLower = (event.description || "").toLowerCase()
  const specialActionLower = (event.special_action || "").toLowerCase()

  playerStats.eventsByAttribute[attributeKey] = (playerStats.eventsByAttribute[attributeKey] || 0) + 1
  playerStats.eventsBySubAttribute[subAttributeKey] = (playerStats.eventsBySubAttribute[subAttributeKey] || 0) + 1
  playerStats.eventsByAction[actionKey] = (playerStats.eventsByAction[actionKey] || 0) + 1
  playerStats.eventsBySpecialAction[specialActionKey] = (playerStats.eventsBySpecialAction[specialActionKey] || 0) + 1
  playerStats.eventsByBodyPart[bodyPartKey] = (playerStats.eventsByBodyPart[bodyPartKey] || 0) + 1
  playerStats.eventsByPeriod[periodKey] = (playerStats.eventsByPeriod[periodKey] || 0) + 1

  const isPassingAttempt = attributeLower.includes("passing") && !attributeLower.startsWith("x_")
  const isPassingReceive = attributeLower.includes("passing") && (attributeLower.startsWith("x_") || actionLower.includes("received"))

  if (isPassingAttempt) {
    playerStats.passing.total += 1
    if (actionLower.includes("unsuccessful")) {
      playerStats.passing.unsuccessful += 1
    } else {
      playerStats.passing.successful += 1
    }
  }

  if (isPassingReceive) {
    playerStats.passing.received += 1
  }

  if ((event.attribute || "").includes("Defending")) {
    playerStats.defending.total += 1
    if ((event.sub_attribute || "").toLowerCase().includes("interception")) {
      playerStats.defending.interceptions += 1
    }
    if (actionLower.includes("won") || (subAttributeLower.includes("duel") && actionLower.includes("successful"))) {
      playerStats.defending.duelsWon += 1
    }
    if (actionLower.includes("lost") || (subAttributeLower.includes("duel") && actionLower.includes("unsuccessful"))) {
      playerStats.defending.duelsLost += 1
    }
  }

  const encounterWinPattern = /evaded|resisted|successful|won|restricted/
  const encounterLossPattern = /dribbled past|tackled|intercepted|pressed|unsuccessful|lost|encountered/
  const isEncounterEvent = attributeLower.startsWith("x_") || subAttributeLower.includes("encountered")

  if (isEncounterEvent) {
    const encounterText = `${actionLower} ${descriptionLower}`
    if (encounterWinPattern.test(encounterText) && !encounterLossPattern.test(encounterText)) {
      playerStats.encounters.won += 1
    } else {
      playerStats.encounters.lost += 1
    }
  }

  if ((event.attribute || "").includes("Attacking") || (event.attribute || "").includes("Shooting")) {
    playerStats.attacking.total += 1
  }

  const isGoalEvent =
    (actionLower.includes("goal") || descriptionLower.includes(" goal")) &&
    !actionLower.includes("conceded") &&
    !descriptionLower.includes("conceded") &&
    !attributeLower.includes("goalkeeping")

  const isAssistEvent =
    (actionLower.includes("assist") || descriptionLower.includes("assist")) &&
    !actionLower.includes("received assist") &&
    !descriptionLower.includes("received assist")

  const isShotEvent =
    attributeLower.includes("shooting") ||
    actionLower.includes("shot") ||
    descriptionLower.includes("shot")

  if (isGoalEvent) {
    playerStats.attacking.goals += 1
  }

  if (isAssistEvent) {
    playerStats.attacking.assists += 1
  }

  if (isShotEvent) {
    playerStats.attacking.shots += 1

    const isShotOnTarget =
      isGoalEvent ||
      actionLower.includes("saved") ||
      descriptionLower.includes("saved") ||
      actionLower.includes("on target") ||
      descriptionLower.includes("on target")

    const isShotOffTarget =
      actionLower.includes("off target") ||
      descriptionLower.includes("off target") ||
      actionLower.includes("wide") ||
      descriptionLower.includes("wide") ||
      actionLower.includes("miss") ||
      descriptionLower.includes("miss") ||
      actionLower.includes("post") ||
      descriptionLower.includes("post") ||
      actionLower.includes("crossbar") ||
      descriptionLower.includes("crossbar") ||
      actionLower.includes("bar") ||
      descriptionLower.includes("bar")

    if (isShotOnTarget) {
      playerStats.attacking.shotsOnTarget += 1
    } else if (isShotOffTarget) {
      playerStats.attacking.shotsOffTarget += 1
    }
  }

  const yellowCardPattern = /\byellow\b|\bcaution\b|\bbooked\b/
  const redCardPattern = /\bred card\b|\bsent off\b|\bsecond yellow\b/
  const cardText = `${specialActionLower} ${actionLower} ${descriptionLower}`

  if (yellowCardPattern.test(cardText)) {
    playerStats.discipline.yellowCards += 1
  }

  if (redCardPattern.test(cardText)) {
    playerStats.discipline.redCards += 1
  }
}

function buildSummary(events, mappingsByName, options, fileName) {
  const playerStats = {}

  events.forEach((event) => {
    const mapping = mappingsByName.get((event.player_name || "").trim())
    if (!mapping) {
      return
    }

    if (!playerStats[mapping.playerId]) {
      playerStats[mapping.playerId] = {
        playerId: mapping.playerId,
        playerName: mapping.playerName,
        stepoutName: mapping.stepoutName,
        team: mapping.team,
        position: mapping.position,
        ...createStatBucket()
      }
    }

    incrementEventStats(playerStats[mapping.playerId], event)
  })

  return {
    source: "stepout",
    sourceMatchId: String(options.sourceMatchId),
    teamName: options.teamName,
    opponent: options.opponent,
    kickoffTime: options.kickoffTime,
    matchLabel: options.matchLabel,
    importedAt: new Date().toISOString(),
    jsonFileName: fileName,
    eventCount: events.length,
    playerCount: Object.keys(playerStats).length,
    playerMappings: Array.from(mappingsByName.values()),
    playerStats
  }
}

function parseJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (!Array.isArray(parsed)) {
          reject(new Error("The JSON file must contain an array of Stepout events."))
          return
        }
        resolve(parsed)
      } catch (error) {
        reject(new Error("The selected file is not valid JSON."))
      }
    }
    reader.onerror = () => reject(new Error("Could not read the selected file."))
    reader.readAsText(file)
  })
}

function StepoutImport() {
  const { players, fixtures, matchAnalyses, loading, userRole } = useApp()
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedMatchOptionId, setSelectedMatchOptionId] = useState("")
  const [form, setForm] = useState({
    teamName: "BCC First Team",
    sourceMatchId: "",
    opponent: "",
    kickoffTime: "",
    matchLabel: ""
  })
  const [preview, setPreview] = useState(null)
  const [rawEvents, setRawEvents] = useState([])
  const [manualSelections, setManualSelections] = useState({})
  const [savedAliases, setSavedAliases] = useState({})
  const [newPlayerDrafts, setNewPlayerDrafts] = useState({})
  const [creatingByStepoutName, setCreatingByStepoutName] = useState({})
  const [localPlayersById, setLocalPlayersById] = useState({})
  const [message, setMessage] = useState({ type: "", text: "" })
  const [processing, setProcessing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const playerLookup = useMemo(() => buildPlayerLookup(players), [players])
  const matchOptions = useMemo(() => {
    const fixtureOptions = fixtures
      .filter((fixture) => fixture?.opponent)
      .map((fixture) => ({
        id: `fixture:${fixture.id}`,
        sourceType: "fixture",
        ...fixture
      }))
      .filter((fixture) => getKickoffHHMM(fixture) === "15:30")

    const analysisOptions = matchAnalyses
      .filter((analysis) => analysis?.opponent)
      .map((analysis) => ({
        id: `analysis:${analysis.id}`,
        sourceType: "analysis",
        opponent: analysis.opponent,
        kickoffTime: analysis.kickoffTime || "",
        matchLabel: analysis.matchLabel || "",
        sourceMatchId: analysis.sourceMatchId || "",
        status: "Imported",
        competition: analysis.source || "stepout"
      }))
      .filter((analysis) => getKickoffHHMM(analysis) === "15:30")

    const deduped = new Map()

    fixtureOptions.forEach((option) => {
      deduped.set(getMatchIdentityKey(option), option)
    })

    analysisOptions.forEach((option) => {
      const key = getMatchIdentityKey(option)
      const existing = deduped.get(key)

      deduped.set(key, {
        ...(existing || {}),
        ...option,
        sourceType: "analysis",
        status: "Imported",
        importedLocked: true
      })
    })

    return Array.from(deduped.values()).sort((left, right) => toSortableTimestamp(right) - toSortableTimestamp(left))
  }, [fixtures, matchAnalyses])
  const completedMatchOptions = useMemo(
    () => matchOptions.filter((option) => getNormalizedMatchStatus(option) === "Completed"),
    [matchOptions]
  )
  const upcomingMatchOptions = useMemo(
    () => matchOptions.filter((option) => getNormalizedMatchStatus(option) === "Upcoming"),
    [matchOptions]
  )
  const playersById = useMemo(() => {
    const byId = new Map()
    players.forEach((player) => {
      byId.set(player.id, {
        id: player.id,
        fullName: `${player.firstName || ""} ${player.lastName || ""}`.trim(),
        team: player.team || "",
        position: player.position || ""
      })
    })

    Object.values(localPlayersById).forEach((player) => {
      byId.set(player.id, player)
    })

    return byId
  }, [players, localPlayersById])
  const playerOptions = useMemo(
    () => Array.from(playersById.values()).sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [playersById]
  )
  const selectedMatchOption = useMemo(
    () => matchOptions.find((option) => option.id === selectedMatchOptionId) || null,
    [matchOptions, selectedMatchOptionId]
  )
  const isSelectedMatchAlreadyImported = Boolean(
    selectedMatchOption && (selectedMatchOption.importedLocked || selectedMatchOption.sourceType === "analysis")
  )

  useEffect(() => {
    let cancelled = false

    async function loadAliases() {
      try {
        const aliasDoc = await getDoc(doc(db, ...STEP_OUT_ALIAS_DOC))
        if (!cancelled) {
          setSavedAliases(aliasDoc.data()?.aliases || {})
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading Stepout aliases:", error)
        }
      }
    }

    loadAliases()

    return () => {
      cancelled = true
    }
  }, [])

  if (userRole !== "super-admin") {
    return (
      <div className="flex-1 p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={48} />
          <p className="text-gray-600 font-semibold">Super Admin only</p>
        </div>
      </div>
    )
  }

  const updateField = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if ((key === "opponent" || key === "teamName") && !current.matchLabel) {
        next.matchLabel = `${next.teamName || "BCC"} vs ${next.opponent || "Opponent"}`
      }
      return next
    })
  }

  const handleFixtureSelect = (selectedOptionId) => {
    setSelectedMatchOptionId(selectedOptionId)

    if (!selectedOptionId) {
      return
    }

    const selectedOption = matchOptions.find((option) => option.id === selectedOptionId)
    if (!selectedOption) {
      return
    }

    setForm((current) => ({
      ...current,
      opponent: selectedOption.opponent || current.opponent,
      kickoffTime: getOptionKickoffValue(selectedOption) || current.kickoffTime,
      matchLabel: selectedOption.matchLabel || `BCC First Team vs ${selectedOption.opponent || "Opponent"}`,
      sourceMatchId: selectedOption.sourceMatchId || current.sourceMatchId
    }))
  }

  const handleProcess = async () => {
    if (isSelectedMatchAlreadyImported) {
      setMessage({ type: "error", text: "This match is already imported. Re-import is blocked to prevent duplicates." })
      return
    }

    if (!selectedFile) {
      setMessage({ type: "error", text: "Choose a Stepout JSON file first." })
      return
    }

    if (!form.sourceMatchId || !form.opponent || !form.kickoffTime) {
      setMessage({ type: "error", text: "Match ID, opponent and kickoff time are required." })
      return
    }

    setProcessing(true)
    setMessage({ type: "", text: "" })

    try {
      const parsedEvents = await parseJsonFile(selectedFile)
      const filteredEvents = parsedEvents.filter((event) => event.team_name === form.teamName)

      if (filteredEvents.length === 0) {
        throw new Error(`No events found for team name \"${form.teamName}\".`)
      }

      const importOptions = {
        ...form,
        matchLabel: form.matchLabel || `${form.teamName} vs ${form.opponent}`
      }
      const nextPreview = buildImportPreview(filteredEvents, importOptions, playerLookup, manualSelections, savedAliases, selectedFile.name, playersById)

      setRawEvents(filteredEvents)
      setPreview(nextPreview)

      if (nextPreview.report.unmatched.length > 0 || nextPreview.report.ambiguous.length > 0) {
        setMessage({ type: "error", text: "Processing finished, but you must resolve unmatched or ambiguous players before upload." })
      } else {
        setMessage({ type: "success", text: `Processed ${filteredEvents.length} events for ${nextPreview.report.matchedPlayers} matched players.` })
      }
    } catch (error) {
      setPreview(null)
      setRawEvents([])
      setMessage({ type: "error", text: error.message || "Could not process this file." })
    } finally {
      setProcessing(false)
    }
  }

  const handleManualSelection = (stepoutName, playerId) => {
    const nextSelections = {
      ...manualSelections,
      [stepoutName]: playerId || undefined
    }

    if (!playerId) {
      delete nextSelections[stepoutName]
    }

    setManualSelections(nextSelections)

    if (!rawEvents.length || !selectedFile) {
      return
    }

    const importOptions = {
      ...form,
      matchLabel: form.matchLabel || `${form.teamName} vs ${form.opponent}`
    }
    const nextPreview = buildImportPreview(rawEvents, importOptions, playerLookup, nextSelections, savedAliases, selectedFile.name, playersById)
    setPreview(nextPreview)

    if (nextPreview.report.unmatched.length === 0 && nextPreview.report.ambiguous.length === 0) {
      setMessage({ type: "success", text: "All players are now linked. You can upload this match." })
    } else {
      setMessage({ type: "error", text: "Choose the correct player for each unresolved Stepout name before upload." })
    }
  }

  const handleUpload = async () => {
    if (!preview) {
      setMessage({ type: "error", text: "Process a file before uploading." })
      return
    }

    if (preview.report.unmatched.length > 0 || preview.report.ambiguous.length > 0) {
      setMessage({ type: "error", text: "Upload blocked until all players match a single existing player record." })
      return
    }

    setUploading(true)
    setMessage({ type: "", text: "" })

    try {
      const summaryId = `stepout-${String(preview.summary.sourceMatchId)}`

      const aliasUpdates = Object.entries(manualSelections).reduce((result, [stepoutName, playerId]) => {
        const selectedPlayer = playersById.get(playerId)
        if (!selectedPlayer) {
          return result
        }

        result[normalizeName(stepoutName)] = {
          playerId: selectedPlayer.id,
          playerName: selectedPlayer.fullName,
          updatedAt: new Date().toISOString()
        }
        return result
      }, {})

      if (Object.keys(aliasUpdates).length > 0) {
        await setDoc(doc(db, ...STEP_OUT_ALIAS_DOC), { aliases: aliasUpdates }, { merge: true })
        setSavedAliases((current) => ({ ...current, ...aliasUpdates }))
      }

      await setDoc(doc(db, "matchAnalyses", summaryId), preview.summary, { merge: true })

      const chunkSize = 400
      const mappingsByName = new Map(preview.report.mappings.map((mapping) => [mapping.stepoutName, mapping]))

      for (let index = 0; index < rawEvents.length; index += chunkSize) {
        const batch = writeBatch(db)
        const chunk = rawEvents.slice(index, index + chunkSize)

        chunk.forEach((event) => {
          const mapping = mappingsByName.get((event.player_name || "").trim())
          const eventRef = doc(collection(db, "matchAnalyses", summaryId, "events"), String(event.id))
          batch.set(eventRef, {
            ...event,
            source: "stepout",
            sourceMatchId: String(event.match_id),
            playerId: mapping?.playerId || null,
            matchedPlayerName: mapping?.playerName || null
          })
        })

        await batch.commit()
      }

      setMessage({ type: "success", text: `Uploaded ${preview.summary.eventCount} events into matchAnalyses/${summaryId}. Manual links were saved for future imports.` })
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Upload failed." })
    } finally {
      setUploading(false)
    }
  }

  const ensurePlayerDraft = (stepoutName) => {
    if (newPlayerDrafts[stepoutName]) {
      return newPlayerDrafts[stepoutName]
    }

    const initialName = getNameDraft(stepoutName)
    const draft = {
      firstName: initialName.firstName,
      lastName: initialName.lastName,
      phone: "",
      team: "First Team",
      position: "Midfielder"
    }

    setNewPlayerDrafts((current) => ({
      ...current,
      [stepoutName]: draft
    }))

    return draft
  }

  const updateNewPlayerDraft = (stepoutName, key, value) => {
    const existing = ensurePlayerDraft(stepoutName)
    setNewPlayerDrafts((current) => ({
      ...current,
      [stepoutName]: {
        ...existing,
        ...current[stepoutName],
        [key]: value
      }
    }))
  }

  const handleCreatePlayerForUnmatched = async (stepoutName) => {
    const draft = ensurePlayerDraft(stepoutName)
    const firstName = (draft.firstName || "").trim()
    const lastName = (draft.lastName || "").trim()

    if (!firstName) {
      setMessage({ type: "error", text: `Add a first name before creating ${stepoutName}.` })
      return
    }

    setCreatingByStepoutName((current) => ({
      ...current,
      [stepoutName]: true
    }))

    try {
      const playerPayload = {
        firstName,
        lastName,
        phone: (draft.phone || "").trim(),
        team: (draft.team || "First Team").trim() || "First Team",
        position: (draft.position || "Midfielder").trim() || "Midfielder"
      }

      const createdRef = await addDoc(collection(db, "players"), playerPayload)
      const createdPlayer = {
        id: createdRef.id,
        fullName: `${playerPayload.firstName} ${playerPayload.lastName}`.trim(),
        team: playerPayload.team,
        position: playerPayload.position
      }

      setLocalPlayersById((current) => ({
        ...current,
        [createdRef.id]: createdPlayer
      }))

      const nextSelections = {
        ...manualSelections,
        [stepoutName]: createdRef.id
      }
      setManualSelections(nextSelections)

      if (rawEvents.length && selectedFile) {
        const importOptions = {
          ...form,
          matchLabel: form.matchLabel || `${form.teamName} vs ${form.opponent}`
        }
        const nextPreview = buildImportPreview(rawEvents, importOptions, playerLookup, nextSelections, savedAliases, selectedFile.name, new Map([...playersById, [createdPlayer.id, createdPlayer]]))
        setPreview(nextPreview)
      }

      setMessage({ type: "success", text: `${createdPlayer.fullName} was added and linked to ${stepoutName}.` })
    } catch (error) {
      setMessage({ type: "error", text: error.message || `Could not create player for ${stepoutName}.` })
    } finally {
      setCreatingByStepoutName((current) => ({
        ...current,
        [stepoutName]: false
      }))
    }
  }

  const report = preview?.report

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              Stepout Import
            </h1>
            <p className="text-gray-600">Upload a match JSON, preview player linking, and write the processed import to Firestore.</p>
          </div>
          <div className="text-sm text-gray-500">
            {loading ? "Loading player list..." : `${players.length} player records available for matching`}
          </div>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl border flex items-center gap-3 ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            {message.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-4 md:p-6 border border-gray-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block md:col-span-2">
              <span className="block text-sm font-semibold text-gray-700 mb-2">Pick Existing Match (Completed + Upcoming)</span>
              <p className="text-xs text-gray-500 mb-2">
                Completed: {completedMatchOptions.length} | Upcoming: {upcomingMatchOptions.length} | Filter: kickoff 15:30 only
              </p>
              {isSelectedMatchAlreadyImported && (
                <p className="text-xs text-amber-700 mb-2">Selected match is already imported. Process/Upload is disabled.</p>
              )}
              <select
                value={selectedMatchOptionId}
                onChange={(event) => handleFixtureSelect(event.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
              >
                <option value="">Choose match to auto-fill opponent/kickoff/label...</option>
                {completedMatchOptions.length > 0 && (
                  <optgroup label="Completed Games">
                    {completedMatchOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {getMatchOptionLabel(option)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {upcomingMatchOptions.length > 0 && (
                  <optgroup label="Upcoming Games">
                    {upcomingMatchOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {getMatchOptionLabel(option)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>

            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-2">Stepout JSON</span>
              <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
                <FileUp className="text-blue-600" size={20} />
                <span className="text-sm text-gray-700 truncate">{selectedFile ? selectedFile.name : "Choose a JSON file"}</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null
                    setSelectedFile(file)
                    setPreview(null)
                    setRawEvents([])
                  }}
                />
              </label>
            </label>

            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-2">Team Name In JSON</span>
              <input
                type="text"
                value={form.teamName}
                onChange={(event) => updateField("teamName", event.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-2">Match ID</span>
              <input
                type="text"
                value={form.sourceMatchId}
                onChange={(event) => updateField("sourceMatchId", event.target.value)}
                placeholder="e.g. 9338"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-2">Opponent</span>
              <input
                type="text"
                value={form.opponent}
                onChange={(event) => updateField("opponent", event.target.value)}
                placeholder="e.g. Bonero Park"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-2">Kickoff Time</span>
              <input
                type="text"
                value={form.kickoffTime}
                onChange={(event) => updateField("kickoffTime", event.target.value)}
                placeholder="e.g. 2026-04-12T15:30:00"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-2">Match Label</span>
              <input
                type="text"
                value={form.matchLabel}
                onChange={(event) => updateField("matchLabel", event.target.value)}
                placeholder="e.g. BCC First Team vs Bonero Park"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleProcess}
              disabled={processing || loading || isSelectedMatchAlreadyImported}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-5 py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              {processing ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
              {processing ? "Processing..." : "Process File"}
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !preview || isSelectedMatchAlreadyImported || report?.unmatched.length > 0 || report?.ambiguous.length > 0}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-5 py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {uploading ? "Uploading..." : "Upload To Firestore"}
            </button>
          </div>
        </div>

        {report && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h2 className="text-lg font-black text-gray-900 mb-4">Import Summary</h2>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex justify-between gap-4"><span>Match</span><span className="font-semibold text-right">{report.matchLabel}</span></div>
                <div className="flex justify-between gap-4"><span>Events</span><span className="font-semibold">{report.eventCount}</span></div>
                <div className="flex justify-between gap-4"><span>Unique players</span><span className="font-semibold">{report.uniquePlayers}</span></div>
                <div className="flex justify-between gap-4"><span>Matched players</span><span className="font-semibold text-green-700">{report.matchedPlayers}</span></div>
                <div className="flex justify-between gap-4"><span>Unmatched</span><span className="font-semibold text-red-700">{report.unmatched.length}</span></div>
                <div className="flex justify-between gap-4"><span>Ambiguous</span><span className="font-semibold text-amber-700">{report.ambiguous.length}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 lg:col-span-2">
              <h2 className="text-lg font-black text-gray-900 mb-4">Matched Players</h2>
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                {report.mappings.map((mapping) => (
                  <div key={mapping.stepoutName} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                    <div>
                      <div className="font-semibold text-gray-900">{mapping.stepoutName}</div>
                      <div className="text-xs text-gray-500">{mapping.aliasApplied ? `Alias: ${mapping.aliasApplied}` : "Direct match"}</div>
                    </div>
                    <div className="text-sm text-gray-700 md:text-right">
                      <div className="font-semibold">{mapping.playerName}</div>
                      <div className="text-xs text-gray-500">{mapping.team || "No team"} • {mapping.position || "No position"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(report.unmatched.length > 0 || report.ambiguous.length > 0) && (
              <div className="bg-white rounded-xl shadow-md border border-red-100 p-5 lg:col-span-3">
                <h2 className="text-lg font-black text-red-700 mb-4">Fix Before Upload</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Unmatched Players</h3>
                    <div className="space-y-2 text-sm text-gray-700">
                      {report.unmatched.length === 0 ? <div>None</div> : report.unmatched.map((item) => (
                        <div key={item.stepoutName} className="p-3 bg-red-50 rounded-lg border border-red-100">
                          <div className="font-semibold">{item.stepoutName}</div>
                          <div className="text-xs text-red-700">{item.aliasTarget ? `Alias target: ${item.aliasTarget}` : "No alias configured"}</div>
                          <select
                            value={manualSelections[item.stepoutName] || ""}
                            onChange={(event) => handleManualSelection(item.stepoutName, event.target.value)}
                            className="mt-3 w-full px-3 py-2 border border-red-200 rounded-lg bg-white text-sm text-gray-800"
                          >
                            <option value="">Choose existing player...</option>
                            {playerOptions.map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.fullName} {player.team ? `(${player.team})` : ""}
                              </option>
                            ))}
                          </select>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="First name"
                              value={(newPlayerDrafts[item.stepoutName] || getNameDraft(item.stepoutName)).firstName}
                              onChange={(event) => updateNewPlayerDraft(item.stepoutName, "firstName", event.target.value)}
                              className="px-3 py-2 border border-red-200 rounded-lg bg-white text-sm text-gray-800"
                            />
                            <input
                              type="text"
                              placeholder="Last name"
                              value={(newPlayerDrafts[item.stepoutName] || getNameDraft(item.stepoutName)).lastName}
                              onChange={(event) => updateNewPlayerDraft(item.stepoutName, "lastName", event.target.value)}
                              className="px-3 py-2 border border-red-200 rounded-lg bg-white text-sm text-gray-800"
                            />
                            <input
                              type="text"
                              placeholder="Phone (optional)"
                              value={(newPlayerDrafts[item.stepoutName] || {}).phone || ""}
                              onChange={(event) => updateNewPlayerDraft(item.stepoutName, "phone", event.target.value)}
                              className="px-3 py-2 border border-red-200 rounded-lg bg-white text-sm text-gray-800"
                            />
                            <input
                              type="text"
                              placeholder="Position"
                              value={(newPlayerDrafts[item.stepoutName] || {}).position || "Midfielder"}
                              onChange={(event) => updateNewPlayerDraft(item.stepoutName, "position", event.target.value)}
                              className="px-3 py-2 border border-red-200 rounded-lg bg-white text-sm text-gray-800"
                            />
                          </div>

                          <div className="mt-2">
                            <button
                              onClick={() => handleCreatePlayerForUnmatched(item.stepoutName)}
                              disabled={Boolean(creatingByStepoutName[item.stepoutName])}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-semibold"
                            >
                              {creatingByStepoutName[item.stepoutName] ? "Adding player..." : "Add Player And Link"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Ambiguous Players</h3>
                    <div className="space-y-2 text-sm text-gray-700">
                      {report.ambiguous.length === 0 ? <div>None</div> : report.ambiguous.map((item) => (
                        <div key={item.stepoutName} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <div className="font-semibold mb-1">{item.stepoutName}</div>
                          <div className="text-xs text-amber-800">{item.matches.map((match) => `${match.fullName} (${match.team || "No team"})`).join(", ")}</div>
                          <select
                            value={manualSelections[item.stepoutName] || ""}
                            onChange={(event) => handleManualSelection(item.stepoutName, event.target.value)}
                            className="mt-3 w-full px-3 py-2 border border-amber-200 rounded-lg bg-white text-sm text-gray-800"
                          >
                            <option value="">Choose correct player...</option>
                            {item.matches.map((match) => (
                              <option key={match.id} value={match.id}>
                                {match.fullName} {match.team ? `(${match.team})` : ""}
                              </option>
                            ))}
                            {item.matches.length === 0 ? null : <option disabled>──────────</option>}
                            {playerOptions.map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.fullName} {player.team ? `(${player.team})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StepoutImport