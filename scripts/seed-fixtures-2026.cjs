/**
 * Seed Bedfordview fixtures (2026) into Firestore.
 * Run with: node scripts/seed-fixtures-2026.cjs
 *
 * IMPORTANT: Requires Firebase Admin credentials in .env or GOOGLE_APPLICATION_CREDENTIALS.
 */

const admin = require('firebase-admin');
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
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

const fixtures = [
  {
    date: '2026-03-07',
    opponent: 'Tembisa Pistols',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-03-14',
    opponent: 'Thanda Aces',
    venue: 'Dunnottar',
    homeAway: 'Away',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-03-21',
    opponent: 'Kempton Park',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-03-28',
    opponent: 'Old Bens',
    venue: 'Currin Park',
    homeAway: 'Away',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-04-11',
    opponent: 'Alberton',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-04-18',
    opponent: 'Bonaero',
    venue: 'Bonaero 74',
    homeAway: 'Away',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-04-25',
    opponent: 'Benoni Northerns',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-05-02',
    opponent: 'Union',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-05-09',
    opponent: 'Highlands Park',
    venue: 'Gemmel Park',
    homeAway: 'Away',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-05-16',
    opponent: 'Impala',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'Cup',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-05-23',
    opponent: 'Luso Africa',
    venue: 'Hattingh Park',
    homeAway: 'Away',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-05-30',
    opponent: 'Olympia',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-06-06',
    opponent: 'Sporting',
    venue: 'Chris Park',
    homeAway: 'Away',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-06-13',
    opponent: 'Tembisa Pistols',
    venue: 'Tembisa',
    homeAway: 'Away',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-06-20',
    opponent: 'Thanda Aces',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-06-27',
    opponent: 'Kempton Park',
    venue: 'Kempton Park',
    homeAway: 'Away',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-07-04',
    opponent: 'Old Bens',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-07-11',
    opponent: 'Alberton',
    venue: 'DH Harris',
    homeAway: 'Away',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-07-18',
    opponent: 'Bonaero',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-07-25',
    opponent: 'Benoni Northerns',
    venue: 'North Areas',
    homeAway: 'Away',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-08-01',
    opponent: 'Union',
    venue: 'Turfontein',
    homeAway: 'Away',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-08-08',
    opponent: 'Highlands Park',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-08-15',
    opponent: 'Impala',
    venue: 'Impala Grounds',
    homeAway: 'Away',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-08-22',
    opponent: 'Luso Africa',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-08-29',
    opponent: 'Olympia',
    venue: 'Italian Club',
    homeAway: 'Away',
    competition: 'Cup',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  },
  {
    date: '2026-09-05',
    opponent: 'Sporting',
    venue: 'BCC',
    homeAway: 'Home',
    competition: 'League',
    team: 'First Team',
    time: '',
    status: 'Upcoming'
  }
];

async function seedFixtures() {
  console.log(`\nSeeding ${fixtures.length} fixtures...\n`);
  const fixturesRef = db.collection('fixtures');
  let created = 0;
  let skipped = 0;

  for (const fixture of fixtures) {
    const existing = await fixturesRef
      .where('date', '==', fixture.date)
      .where('opponent', '==', fixture.opponent)
      .where('team', '==', fixture.team)
      .get();

    if (!existing.empty) {
      skipped += 1;
      continue;
    }

    await fixturesRef.add({
      ...fixture,
      createdAt: new Date().toISOString()
    });
    created += 1;
  }

  console.log(`✓ Added ${created} fixtures`);
  console.log(`↷ Skipped ${skipped} existing fixtures`);
  console.log('\nDone.');
}

seedFixtures().catch((error) => {
  console.error('✖ Error seeding fixtures:', error);
  process.exit(1);
});
