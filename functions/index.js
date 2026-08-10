const { onCall, HttpsError } = require("firebase-functions/v2/https")
const { initializeApp } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")
const { FieldValue, getFirestore } = require("firebase-admin/firestore")

initializeApp()

const db = getFirestore()
const auth = getAuth()
const validRoles = new Set(["club-admin", "coach", "guardian", "player"])
const roleCollections = { "club-admin": "coaches", coach: "coaches", guardian: "guardians", player: "players" }

function requireCaller(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before managing accounts.")
  const role = request.auth.token.role
  if (!role) throw new HttpsError("permission-denied", "This account has no provisioning role.")
  return { uid: request.auth.uid, role, clubId: request.auth.token.clubId || "", teamIds: request.auth.token.teamIds || [] }
}

function text(value, max = 200) {
  return String(value || "").trim().slice(0, max)
}

function email(value) {
  const result = text(value, 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new HttpsError("invalid-argument", "A valid email address is required.")
  return result
}

function password(value) {
  const result = String(value || "")
  if (result.length < 8 || result.length > 128) throw new HttpsError("invalid-argument", "Temporary passwords must be 8 to 128 characters.")
  return result
}

function assertRolePermission(caller, requestedRole) {
  if (!validRoles.has(requestedRole)) throw new HttpsError("invalid-argument", "Unsupported account role.")
  if (caller.role === "super-admin") return
  if (caller.role === "club-admin" && ["coach", "guardian", "player"].includes(requestedRole)) return
  if (caller.role === "coach" && ["guardian", "player"].includes(requestedRole)) return
  throw new HttpsError("permission-denied", "You cannot create this type of account.")
}

async function assertScopedReferences(clubId, profile) {
  const teamIds = [...new Set([profile.teamId, ...(profile.teamIds || [])].filter(Boolean))]
  for (const teamId of teamIds) {
    const team = await db.collection("teams").doc(teamId).get()
    if (!team.exists || team.data().clubId !== clubId) throw new HttpsError("invalid-argument", "Every selected team must belong to the account's club.")
  }
  for (const playerId of profile.playerIds || []) {
    const player = await db.collection("players").doc(playerId).get()
    if (!player.exists || player.data().clubId !== clubId) throw new HttpsError("invalid-argument", "Every linked player must belong to the account's club.")
  }
}

exports.provisionAccount = onCall({ region: "us-central1", enforceAppCheck: false }, async request => {
  const caller = requireCaller(request)
  const data = request.data || {}
  const role = text(data.role, 30)
  assertRolePermission(caller, role)

  const clubId = caller.role === "super-admin" ? text(data.clubId, 128) : caller.clubId
  if (!clubId) throw new HttpsError("invalid-argument", "A club assignment is required.")
  const club = await db.collection("clubs").doc(clubId).get()
  if (!club.exists) throw new HttpsError("not-found", "The selected club does not exist.")

  const accountEmail = email(data.email)
  const temporaryPassword = password(data.password)
  const displayName = text(data.displayName || data.profile?.fullName || `${data.profile?.firstName || ""} ${data.profile?.lastName || ""}`, 120)
  if (!displayName) throw new HttpsError("invalid-argument", "The account holder's name is required.")

  const profile = { ...(data.profile || {}) }
  delete profile.password
  delete profile.id
  delete profile.uid
  profile.clubId = clubId
  profile.role = role
  profile.authEmail = accountEmail
  profile.email = accountEmail
  profile.username = accountEmail
  profile.authProvisioningStatus = "active"
  profile.createdAt = FieldValue.serverTimestamp()
  profile.createdBy = caller.uid
  if (role === "club-admin") profile.onboardingComplete = Boolean(profile.onboardingComplete)

  await assertScopedReferences(clubId, profile)

  let user
  try {
    user = await auth.createUser({ email: accountEmail, password: temporaryPassword, displayName, emailVerified: false })
    const claims = {
      role,
      clubId,
      teamId: profile.teamId || "",
      teamIds: [...new Set(profile.teamIds || (profile.teamId ? [profile.teamId] : []))],
      playerIds: [...new Set(profile.playerIds || [])],
      onboardingComplete: Boolean(profile.onboardingComplete)
    }
    await auth.setCustomUserClaims(user.uid, claims)
    await db.collection(roleCollections[role]).doc(user.uid).set(profile)
    await db.collection("auditLogs").add({
      action: "account-provisioned", entityType: role, entityId: user.uid, actorUid: caller.uid,
      clubId, teamId: profile.teamId || "", createdAt: FieldValue.serverTimestamp()
    })
    return { uid: user.uid, email: accountEmail, role }
  } catch (error) {
    if (user?.uid) await auth.deleteUser(user.uid).catch(() => {})
    if (error.code === "auth/email-already-exists") throw new HttpsError("already-exists", "An account already uses this email address.")
    if (error instanceof HttpsError) throw error
    console.error("provisionAccount failed", error)
    throw new HttpsError("internal", "The account could not be provisioned.")
  }
})

exports.createClubWithAdmin = onCall({ region: "us-central1", enforceAppCheck: false }, async request => {
  const caller = requireCaller(request)
  if (caller.role !== "super-admin") throw new HttpsError("permission-denied", "Only the platform administrator can create clubs.")

  const data = request.data || {}
  const clubData = data.club || {}
  const adminData = data.admin || {}
  const name = text(clubData.name, 120)
  const code = text(clubData.code, 20).toUpperCase()
  if (!name || !code) throw new HttpsError("invalid-argument", "Club name and code are required.")
  const accountEmail = email(adminData.email)
  const temporaryPassword = password(adminData.password)
  const adminName = text(adminData.fullName, 120)
  if (!adminName) throw new HttpsError("invalid-argument", "Administrator name is required.")

  const duplicateCode = await db.collection("clubs").where("code", "==", code).limit(1).get()
  if (!duplicateCode.empty) throw new HttpsError("already-exists", "That club code is already in use.")

  const clubRef = db.collection("clubs").doc()
  let user
  try {
    user = await auth.createUser({ email: accountEmail, password: temporaryPassword, displayName: adminName, emailVerified: false })
    await auth.setCustomUserClaims(user.uid, { role: "club-admin", clubId: clubRef.id, teamId: "", teamIds: [], playerIds: [], onboardingComplete: false })
    const batch = db.batch()
    batch.set(clubRef, {
      name, code, contactPerson: text(clubData.contactPerson, 120), email: email(clubData.email),
      phone: text(clubData.phone, 40), region: text(clubData.region, 120), activeSeason: text(clubData.activeSeason, 30),
      enabledSports: Array.isArray(clubData.enabledSports) ? clubData.enabledSports.slice(0, 10) : [],
      status: "onboarding", onboardingComplete: false, modules: { playerLogin: false },
      createdAt: FieldValue.serverTimestamp(), createdBy: caller.uid
    })
    batch.set(db.collection("coaches").doc(user.uid), {
      clubId: clubRef.id, teamId: "", teamIds: [], fullName: adminName, email: accountEmail,
      authEmail: accountEmail, username: accountEmail, role: "club-admin", onboardingComplete: false,
      authProvisioningStatus: "active", createdAt: FieldValue.serverTimestamp(), createdBy: caller.uid
    })
    await batch.commit()
    return { clubId: clubRef.id, uid: user.uid, email: accountEmail }
  } catch (error) {
    if (user?.uid) await auth.deleteUser(user.uid).catch(() => {})
    await clubRef.delete().catch(() => {})
    if (error.code === "auth/email-already-exists") throw new HttpsError("already-exists", "An account already uses this administrator email.")
    if (error instanceof HttpsError) throw error
    console.error("createClubWithAdmin failed", error)
    throw new HttpsError("internal", "The club and administrator could not be created.")
  }
})

exports.deactivateAccount = onCall({ region: "us-central1", enforceAppCheck: false }, async request => {
  const caller = requireCaller(request)
  if (!["super-admin", "club-admin"].includes(caller.role)) throw new HttpsError("permission-denied", "Administrator access is required.")
  const uid = text(request.data?.uid, 128)
  const role = text(request.data?.role, 30)
  if (!uid || !validRoles.has(role)) throw new HttpsError("invalid-argument", "A valid account is required.")
  if (uid === caller.uid) throw new HttpsError("failed-precondition", "You cannot deactivate your own account.")

  const profileRef = db.collection(roleCollections[role]).doc(uid)
  const profile = await profileRef.get()
  if (!profile.exists) throw new HttpsError("not-found", "The account profile was not found.")
  if (caller.role !== "super-admin" && profile.data().clubId !== caller.clubId) throw new HttpsError("permission-denied", "This account belongs to another club.")
  if (role === "club-admin" && caller.role !== "super-admin") throw new HttpsError("permission-denied", "Only the platform administrator can deactivate a club administrator.")

  await auth.updateUser(uid, { disabled: true })
  await profileRef.update({ archived: true, archivedAt: FieldValue.serverTimestamp(), archivedReason: "Account deactivated", authProvisioningStatus: "disabled" })
  await db.collection("auditLogs").add({
    action: "account-deactivated", entityType: role, entityId: uid, actorUid: caller.uid,
    clubId: profile.data().clubId || "", teamId: profile.data().teamId || "", createdAt: FieldValue.serverTimestamp()
  })
  return { uid, disabled: true }
})

exports.updateAccountAccess = onCall({ region: "us-central1", enforceAppCheck: false }, async request => {
  const caller = requireCaller(request)
  const uid = text(request.data?.uid, 128)
  const role = text(request.data?.role, 30)
  assertRolePermission(caller, role)
  if (!uid || !validRoles.has(role)) throw new HttpsError("invalid-argument", "A valid account is required.")

  const profileRef = db.collection(roleCollections[role]).doc(uid)
  const snapshot = await profileRef.get()
  if (!snapshot.exists) throw new HttpsError("not-found", "The account profile was not found.")
  const existing = snapshot.data()
  if (caller.role !== "super-admin" && existing.clubId !== caller.clubId) throw new HttpsError("permission-denied", "This account belongs to another club.")
  if (role === "club-admin" && caller.role !== "super-admin" && uid !== caller.uid) throw new HttpsError("permission-denied", "Only the platform administrator can update another club administrator.")

  const access = request.data?.access || {}
  const merged = {
    ...existing,
    teamId: text(access.teamId ?? existing.teamId, 128),
    teamIds: Array.isArray(access.teamIds) ? [...new Set(access.teamIds.map(value => text(value, 128)).filter(Boolean))] : existing.teamIds || [],
    playerIds: Array.isArray(access.playerIds) ? [...new Set(access.playerIds.map(value => text(value, 128)).filter(Boolean))] : existing.playerIds || [],
    onboardingComplete: access.onboardingComplete === undefined ? Boolean(existing.onboardingComplete) : Boolean(access.onboardingComplete)
  }
  await assertScopedReferences(existing.clubId, merged)
  await auth.setCustomUserClaims(uid, {
    role, clubId: existing.clubId, teamId: merged.teamId || "", teamIds: merged.teamIds,
    playerIds: merged.playerIds, onboardingComplete: merged.onboardingComplete
  })
  return { uid, claimsUpdated: true }
})
