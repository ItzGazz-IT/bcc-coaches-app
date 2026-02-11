# Password Reset & Remediation Guide

## Overview
After the security incident (hardcoded passwords exposed in git), all coach and player passwords must be regenerated and users notified.

## Option A: Automated Regeneration (Recommended)

### Prerequisites
- Node.js installed (`node --version`)
- Firebase Admin SDK credentials (service account key)

### Setup

1. **Install dependencies** (if not already done):
```bash
npm install firebase-admin dotenv
```

2. **Get Firebase service account key**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Settings (⚙) → Service Accounts
   - Generate new private key
   - Save as `firebase-service-account.json` in `scripts/` folder (DO NOT COMMIT)

3. **Set environment variable**:
   - On Windows (PowerShell):
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\gareth.vandenaardweg\Downloads\bcc-app\scripts\firebase-service-account.json"
   ```
   
   - Or create a `.env.local` in the project root:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-service-account.json
   ```

### Run the Script

```bash
cd scripts
node regenerate-passwords.js
```

**Output**: Creates `scripts/password-reset-output.json` with WhatsApp links for each user.

### Send WhatsApp Messages

Open each WhatsApp link from the output in a mobile device or WhatsApp Web:
```
https://wa.me/<phone>?text=<message>
```

---

## Option B: Manual Reset (Via Firebase Console)

1. Go to [Firebase Console](https://console.firebase.google.com) → Your Project
2. Navigate to **Firestore Database**
3. Open **"coaches"** collection
4. Click each document → **Edit**
5. Update the `password` field to a strong new password
6. Click **Update**
7. Repeat for **"players"** collection
8. Send new credentials to each user via WhatsApp, SMS, or email

---

## What to Send Users

Use this template for WhatsApp messages:

```
🎯 *BCC Coaches App - Account Reset* 🎯

Hello [Name]! 👋

For security reasons, your login credentials have been reset.

📱 **Username:** [username]
🔐 **Password:** [newpassword]

🔗 **Login here:** [Your App URL]

⚠️ IMPORTANT:
• Change your password after first login
• Do not share these credentials
• Contact your coach if you have questions

Stay secure! 🔒
```

---

## Verification Checklist

After password reset:
- [ ] All coaches can log in with new passwords
- [ ] All players can log in with new passwords
- [ ] Old hardcoded passwords no longer work
- [ ] `regenerate-passwords.js` script is not committed (it uses service account key)
- [ ] Service account key file (`firebase-service-account.json`) is in `.gitignore`
- [ ] Users have acknowledged receipt of new credentials

---

## Security Best Practices Going Forward

1. **Never commit passwords** to git (this repo has `.env` in `.gitignore` now)
2. **Use environment variables** for all secrets
3. **Rotate keys regularly** (quarterly or after incidents)
4. **Enable 2FA** if possible (Firebase Auth, or app-level PIN)
5. **Audit access logs** periodically
6. **Use a password manager** (1Password, LastPass, etc.)

---

## Questions?

Refer to `SECURITY.md` for full remediation steps.
