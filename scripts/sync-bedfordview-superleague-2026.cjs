/**
 * Sync Bedfordview Superleague 2026 fixtures from wononwon reference.
 *
 * - Seeds FIRST TEAM fixtures for Bedfordview.
 * - Seeds RESERVE TEAM fixtures from reserve competition reference.
 *
 * Run:
 *   node scripts/sync-bedfordview-superleague-2026.cjs
 *
 * Requires one of:
 * - GOOGLE_APPLICATION_CREDENTIALS
 * - FIREBASE_SERVICE_ACCOUNT_JSON
 */

const admin = require('firebase-admin');
require('dotenv').config();

const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : require(process.env.GOOGLE_APPLICATION_CREDENTIALS || '');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    });
    console.log('✓ Firebase Admin SDK initialized with service account');
  } else {
    throw new Error('No service account found');
  }
} catch (err) {
  console.error('✖ Service account not available. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.');
  process.exit(1);
}

const db = admin.firestore();

// First-team Bedfordview fixtures derived from wononwon competition 3597.
const firstTeamFixtures = [
  { date: '2026-03-07', opponent: 'TEMBISA PISTOLS', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '2-4', result: 'Loss', status: 'Completed' },
  { date: '2026-03-14', opponent: 'ORIGIN', venue: '', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-03-21', opponent: 'BENONI NORTHERNS', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '1-2', result: 'Loss', status: 'Completed' },
  { date: '2026-03-28', opponent: 'OLD BENS', venue: 'CURRIN PARK', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-04-11', opponent: 'ALBERTON', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-04-18', opponent: 'BONAERO', venue: 'Bonaero 74 Club', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-04-25', opponent: 'KEMPTON PARK', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-05-02', opponent: 'DESPORTIVO', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-05-09', opponent: 'HIGHLANDS PARK', venue: 'GEMMEL PARK', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-05-16', opponent: 'IMPALA', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-05-23', opponent: 'LUSO AFRICA', venue: 'HATTINGH PARK', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-05-30', opponent: 'OLYMPIA', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-06-06', opponent: 'SPORTING', venue: 'Chris Park', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-06-13', opponent: 'TEMBISA PISTOLS', venue: '', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-06-20', opponent: 'ORIGIN', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-06-27', opponent: 'KEMPTON PARK', venue: 'KEMPTON PARK', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-07-04', opponent: 'OLD BENS', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-07-11', opponent: 'ALBERTON', venue: 'DH HARRIS', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-07-18', opponent: 'BONAERO', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-07-25', opponent: 'BENONI NORTHERNS', venue: 'North Areas', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-08-01', opponent: 'DESPORTIVO', venue: '', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-08-08', opponent: 'HIGHLANDS PARK', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-08-15', opponent: 'IMPALA', venue: 'Impala Plats', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-08-22', opponent: 'LUSO AFRICA', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-08-29', opponent: 'OLYMPIA', venue: 'ITALIAN CLUB', homeAway: 'Away', time: '15:30', score: '', result: '', status: 'Upcoming' },
  { date: '2026-09-05', opponent: 'SPORTING', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '15:30', score: '', result: '', status: 'Upcoming' }
];

// Reserve-team Bedfordview fixtures derived from wononwon competition 3598.
const reserveTeamFixtures = [
  { date: '2026-03-07', opponent: 'TEMBISA PISTOLS', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '1-3', result: 'Loss', status: 'Completed' },
  { date: '2026-03-14', opponent: 'ORIGIN', venue: '', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-03-21', opponent: 'BENONI NORTHERNS', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '2-1', result: 'Win', status: 'Completed' },
  { date: '2026-03-28', opponent: 'OLD BENS', venue: 'CURRIN PARK', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-04-11', opponent: 'ALBERTON', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-04-18', opponent: 'BONAERO', venue: 'Bonaero 74 Club', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-04-25', opponent: 'KEMPTON PARK', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-05-02', opponent: 'DESPORTIVO', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-05-09', opponent: 'HIGHLANDS PARK', venue: 'GEMMEL PARK', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-05-16', opponent: 'IMPALA', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-05-23', opponent: 'LUSO AFRICA', venue: 'HATTINGH PARK', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-05-30', opponent: 'OLYMPIA', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-06-06', opponent: 'SPORTING', venue: 'Chris Park', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-06-13', opponent: 'TEMBISA PISTOLS', venue: '', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-06-20', opponent: 'ORIGIN', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-06-27', opponent: 'KEMPTON PARK', venue: 'KEMPTON PARK', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-07-04', opponent: 'OLD BENS', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-07-11', opponent: 'ALBERTON', venue: 'DH HARRIS', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-07-18', opponent: 'BONAERO', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-07-25', opponent: 'BENONI NORTHERNS', venue: 'NORTHERN AREAS', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-08-01', opponent: 'DESPORTIVO', venue: '', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-08-08', opponent: 'HIGHLANDS PARK', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-08-15', opponent: 'IMPALA', venue: 'Impala Plats', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-08-22', opponent: 'LUSO AFRICA', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-08-29', opponent: 'OLYMPIA', venue: 'ITALIAN CLUB', homeAway: 'Away', time: '13:45', score: '', result: '', status: 'Upcoming' },
  { date: '2026-09-05', opponent: 'SPORTING', venue: 'BEDFORDVIEW COUNTRY CLUB', homeAway: 'Home', time: '13:45', score: '', result: '', status: 'Upcoming' }
];

async function deleteExistingBedfordviewFixtures() {
  const fixturesRef = db.collection('fixtures');
  const snapshot = await fixturesRef.where('competition', '==', 'SUPERLEAGUE 2026 - SENIORS').get();

  if (snapshot.empty) return 0;

  const batchSize = 400;
  const docs = snapshot.docs;
  let deleted = 0;

  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const batch = db.batch();

    for (const docSnap of chunk) {
      batch.delete(docSnap.ref);
      deleted += 1;
    }

    await batch.commit();
  }

  return deleted;
}

async function seedFixtures(fixtures, teamName, sourceId) {
  const fixturesRef = db.collection('fixtures');

  for (const fixture of fixtures) {
    await fixturesRef.add({
      ...fixture,
      team: teamName,
      competition: 'SUPERLEAGUE 2026 - SENIORS',
      createdAt: new Date().toISOString(),
      source: sourceId
    });
  }

  return fixtures.length;
}

async function run() {
  console.log('\nSyncing Bedfordview Superleague fixtures...');

  const deleted = await deleteExistingBedfordviewFixtures();
  console.log(`- Deleted existing SUPERLEAGUE fixtures: ${deleted}`);

  const firstCount = await seedFixtures(firstTeamFixtures, 'First Team', 'wononwon-competition-3597');
  const reserveCount = await seedFixtures(reserveTeamFixtures, 'Reserve Team', 'wononwon-competition-3598');

  console.log(`✓ Seeded First Team fixtures: ${firstCount}`);
  console.log(`✓ Seeded Reserve Team fixtures: ${reserveCount}`);
  console.log('Done.');
}

run().catch((error) => {
  console.error('✖ Failed to sync Bedfordview fixtures:', error);
  process.exit(1);
});
