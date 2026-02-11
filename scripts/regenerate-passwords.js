/**
 * Regenerate all coach and player passwords and prepare WhatsApp notifications.
 * Run with: node scripts/regenerate-passwords.js
 * 
 * IMPORTANT: Requires Firebase credentials in .env
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config();

// Initialize Firebase Admin SDK
// Make sure you have a service account key or set GOOGLE_APPLICATION_CREDENTIALS
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Try to initialize: if service account available, use it; else use web config
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
  console.error('⚠ Service account not available. Try setting GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON. Continuing with read-only mode for demo...');
  process.exit(1);
}

const db = admin.firestore();

// Password generator (same as frontend)
function generatePassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '@#$%';
  const allChars = uppercase + lowercase + numbers + special;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// WhatsApp message generator
function createWhatsAppMessage(firstName, lastName, username, password) {
  return `🎯 *BCC Coaches App - New Login Credentials*

Hello ${firstName}! 👋

Your account credentials have been reset for security reasons.

📱 **Username:** ${username}
🔐 **Password:** ${password}

🔗 **Login here:** [Your app URL]

⚠️ Please change your password after first login.
Keep these credentials safe and do not share with others.

Questions? Contact your coach.`;
}

function generateWhatsAppLink(phone, message) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

async function regeneratePasswords() {
  try {
    console.log('\n🔄 Starting password regeneration...\n');

    // Regenerate coach passwords
    console.log('📋 Processing coaches...');
    const coachesSnapshot = await db.collection('coaches').get();
    const coachUpdates = [];
    const coachMessages = [];

    coachesSnapshot.forEach((doc) => {
      const coach = doc.data();
      const newPassword = generatePassword(12);
      
      console.log(`  ✓ ${coach.fullName} (${coach.username})`);
      
      coachUpdates.push(
        db.collection('coaches').doc(doc.id).update({
          password: newPassword,
          passwordChangedAt: new Date().toISOString(),
        })
      );

      if (coach.phone) {
        const msg = createWhatsAppMessage(coach.fullName.split(' ')[0], coach.fullName.split(' ')[1] || '', coach.username, newPassword);
        const link = generateWhatsAppLink(coach.phone, msg);
        coachMessages.push({
          name: coach.fullName,
          username: coach.username,
          phone: coach.phone,
          password: newPassword,
          whatsappLink: link,
        });
      }
    });

    await Promise.all(coachUpdates);
    console.log(`✓ Updated ${coachUpdates.length} coaches\n`);

    // Regenerate player passwords
    console.log('📋 Processing players...');
    const playersSnapshot = await db.collection('players').get();
    const playerUpdates = [];
    const playerMessages = [];

    playersSnapshot.forEach((doc) => {
      const player = doc.data();
      const newPassword = generatePassword(12);
      
      console.log(`  ✓ ${player.firstName} ${player.lastName}`);
      
      playerUpdates.push(
        db.collection('players').doc(doc.id).update({
          password: newPassword,
          passwordChangedAt: new Date().toISOString(),
        })
      );

      if (player.phone) {
        const msg = createWhatsAppMessage(player.firstName, player.lastName, player.username, newPassword);
        const link = generateWhatsAppLink(player.phone, msg);
        playerMessages.push({
          name: `${player.firstName} ${player.lastName}`,
          username: player.username,
          phone: player.phone,
          password: newPassword,
          whatsappLink: link,
        });
      }
    });

    await Promise.all(playerUpdates);
    console.log(`✓ Updated ${playerUpdates.length} players\n`);

    // Save credentials and WhatsApp links to file
    const allMessages = [...coachMessages, ...playerMessages];
    const output = {
      timestamp: new Date().toISOString(),
      coachCount: coachUpdates.length,
      playerCount: playerUpdates.length,
      messagesWithPhone: allMessages.length,
      credentials: allMessages,
    };

    const outputFile = path.join(__dirname, 'password-reset-output.json');
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

    console.log('📄 Output saved to: scripts/password-reset-output.json');
    console.log(`\n✅ Password regeneration complete!`);
    console.log(`   Coaches: ${coachUpdates.length}`);
    console.log(`   Players: ${playerUpdates.length}`);
    console.log(`   Users with phone for WhatsApp: ${allMessages.length}\n`);

    // Print WhatsApp links
    if (allMessages.length > 0) {
      console.log('💬 WhatsApp Links (open in browser or mobile WhatsApp):');
      console.log('─'.repeat(80));
      allMessages.forEach((item) => {
        console.log(`\n${item.name} (@${item.username})`);
        console.log(`WhatsApp: ${item.whatsappLink}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during password regeneration:', error);
    process.exit(1);
  }
}

regeneratePasswords().then(() => {
  console.log('\n✅ All done! Check password-reset-output.json for credentials.\n');
  process.exit(0);
});
