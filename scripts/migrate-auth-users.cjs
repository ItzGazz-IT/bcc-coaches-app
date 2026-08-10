#!/usr/bin/env node
/*
 * Migrates legacy Firestore accounts to Firebase Authentication.
 *
 * Dry run:  npm run auth:migrate
 * Apply:    npm run auth:migrate -- --apply
 * Cleanup:  npm run auth:migrate -- --apply --remove-passwords
 *
 * Cleanup is deliberately separate. Verify every role can sign in against the
 * hardened rules before removing the legacy password fields.
 */
require('dotenv').config()
const admin = require('firebase-admin')

const apply = process.argv.includes('--apply')
const removePasswords = process.argv.includes('--remove-passwords')
const authDomain = (process.env.AUTH_EMAIL_DOMAIN || 'auth.unyra.app').toLowerCase()

if (removePasswords && !apply) {
  throw new Error('--remove-passwords requires --apply')
}

function initialize() {
  if (admin.apps.length) return
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) })
    return
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() })
    return
  }
  throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON before running this migration.')
}

const validEmail = value => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const loginEmail = (data, id) => {
  if (validEmail(data.authEmail)) return data.authEmail.toLowerCase()
  if (validEmail(data.email)) return data.email.toLowerCase()
  const source = String(data.username || id).toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/^-+|-+$/g, '')
  return `${source || id}@${authDomain}`
}

const collections = [
  { name: 'coaches', defaultRole: 'coach' },
  { name: 'guardians', defaultRole: 'guardian' },
  { name: 'players', defaultRole: 'player' }
]

async function migrate() {
  initialize()
  const db = admin.firestore()
  const auth = admin.auth()
  const seenEmails = new Map()
  const playerSnapshot = await db.collection('players').get()
  const playerTeams = new Map(playerSnapshot.docs.map(item => [item.id, item.data().teamId]).filter(([, teamId]) => teamId))
  let planned = 0
  let migrated = 0

  for (const source of collections) {
    const snapshot = await db.collection(source.name).get()
    for (const record of snapshot.docs) {
      const data = record.data()
      if (data.archived || data.status === 'disabled') continue
      const email = loginEmail(data, record.id)
      if (seenEmails.has(email)) throw new Error(`Duplicate login email ${email} for ${record.ref.path} and ${seenEmails.get(email)}`)
      seenEmails.set(email, record.ref.path)
      const role = data.role || source.defaultRole
      const teamIds = data.teamIds?.length
        ? data.teamIds
        : data.teamId
          ? [data.teamId]
          : role === 'guardian'
            ? [...new Set((data.playerIds || []).map(playerId => playerTeams.get(playerId)).filter(Boolean))]
            : []
      const claims = {
        role,
        ...(data.clubId ? { clubId: data.clubId } : {}),
        ...(data.teamId ? { teamId: data.teamId } : {}),
        ...(teamIds.length ? { teamIds } : {}),
        ...(data.playerIds?.length ? { playerIds: data.playerIds } : {}),
        ...(typeof data.onboardingComplete === 'boolean' ? { onboardingComplete: data.onboardingComplete } : {})
      }
      planned += 1
      console.log(`${apply ? 'MIGRATE' : 'PLAN'} ${record.ref.path} -> ${email} (${role})`)
      if (!apply) continue
      if (!data.password || String(data.password).length < 6) {
        throw new Error(`${record.ref.path} has no Firebase-compatible legacy password (minimum 6 characters).`)
      }
      try {
        await auth.getUser(record.id)
        await auth.updateUser(record.id, { email, displayName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.username, disabled: false })
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error
        await auth.createUser({ uid: record.id, email, password: String(data.password), displayName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.username })
      }
      await auth.setCustomUserClaims(record.id, claims)
      await record.ref.set({ authUid: record.id, authEmail: email, authMigratedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
      if (removePasswords) await record.ref.update({ password: admin.firestore.FieldValue.delete() })
      migrated += 1
    }
  }

  console.log(`${apply ? `Migrated ${migrated}` : `Planned ${planned}`} account(s).`)
  if (apply && !removePasswords) console.log('Passwords were retained. Verify logins, then rerun with --apply --remove-passwords.')
}

migrate().catch(error => { console.error(error); process.exitCode = 1 })
