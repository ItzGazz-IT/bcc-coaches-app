# Fixtures Seed (2026)

This script adds the Bedfordview 2026 fixtures to Firestore so they appear in Fixtures and Calendar.

## Prerequisites
- Node.js installed
- Firebase Admin SDK credentials (service account key)

## Setup

1. Install dependencies (if not already done):
```bash
npm install firebase-admin dotenv
```

2. Create a Firebase service account key:
- Firebase Console -> Project Settings -> Service Accounts
- Generate new private key
- Save it to: scripts/firebase-service-account.json (do not commit)

3. Set environment variable (Windows PowerShell):
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\gareth.vandenaardweg\Downloads\bcc-app\scripts\firebase-service-account.json"
```

Optional: you can also set the Vite env vars in a .env.local file:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Run
```bash
node scripts/seed-fixtures-2026.cjs
```

The script skips any fixtures that already exist (matching date, opponent, and team).
