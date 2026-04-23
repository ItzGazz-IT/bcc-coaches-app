const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config();

const DEFAULT_FILE = 'src/pages/9338_1776934782457.json';
const DEFAULT_TEAM_NAME = 'BCC First Team';
const DEFAULT_MATCH_ID = '9338';
const DEFAULT_OPPONENT = 'Bonero Park';
const DEFAULT_KICKOFF = '15:30';
const DEFAULT_MATCH_LABEL = 'BCC vs Bonero Park';

const PLAYER_ALIASES = {
  'edwin chikaka': 'Edwin (Spider) Chikaka',
  'jaden pieterse': 'Jaden Pietersen',
  'jose': 'Jose Castel',
  'jose gk': 'Jose Castel',
  'motse': 'Motse Moji',
  'motse bcc': 'Motse Moji',
  'sibonelo majola': 'Sbonelo Majola',
  'simphiwe mthethwa': 'Simphiwe Mthetwa',
  'thami hlatswayo': 'Thami Hlatshwayo',
  'thami snr hlatswayo': 'Thami Hlatshwayo'
};

function normalizeName(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bgk\b/g, '')
    .replace(/\bbcc\b/g, '')
    .replace(/\bsnr\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseArgs(argv) {
  const options = {
    file: DEFAULT_FILE,
    teamName: DEFAULT_TEAM_NAME,
    sourceMatchId: DEFAULT_MATCH_ID,
    opponent: DEFAULT_OPPONENT,
    kickoffTime: DEFAULT_KICKOFF,
    matchLabel: DEFAULT_MATCH_LABEL,
    write: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === '--file' && next) {
      options.file = next;
      index += 1;
    } else if (current === '--team-name' && next) {
      options.teamName = next;
      index += 1;
    } else if (current === '--match-id' && next) {
      options.sourceMatchId = next;
      index += 1;
    } else if (current === '--opponent' && next) {
      options.opponent = next;
      index += 1;
    } else if (current === '--kickoff' && next) {
      options.kickoffTime = next;
      index += 1;
    } else if (current === '--label' && next) {
      options.matchLabel = next;
      index += 1;
    } else if (current === '--write') {
      options.write = true;
    }
  }

  return options;
}

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const candidatePaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.resolve(process.cwd(), 'scripts/firebase-service-account.json')
  ].filter(Boolean);

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      return require(candidatePath);
    }
  }

  throw new Error('No service account found. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.');
}

function initializeFirestore() {
  if (!admin.apps.length) {
    const serviceAccount = loadServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    });
  }

  return admin.firestore();
}

function buildPlayerLookup(players) {
  const byNormalizedName = new Map();

  for (const player of players) {
    const fullName = `${player.firstName || ''} ${player.lastName || ''}`.trim();
    const normalizedName = normalizeName(fullName);
    if (!normalizedName) {
      continue;
    }

    const existing = byNormalizedName.get(normalizedName) || [];
    existing.push({
      id: player.id,
      fullName,
      team: player.team || '',
      position: player.position || ''
    });
    byNormalizedName.set(normalizedName, existing);
  }

  return byNormalizedName;
}

function mapStepoutPlayers(stepoutPlayers, playerLookup) {
  const mappings = [];
  const unmatched = [];
  const ambiguous = [];

  for (const playerName of stepoutPlayers) {
    const normalizedName = normalizeName(playerName);
    const aliasTarget = PLAYER_ALIASES[normalizedName];
    const resolvedName = aliasTarget || playerName;
    const resolvedNormalizedName = normalizeName(resolvedName);
    const matches = playerLookup.get(resolvedNormalizedName) || [];

    if (matches.length === 0) {
      unmatched.push({
        stepoutName: playerName,
        normalizedName,
        aliasTarget: aliasTarget || null
      });
      continue;
    }

    if (matches.length > 1) {
      ambiguous.push({
        stepoutName: playerName,
        matches: matches.map((match) => ({
          id: match.id,
          fullName: match.fullName,
          team: match.team
        }))
      });
      continue;
    }

    mappings.push({
      stepoutName: playerName,
      playerId: matches[0].id,
      playerName: matches[0].fullName,
      team: matches[0].team,
      position: matches[0].position,
      aliasApplied: aliasTarget || null
    });
  }

  return { mappings, unmatched, ambiguous };
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
  };
}

