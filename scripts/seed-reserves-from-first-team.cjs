/**
 * Create Reserve Team fixtures from existing First Team fixtures.
 * Run with: node scripts/seed-reserves-from-first-team.cjs
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

async function seedReservesFromFirstTeam() {
  console.log('\nLoading First Team fixtures...');
  const fixturesRef = db.collection('fixtures');
  const firstTeamSnapshot = await fixturesRef.where('team', '==', 'First Team').get();

  console.log(`Found ${firstTeamSnapshot.size} First Team fixtures.`);

  let created = 0;
  let skipped = 0;

  for (const doc of firstTeamSnapshot.docs) {
    const fixture = doc.data();

    const reserveFixture = {
      ...fixture,
      team: 'Reserve Team',
      time: '13:45',
      createdAt: new Date().toISOString(),
    };

    const existing = await fixturesRef
      .where('team', '==', 'Reserve Team')
      .where('date', '==', fixture.date)
      .where('opponent', '==', fixture.opponent)
      .where('venue', '==', fixture.venue || '')
      .where('homeAway', '==', fixture.homeAway || '')
      .where('competition', '==', fixture.competition || '')
      .get();

    if (!existing.empty) {
      skipped += 1;
      continue;
    }

    await fixturesRef.add(reserveFixture);
    created += 1;
  }

  console.log(`\n✓ Added ${created} Reserve Team fixtures`);
  console.log(`↷ Skipped ${skipped} existing fixtures`);
  console.log('Done.');
}

seedReservesFromFirstTeam().catch((error) => {
  console.error('✖ Error seeding reserves fixtures:', error);
  process.exit(1);
});
