/**
 * Delete games up to today from Firestore.
 *
 * Collections:
 * - fixtures: deletes docs where date <= today (YYYY-MM-DD)
 * - awayGames: deletes docs where date <= today (YYYY-MM-DD)
 *
 * Run:
 *   node scripts/delete-games-up-to-now.cjs
 *
 * Requires either:
 * - GOOGLE_APPLICATION_CREDENTIALS, or
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

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function deleteDocsByDate(collectionName, cutoffDate) {
  const snapshot = await db
    .collection(collectionName)
    .where('date', '<=', cutoffDate)
    .get();

  if (snapshot.empty) {
    return 0;
  }

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

async function run() {
  const cutoffDate = getTodayDateString();
  console.log(`\nDeleting games with date <= ${cutoffDate}...`);

  const fixturesDeleted = await deleteDocsByDate('fixtures', cutoffDate);
  const awayGamesDeleted = await deleteDocsByDate('awayGames', cutoffDate);

  console.log(`✓ Deleted from fixtures: ${fixturesDeleted}`);
  console.log(`✓ Deleted from awayGames: ${awayGamesDeleted}`);
  console.log('Done.');
}

run().catch((error) => {
  console.error('✖ Failed to delete games up to now:', error);
  process.exit(1);
});