function incrementEventStats(playerStats, event) {
  playerStats.totalEvents += 1;

  const attributeKey = event.attribute || 'Unknown';
  const subAttributeKey = event.sub_attribute || 'Unknown';
  const actionKey = event.action || 'Unknown';
  const specialActionKey = event.special_action || 'Unknown';
  const bodyPartKey = event.body_part || 'Unknown';
  const periodKey = event.period || 'Unknown';
  const attributeLower = (event.attribute || '').toLowerCase();
  const subAttributeLower = (event.sub_attribute || '').toLowerCase();
  const actionLower = (event.action || '').toLowerCase();
  const descriptionLower = (event.description || '').toLowerCase();
  const specialActionLower = (event.special_action || '').toLowerCase();

  playerStats.eventsByAttribute[attributeKey] = (playerStats.eventsByAttribute[attributeKey] || 0) + 1;
  playerStats.eventsBySubAttribute[subAttributeKey] = (playerStats.eventsBySubAttribute[subAttributeKey] || 0) + 1;
  playerStats.eventsByAction[actionKey] = (playerStats.eventsByAction[actionKey] || 0) + 1;
  playerStats.eventsBySpecialAction[specialActionKey] = (playerStats.eventsBySpecialAction[specialActionKey] || 0) + 1;
  playerStats.eventsByBodyPart[bodyPartKey] = (playerStats.eventsByBodyPart[bodyPartKey] || 0) + 1;
  playerStats.eventsByPeriod[periodKey] = (playerStats.eventsByPeriod[periodKey] || 0) + 1;

  const isPassingAttempt = attributeLower.includes('passing') && !attributeLower.startsWith('x_');
  const isPassingReceive = attributeLower.includes('passing') && (attributeLower.startsWith('x_') || actionLower.includes('received'));

  if (isPassingAttempt) {
    playerStats.passing.total += 1;
    if (actionLower.includes('unsuccessful')) {
      playerStats.passing.unsuccessful += 1;
    } else {
      playerStats.passing.successful += 1;
    }
  }

  if (isPassingReceive) {
    playerStats.passing.received += 1;
  }

  if ((event.attribute || '').includes('Defending')) {
    playerStats.defending.total += 1;
    if ((event.sub_attribute || '').toLowerCase().includes('interception')) {
      playerStats.defending.interceptions += 1;
    }
    if (actionLower.includes('won') || (subAttributeLower.includes('duel') && actionLower.includes('successful'))) {
      playerStats.defending.duelsWon += 1;
    }
    if (actionLower.includes('lost') || (subAttributeLower.includes('duel') && actionLower.includes('unsuccessful'))) {
      playerStats.defending.duelsLost += 1;
    }
  }

  const encounterWinPattern = /evaded|resisted|successful|won|restricted/;
  const encounterLossPattern = /dribbled past|tackled|intercepted|pressed|unsuccessful|lost|encountered/;
  const isEncounterEvent = attributeLower.startsWith('x_') || subAttributeLower.includes('encountered');

  if (isEncounterEvent) {
    const encounterText = `${actionLower} ${descriptionLower}`;
    if (encounterWinPattern.test(encounterText) && !encounterLossPattern.test(encounterText)) {
      playerStats.encounters.won += 1;
    } else {
      playerStats.encounters.lost += 1;
    }
  }

  if ((event.attribute || '').includes('Attacking') || (event.attribute || '').includes('Shooting')) {
    playerStats.attacking.total += 1;
  }

  const isGoalEvent =
    (actionLower.includes('goal') || descriptionLower.includes(' goal')) &&
    !actionLower.includes('conceded') &&
    !descriptionLower.includes('conceded') &&
    !attributeLower.includes('goalkeeping');

  const isAssistEvent =
    (actionLower.includes('assist') || descriptionLower.includes('assist')) &&
    !actionLower.includes('received assist') &&
    !descriptionLower.includes('received assist');

  const isShotEvent =
    attributeLower.includes('shooting') ||
    actionLower.includes('shot') ||
    descriptionLower.includes('shot');

  if (isGoalEvent) {
    playerStats.attacking.goals += 1;
  }

  if (isAssistEvent) {
    playerStats.attacking.assists += 1;
  }

  if (isShotEvent) {
    playerStats.attacking.shots += 1;

    const isShotOnTarget =
      isGoalEvent ||
      actionLower.includes('saved') ||
      descriptionLower.includes('saved') ||
      actionLower.includes('on target') ||
      descriptionLower.includes('on target');

    const isShotOffTarget =
      actionLower.includes('off target') ||
      descriptionLower.includes('off target') ||
      actionLower.includes('wide') ||
      descriptionLower.includes('wide') ||
      actionLower.includes('miss') ||
      descriptionLower.includes('miss') ||
      actionLower.includes('post') ||
      descriptionLower.includes('post') ||
      actionLower.includes('crossbar') ||
      descriptionLower.includes('crossbar') ||
      actionLower.includes('bar') ||
      descriptionLower.includes('bar');

    if (isShotOnTarget) {
      playerStats.attacking.shotsOnTarget += 1;
    } else if (isShotOffTarget) {
      playerStats.attacking.shotsOffTarget += 1;
    }
  }

  const yellowCardPattern = /\byellow\b|\bcaution\b|\bbooked\b/;
  const redCardPattern = /\bred card\b|\bsent off\b|\bsecond yellow\b/;
  const cardText = `${specialActionLower} ${actionLower} ${descriptionLower}`;

  if (yellowCardPattern.test(cardText)) {
    playerStats.discipline.yellowCards += 1;
  }

  if (redCardPattern.test(cardText)) {
    playerStats.discipline.redCards += 1;
  }
}

function buildSummary(events, mappingsByName, options) {
  const playerStats = {};

  for (const event of events) {
    const mapping = mappingsByName.get(event.player_name.trim());
    if (!mapping) {
      continue;
    }

    if (!playerStats[mapping.playerId]) {
      playerStats[mapping.playerId] = {
        playerId: mapping.playerId,
        playerName: mapping.playerName,
        stepoutName: mapping.stepoutName,
        team: mapping.team,
        position: mapping.position,
        ...createStatBucket()
      };
    }

    incrementEventStats(playerStats[mapping.playerId], event);
  }

  return {
    source: 'stepout',
    sourceMatchId: String(options.sourceMatchId),
    teamName: options.teamName,
    opponent: options.opponent,
    kickoffTime: options.kickoffTime,
    matchLabel: options.matchLabel,
    importedAt: new Date().toISOString(),
    jsonFileName: path.basename(options.file),
    eventCount: events.length,
    playerCount: Object.keys(playerStats).length,
    playerMappings: Array.from(mappingsByName.values()),
    playerStats
  };
}

async function writeBatches(db, summaryId, events, mappingsByName) {
  const collectionRef = db.collection('matchAnalyses').doc(summaryId).collection('events');
  const chunkSize = 400;

  for (let index = 0; index < events.length; index += chunkSize) {
    const batch = db.batch();
    const chunk = events.slice(index, index + chunkSize);

    for (const event of chunk) {
      const mapping = mappingsByName.get(event.player_name.trim());
      const eventRef = collectionRef.doc(String(event.id));
      batch.set(eventRef, {
        ...event,
        source: 'stepout',
        sourceMatchId: String(event.match_id),
        playerId: mapping?.playerId || null,
        matchedPlayerName: mapping?.playerName || null
      });
    }

    await batch.commit();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const filePath = path.resolve(process.cwd(), options.file);
  const db = initializeFirestore();

  const rawEvents = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const filteredEvents = rawEvents.filter((event) => event.team_name === options.teamName);
  const uniquePlayers = Array.from(new Set(filteredEvents.map((event) => event.player_name.trim()))).sort();

  const playersSnapshot = await db.collection('players').get();
  const players = playersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const playerLookup = buildPlayerLookup(players);
  const { mappings, unmatched, ambiguous } = mapStepoutPlayers(uniquePlayers, playerLookup);

  const report = {
    matchLabel: options.matchLabel,
    opponent: options.opponent,
    kickoffTime: options.kickoffTime,
    sourceMatchId: String(options.sourceMatchId),
    eventCount: filteredEvents.length,
    uniquePlayers: uniquePlayers.length,
    matchedPlayers: mappings.length,
    unmatched,
    ambiguous,
    mappings
  };

  console.log(JSON.stringify(report, null, 2));

  if (unmatched.length > 0 || ambiguous.length > 0) {
    process.exit(1);
  }

  if (!options.write) {
    return;
  }

  const summaryId = `stepout-${String(options.sourceMatchId)}`;
  const mappingsByName = new Map(mappings.map((mapping) => [mapping.stepoutName, mapping]));
  const summary = buildSummary(filteredEvents, mappingsByName, options);

  await db.collection('matchAnalyses').doc(summaryId).set(summary, { merge: true });
  await writeBatches(db, summaryId, filteredEvents, mappingsByName);

  console.log(`Imported ${filteredEvents.length} BCC events into matchAnalyses/${summaryId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});