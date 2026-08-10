import { createContext, useContext, useState, useEffect } from "react"
import { db } from "../firebase/config"
import { collection, documentId, getDoc, getDocs, addDoc, deleteDoc, deleteField, doc, onSnapshot, updateDoc, query, where, setDoc, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { auth } from "../firebase/config"
import { initializeNotifications, checkForNewReviews, checkForNewFitnessTests, checkForNewFixtures } from "../services/notificationService"

const AppContext = createContext()

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}

export const AppProvider = ({ children }) => {
  const [players, setPlayers] = useState([])
  const [coaches, setCoaches] = useState([])
  const [guardians, setGuardians] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [injuries, setInjuries] = useState([])
  const [fitnessTests, setFitnessTests] = useState([])
  const [reviews, setReviews] = useState([])
  const [fixtures, setFixtures] = useState([])
  const [matchAnalyses, setMatchAnalyses] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [clubs, setClubs] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [authReady, setAuthReady] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [userRole, setUserRole] = useState(null) // 'super-admin', 'club-admin', 'coach', 'guardian' or 'player'
  const [currentUser, setCurrentUser] = useState(null)
  const [currentPlayerId, setCurrentPlayerId] = useState(null) // ID of logged-in player
  const [currentUserProfile, setCurrentUserProfile] = useState(null)
  const [currentClubId, setCurrentClubIdState] = useState("")
  const [currentTeamId, setCurrentTeamIdState] = useState("")

  const setCurrentClubId = (clubId) => {
    setCurrentClubIdState(clubId || "")
    localStorage.setItem("team-manager-club-id", clubId || "")
  }

  const setCurrentTeamId = (teamId) => {
    setCurrentTeamIdState(teamId || "")
    localStorage.setItem("team-manager-team-id", teamId || "")
  }

  useEffect(() => onAuthStateChanged(auth, async firebaseUser => {
    setAuthUser(firebaseUser)
    if (!firebaseUser) {
      setUserRole(null)
      setCurrentUser(null)
      setCurrentPlayerId(null)
      setCurrentUserProfile(null)
      setCurrentClubId("")
      setCurrentTeamId("")
      setAuthReady(true)
      setLoading(false)
      return
    }

    try {
      const token = await firebaseUser.getIdTokenResult()
      const role = token.claims.role
      const profileCollection = role === "player" ? "players" : role === "guardian" ? "guardians" : "coaches"
      if (!["super-admin", "club-admin", "coach", "guardian", "player"].includes(role)) {
        throw new Error("Account has no valid role claim.")
      }
      const profileSnapshot = await getDoc(doc(db, profileCollection, firebaseUser.uid))
      const profile = profileSnapshot.exists() ? { id: profileSnapshot.id, ...profileSnapshot.data() } : {}
      const playerIds = token.claims.playerIds || profile.playerIds || []
      const teamIds = token.claims.teamIds || profile.teamIds || []
      setUserRole(role)
      setCurrentUser(firebaseUser.email)
      setCurrentUserProfile({ ...profile, uid: firebaseUser.uid, email: firebaseUser.email, role, playerIds, teamIds, teamId: token.claims.teamId || profile.teamId || "", clubId: token.claims.clubId || profile.clubId || "" })
      setCurrentPlayerId(role === "player" ? firebaseUser.uid : role === "guardian" ? playerIds[0] || null : null)
      setCurrentClubId(role === "super-admin" ? "" : token.claims.clubId || profile.clubId || "")
      setCurrentTeamId(role === "super-admin" ? "" : token.claims.teamId || teamIds[0] || profile.teamId || "")
    } catch (error) {
      console.error("Could not restore authenticated session:", error)
      await signOut(auth)
    } finally {
      setAuthReady(true)
    }
  }), [])

  const logout = async () => {
    await signOut(auth)
    ;["team-manager-user", "team-manager-role", "team-manager-player-id", "team-manager-login-expiry", "team-manager-profile", "team-manager-club-id", "team-manager-team-id", "unyra-platform-session"].forEach(key => localStorage.removeItem(key))
  }

  const applyScope = (record) => ({
    ...record,
    ...(!record.clubId && currentClubId ? { clubId: currentClubId } : {}),
    ...(!record.teamId && currentTeamId ? { teamId: currentTeamId } : {}),
    ...(!record.sportId && currentTeamId ? { sportId: teams.find(team => team.id === currentTeamId)?.sportId || "football" } : {})
  })

  const withoutPassword = record => {
    const safeRecord = { ...record }
    delete safeRecord.password
    return safeRecord
  }

  const recordAudit = async (action, entityType, entityId, changes = {}) => {
    if (userRole === "player" || userRole === "guardian") return
    try {
      await addDoc(collection(db, "auditLogs"), {
        action, entityType, entityId, changes,
        actor: currentUser || currentUserProfile?.username || "unknown",
        actorRole: userRole || "unknown",
        clubId: currentClubId || changes.clubId || "",
        teamId: changes.teamId || currentTeamId || "",
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error("Error recording audit log:", error)
    }
  }

  const canAccess = (record) => {
    if (!userRole) return false
    if (userRole === "super-admin") {
      if (currentClubId && record.clubId !== currentClubId) return false
      if (currentTeamId && record.teamId !== currentTeamId) return false
      return true
    }
    if (userRole === "club-admin") return Boolean(currentClubId) && record.clubId === currentClubId
    if (userRole === "coach") {
      const assignedTeams = currentUserProfile?.teamIds || [currentUserProfile?.teamId].filter(Boolean)
      return assignedTeams.includes(record.teamId)
    }
    if (userRole === "player") return record.teamId === currentTeamId
    if (userRole === "guardian") return currentUserProfile?.playerIds?.includes(record.id) || record.teamId === currentTeamId
    return false
  }

  const teamIdsForSession = () => {
    const ids = userRole === "guardian"
      ? currentUserProfile?.teamIds || []
      : currentUserProfile?.teamIds || [currentTeamId || currentUserProfile?.teamId].filter(Boolean)
    return [...new Set(ids)].slice(0, 10)
  }

  const teamDataQuery = collectionName => {
    const ref = collection(db, collectionName)
    if (userRole === "super-admin") return ref
    if (userRole === "club-admin") return currentClubId ? query(ref, where("clubId", "==", currentClubId)) : null
    const ids = teamIdsForSession()
    if (!ids.length) return null
    return ids.length === 1 ? query(ref, where("teamId", "==", ids[0])) : query(ref, where("teamId", "in", ids))
  }

  const playerQuery = () => {
    const ref = collection(db, "players")
    if (userRole === "super-admin") return ref
    if (userRole === "club-admin") return currentClubId ? query(ref, where("clubId", "==", currentClubId)) : null
    if (userRole === "player") return authUser ? query(ref, where(documentId(), "==", authUser.uid)) : null
    if (userRole === "guardian") {
      const ids = (currentUserProfile?.playerIds || []).slice(0, 10)
      return ids.length ? query(ref, where(documentId(), "in", ids)) : null
    }
    return teamDataQuery("players")
  }

  useEffect(() => {
    if (currentUserProfile) localStorage.setItem("team-manager-profile", JSON.stringify(currentUserProfile))
    else localStorage.removeItem("team-manager-profile")
  }, [currentUserProfile])
  
  // Notification tracking - stores last seen timestamp for each category
  const [lastSeen, setLastSeen] = useState(() => {
    const saved = localStorage.getItem("team-manager-last-seen")
    return saved ? JSON.parse(saved) : {
      reviews: Date.now(),
      fitnessTests: Date.now(),
      fixtures: Date.now(),
      announcements: Date.now()
    }
  })

  const [unreadCounts, setUnreadCounts] = useState({
    reviews: 0,
    fitnessTests: 0,
    fixtures: 0,
    announcements: 0,
    total: 0
  })

  // Save lastSeen to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("team-manager-last-seen", JSON.stringify(lastSeen))
  }, [lastSeen])

  // Function to mark a category as seen
  const markAsSeen = (category) => {
    setLastSeen(prev => ({
      ...prev,
      [category]: Date.now()
    }))
  }


  useEffect(() => {
    if (!userRole) return
    const clubsRef = userRole === "super-admin" ? collection(db, "clubs") : currentClubId ? query(collection(db, "clubs"), where(documentId(), "==", currentClubId)) : null
    const teamIds = teamIdsForSession()
    const teamsRef = userRole === "super-admin" ? collection(db, "teams") : userRole === "club-admin" ? query(collection(db, "teams"), where("clubId", "==", currentClubId)) : teamIds.length === 1 ? query(collection(db, "teams"), where(documentId(), "==", teamIds[0])) : teamIds.length ? query(collection(db, "teams"), where(documentId(), "in", teamIds)) : null
    if (!clubsRef || !teamsRef) return
    const unsubClubs = onSnapshot(clubsRef, snapshot => setClubs(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))))
    const unsubTeams = onSnapshot(teamsRef, snapshot => setTeams(snapshot.docs.map(item => ({ id: item.id, ...item.data() }))))
    return () => { unsubClubs(); unsubTeams() }
  }, [userRole, currentClubId, currentTeamId, currentUserProfile])

  // Initialize notification service after first data load
  useEffect(() => {
    if (!loading) {
      initializeNotifications({ reviews, fitnessTests, fixtures })
    }
  }, [loading])

  // Real-time listener for players collection
  useEffect(() => {
    if (!userRole) return
    const scopedQuery = playerQuery()
    if (!scopedQuery) { setPlayers([]); setLoading(false); return }
    const unsubscribe = onSnapshot(scopedQuery, (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setPlayers(playersData.filter(item => !item.archived && canAccess(item)))
      setLoading(false)
    }, (error) => {
      console.error("Error loading players:", error) // DEBUG
      setLoading(false)
    })

    return () => unsubscribe()
  }, [userRole, currentUserProfile, currentClubId, currentTeamId])

  useEffect(() => {
    if (!userRole) return
    const scopedQuery = teamDataQuery("announcements")
    if (!scopedQuery) { setAnnouncements([]); return }
    const unsubscribe = onSnapshot(scopedQuery, snapshot => {
      const data = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      setAnnouncements(data.filter(item => item.clubId === currentClubId && (userRole === "club-admin" || item.teamId === currentTeamId)))
    })
    return () => unsubscribe()
  }, [userRole, currentClubId, currentTeamId])

  // Real-time listener for coaches collection
  useEffect(() => {
    if (!userRole) return
    const coachesQuery = userRole === "super-admin" ? collection(db, "coaches") : currentClubId ? query(collection(db, "coaches"), where("clubId", "==", currentClubId)) : null
    if (!coachesQuery) { setCoaches([]); return }
    const unsubscribe = onSnapshot(coachesQuery, (snapshot) => {
      const coachesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setCoaches((userRole === "super-admin" ? coachesData : coachesData.filter(coach => coach.clubId === currentClubId)).filter(item => !item.archived))
    }, (error) => {
      console.error("Error loading coaches:", error) // DEBUG
    })

    return () => unsubscribe()
  }, [userRole, currentClubId])

  useEffect(() => {
    if (userRole !== "club-admin" && userRole !== "super-admin") return
    const unsubscribe = onSnapshot(collection(db, "auditLogs"), snapshot => {
      setAuditLogs(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => userRole === "super-admin" || item.clubId === currentClubId).sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)))
    }, error => console.error("Error loading audit logs:", error))
    return () => unsubscribe()
  }, [userRole, currentClubId])

  useEffect(() => {
    if (!userRole || userRole === "player") return
    const ids = teamIdsForSession()
    const guardiansQuery = userRole === "super-admin" ? collection(db, "guardians") : userRole === "club-admin" ? query(collection(db, "guardians"), where("clubId", "==", currentClubId)) : userRole === "guardian" && authUser ? query(collection(db, "guardians"), where(documentId(), "==", authUser.uid)) : ids.length ? query(collection(db, "guardians"), where("teamIds", "array-contains-any", ids)) : null
    if (!guardiansQuery) { setGuardians([]); return }
    const unsubscribe = onSnapshot(guardiansQuery, snapshot => {
      const data = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      setGuardians((userRole === "super-admin" ? data : data.filter(item => item.clubId === currentClubId)).filter(item => !item.archived))
    }, error => console.error("Error loading guardians:", error))
    return () => unsubscribe()
  }, [userRole, currentClubId])

  // Real-time listener for injuries collection
  useEffect(() => {
    if (!userRole) return
    const scopedQuery = teamDataQuery("injuries")
    if (!scopedQuery) { setInjuries([]); return }
    const unsubscribe = onSnapshot(scopedQuery, (snapshot) => {
      const injuriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setInjuries(injuriesData.filter(item => !item.archived && canAccess(item)))
    })

    return () => unsubscribe()
  }, [userRole, currentUserProfile, currentClubId, currentTeamId])

  // Real-time listener for fitness tests collection
  useEffect(() => {
    if (!userRole) return
    const scopedQuery = teamDataQuery("fitnessTests")
    if (!scopedQuery) { setFitnessTests([]); return }
    const unsubscribe = onSnapshot(scopedQuery, (snapshot) => {
      const testsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setFitnessTests(testsData.filter(canAccess))
      checkForNewFitnessTests(testsData, userRole, currentPlayerId, players)
    })

    return () => unsubscribe()
  }, [userRole, currentPlayerId, players, currentUserProfile, currentClubId, currentTeamId])

  // Real-time listener for reviews collection
  useEffect(() => {
    if (!userRole) return
    const scopedQuery = teamDataQuery("reviews")
    if (!scopedQuery) { setReviews([]); return }
    const unsubscribe = onSnapshot(scopedQuery, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setReviews(reviewsData.filter(canAccess))
      checkForNewReviews(reviewsData, userRole, currentPlayerId, players)
    })

    return () => unsubscribe()
  }, [userRole, currentPlayerId, players, currentUserProfile, currentClubId, currentTeamId])

  // Real-time listener for fixtures collection
  useEffect(() => {
    if (!userRole) return
    const scopedQuery = teamDataQuery("fixtures")
    if (!scopedQuery) { setFixtures([]); return }
    const unsubscribe = onSnapshot(scopedQuery, (snapshot) => {
      const fixturesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setFixtures(fixturesData.filter(item => !item.archived && canAccess(item)))
      checkForNewFixtures(fixturesData, userRole)
    })

    return () => unsubscribe()
  }, [userRole, currentUserProfile, currentClubId, currentTeamId])

  // Real-time listener for imported match analyses
  useEffect(() => {
    if (!userRole) return
    const scopedQuery = teamDataQuery("matchAnalyses")
    if (!scopedQuery) { setMatchAnalyses([]); return }
    const unsubscribe = onSnapshot(scopedQuery, (snapshot) => {
      const analysesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setMatchAnalyses(analysesData.filter(canAccess))
    })

    return () => unsubscribe()
  }, [userRole, currentUserProfile, currentClubId, currentTeamId])

  // Calculate unread counts whenever data changes
  useEffect(() => {
    if (loading) return

    const counts = {
      reviews: 0,
      fitnessTests: 0,
      fixtures: 0,
      announcements: 0,
      total: 0
    }

    // Count unread reviews (for players, only their own reviews; for coaches, all reviews)
    if ((userRole === "player" || userRole === "guardian") && currentPlayerId) {
      counts.reviews = reviews.filter(r => {
        const createdAt = r.timestamp ? new Date(r.timestamp).getTime() : 0
        return r.playerId === currentPlayerId && createdAt > lastSeen.reviews
      }).length
    } else if (userRole === "coach") {
      counts.reviews = reviews.filter(r => {
        const createdAt = r.timestamp ? new Date(r.timestamp).getTime() : 0
        return createdAt > lastSeen.reviews
      }).length
    }

    // Count unread fitness tests (for players, only their own; for coaches, all)
    if ((userRole === "player" || userRole === "guardian") && currentPlayerId) {
      counts.fitnessTests = fitnessTests.filter(t => {
        const createdAt = t.date ? new Date(t.date).getTime() : 0
        return t.playerId === currentPlayerId && createdAt > lastSeen.fitnessTests
      }).length
    } else if (userRole === "coach") {
      counts.fitnessTests = fitnessTests.filter(t => {
        const createdAt = t.date ? new Date(t.date).getTime() : 0
        return createdAt > lastSeen.fitnessTests
      }).length
    }

    // Count unread fixtures (for everyone)
    counts.fixtures = fixtures.filter(f => {
      const createdAt = f.createdAt ? new Date(f.createdAt).getTime() : 0
      return createdAt > lastSeen.fixtures
    }).length

    counts.announcements = announcements.filter(item => {
      const createdAt = item.timestamp?.toMillis?.() || item.timestamp?.seconds * 1000 || new Date(item.createdAt || 0).getTime()
      return createdAt > lastSeen.announcements
    }).length

    counts.total = counts.reviews + counts.fitnessTests + counts.fixtures + counts.announcements

    setUnreadCounts(counts)
  }, [reviews, fitnessTests, fixtures, announcements, lastSeen, loading, userRole, currentPlayerId])

  const addPlayer = async (player) => {
    try {
      const teamId = player.teamId || currentTeamId
      if (!teamId) throw new Error("Select a team before adding a player.")
      const teamPlayerCount = players.filter(item => item.teamId === teamId).length
      if (teamPlayerCount >= 30) throw new Error("This team already has the maximum of 30 players.")
      const playerRef = await addDoc(collection(db, "players"), { ...applyScope(withoutPassword(player)), authProvisioningStatus: "pending" })
      await setDoc(doc(db, "announcementGroups", teamId), { teamId, clubId: player.clubId || currentClubId, memberIds: arrayUnion(playerRef.id), updatedAt: new Date().toISOString() }, { merge: true })
    } catch (error) {
      console.error("Error adding player:", error)
      throw error
    }
  }

  const updatePlayer = async (id, updates) => {
    try {
      const existing = players.find(player => player.id === id)
      await updateDoc(doc(db, "players", id), withoutPassword(updates))
      if (updates.teamId && updates.teamId !== existing?.teamId) {
        if (existing?.teamId) await setDoc(doc(db, "announcementGroups", existing.teamId), { memberIds: arrayRemove(id), updatedAt: new Date().toISOString() }, { merge: true })
        await setDoc(doc(db, "announcementGroups", updates.teamId), { teamId: updates.teamId, clubId: updates.clubId || existing?.clubId || currentClubId, memberIds: arrayUnion(id), updatedAt: new Date().toISOString() }, { merge: true })
      }
    } catch (error) {
      console.error("Error updating player:", error)
    }
  }

  const deletePlayer = async (id) => {
    try {
      const existingPlayer = players.find(player => player.id === id)
      await updateDoc(doc(db, "players", id), { archived: true, archivedAt: new Date().toISOString(), archivedReason: "Removed from active roster" })
      if (existingPlayer?.teamId) await setDoc(doc(db, "announcementGroups", existingPlayer.teamId), { memberIds: arrayRemove(id), updatedAt: new Date().toISOString() }, { merge: true })
      await recordAudit("archived", "players", id, { reason: "Removed from active roster" })
    } catch (error) {
      console.error("Error deleting player:", error)
      throw error
    }
  }

  // Injury management functions
  const removePlayerFromUpcomingSquads = async (playerId) => {
    const affected = fixtures.filter(fixture => fixture.status !== "Completed" && fixture.squadPlayerIds?.includes(playerId))
    if (!affected.length) return
    const batch = writeBatch(db)
    affected.forEach(fixture => {
      batch.update(doc(db, "fixtures", fixture.id), {
        squadPlayerIds: arrayRemove(playerId),
        [`availabilityResponses.${playerId}`]: deleteField(),
        updatedAt: new Date().toISOString()
      })
    })
    await batch.commit()
  }

  const addInjury = async (injury) => {
    try {
      const status = injury.type === 'injury' ? 'injured' : 'unavailable'
      const injuryRef = await addDoc(collection(db, "injuries"), {
        ...applyScope(injury),
        status,
        createdAt: new Date().toISOString()
      })
      await removePlayerFromUpcomingSquads(injury.playerId)
      await recordAudit("created", "injury", injuryRef.id, { ...injury, status })
    } catch (error) {
      console.error("Error adding injury:", error)
      throw error
    }
  }

  const updateInjury = async (id, updates) => {
    try {
      await updateDoc(doc(db, "injuries", id), updates)
      if (updates.status === "injured" || updates.status === "unavailable") {
        const existing = injuries.find(injury => injury.id === id)
        if (existing?.playerId) await removePlayerFromUpcomingSquads(existing.playerId)
      }
      await recordAudit("updated", "injury", id, updates)
    } catch (error) {
      console.error("Error updating injury:", error)
      throw error
    }
  }

  const deleteInjury = async (id) => {
    try {
      await updateDoc(doc(db, "injuries", id), { archived: true, archivedAt: new Date().toISOString(), archivedReason: "Removed by staff" })
      await recordAudit("archived", "injuries", id)
    } catch (error) {
      console.error("Error deleting injury:", error)
      throw error
    }
  }

  const getPlayerInjuryStatus = (playerId) => {
    const playerInjuries = injuries.filter(i => i.playerId === playerId && i.status !== 'recovered')
    return playerInjuries.length > 0 ? playerInjuries[0] : null
  }

  // Fitness test management functions
  const addFitnessTest = async (test) => {
    try {
      await addDoc(collection(db, "fitnessTests"), {
        ...applyScope(test),
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error("Error adding fitness test:", error)
    }
  }

  const updateFitnessTest = async (id, updates) => {
    try {
      await updateDoc(doc(db, "fitnessTests", id), updates)
    } catch (error) {
      console.error("Error updating fitness test:", error)
    }
  }

  const deleteFitnessTest = async (id) => {
    try {
      await deleteDoc(doc(db, "fitnessTests", id))
    } catch (error) {
      console.error("Error deleting fitness test:", error)
    }
  }

  const getPlayerFitnessTests = (playerId) => {
    return fitnessTests
      .filter(t => t.playerId === playerId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  // Review management functions
  const addReview = async (review) => {
    try {
      await addDoc(collection(db, "reviews"), {
        ...applyScope(review),
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error("Error adding review:", error)
    }
  }

  const updateReview = async (id, updates) => {
    try {
      await updateDoc(doc(db, "reviews", id), updates)
    } catch (error) {
      console.error("Error updating review:", error)
    }
  }

  const deleteReview = async (id) => {
    try {
      await deleteDoc(doc(db, "reviews", id))
    } catch (error) {
      console.error("Error deleting review:", error)
    }
  }

  const getPlayerReviews = (playerId) => {
    return reviews
      .filter(r => r.playerId === playerId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  // Fixture management functions
  const addFixture = async (fixture) => {
    try {
      const fixtureRef = await addDoc(collection(db, "fixtures"), {
        ...applyScope(fixture),
        createdAt: new Date().toISOString()
      })
      await recordAudit("created", "fixture", fixtureRef.id, fixture)
    } catch (error) {
      console.error("Error adding fixture:", error)
      throw error
    }
  }

  const updateFixture = async (id, updates) => {
    try {
      await updateDoc(doc(db, "fixtures", id), updates)
      await recordAudit("updated", "fixture", id, updates)
    } catch (error) {
      console.error("Error updating fixture:", error)
      throw error
    }
  }

  const updateFixtureAvailability = async (fixtureId, playerId, response) => {
    try {
      await updateDoc(doc(db, "fixtures", fixtureId), {
        [`availabilityResponses.${playerId}`]: response,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error("Error updating fixture availability:", error)
      throw error
    }
  }

  const resetFixtureAvailability = async (fixtureId, playerId) => {
    try {
      await updateDoc(doc(db, "fixtures", fixtureId), {
        [`availabilityResponses.${playerId}`]: deleteField(),
        squadPlayerIds: arrayUnion(playerId),
        updatedAt: new Date().toISOString()
      })
      await recordAudit("reinvited", "fixture-availability", fixtureId, { playerId })
    } catch (error) {
      console.error("Error resetting fixture availability:", error)
      throw error
    }
  }

  const sendFixtureAvailabilityReminders = async (fixtureId, playerIds) => {
    if (!playerIds.length) return
    try {
      const sentAt = new Date().toISOString()
      const updates = { updatedAt: sentAt }
      playerIds.forEach(playerId => { updates[`availabilityReminders.${playerId}`] = { sentAt } })
      await updateDoc(doc(db, "fixtures", fixtureId), updates)
      await recordAudit("reminded", "fixture-availability", fixtureId, { playerIds, sentAt })
    } catch (error) {
      console.error("Error sending availability reminders:", error)
      throw error
    }
  }

  const adminOverrideFixture = async (fixtureId, updates, reason) => {
    if (userRole !== "club-admin" && userRole !== "super-admin") throw new Error("Administrator access is required.")
    if (!reason?.trim()) throw new Error("A reason is required for an administrator override.")
    await updateDoc(doc(db, "fixtures", fixtureId), { ...updates, adminOverrideAt: new Date().toISOString() })
    await recordAudit("admin-override", "fixture", fixtureId, { reason: reason.trim(), fields: Object.keys(updates) })
  }

  const archiveRecord = async (collectionName, id, reason = "Archived by administrator") => {
    if (userRole !== "club-admin" && userRole !== "super-admin") throw new Error("Administrator access is required.")
    await updateDoc(doc(db, collectionName, id), { archived: true, archivedAt: new Date().toISOString(), archivedReason: reason })
    await recordAudit("archived", collectionName, id, { reason })
  }

  const restoreArchivedRecord = async (collectionName, id, reason) => {
    if (userRole !== "club-admin" && userRole !== "super-admin") throw new Error("Administrator access is required.")
    await updateDoc(doc(db, collectionName, id), { archived: false, restoredAt: new Date().toISOString() })
    await recordAudit("restored", collectionName, id, { reason: reason || "Restored by administrator" })
  }

  const deleteFixture = async (id) => {
    try {
      await updateDoc(doc(db, "fixtures", id), { archived: true, archivedAt: new Date().toISOString(), archivedReason: "Removed by staff" })
      await recordAudit("archived", "fixtures", id)
    } catch (error) {
      console.error("Error deleting fixture:", error)
      throw error
    }
  }

  // Coach management functions
  const addCoach = async (coachData) => {
    try {
      const requestedRole = coachData.role || "coach"
      if (requestedRole === "super-admin") throw new Error("Platform administrator accounts cannot be created from a club workspace.")
      if (requestedRole === "club-admin" && userRole !== "super-admin") throw new Error("Only the platform administrator can appoint a club administrator.")
      const safeRole = userRole === "club-admin" ? "coach" : requestedRole
      const safeClubId = userRole === "club-admin" ? currentClubId : coachData.clubId
      if (!safeClubId) throw new Error("Every club staff account must be assigned to a club.")
      await addDoc(collection(db, "coaches"), {
        ...applyScope(withoutPassword(coachData)),
        clubId: safeClubId,
        role: safeRole,
        isAdmin: false,
        authProvisioningStatus: "pending",
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error("Error adding coach:", error)
      throw error
    }
  }

  const updateCoach = async (id, updates) => {
    try {
      await updateDoc(doc(db, "coaches", id), withoutPassword(updates))
    } catch (error) {
      console.error("Error updating coach:", error)
      throw error
    }
  }

  const deleteCoach = async (id) => {
    try {
      await updateDoc(doc(db, "coaches", id), { archived: true, archivedAt: new Date().toISOString(), archivedReason: "Account removed" })
      await recordAudit("archived", "coaches", id)
    } catch (error) {
      console.error("Error deleting coach:", error)
      throw error
    }
  }

  const addGuardian = async guardian => {
    try {
      const guardianRef = await addDoc(collection(db, "guardians"), {
        ...withoutPassword(guardian),
        clubId: guardian.clubId || currentClubId,
        role: "guardian",
        status: "active",
        authProvisioningStatus: "pending",
        createdAt: new Date().toISOString()
      })
      await recordAudit("created", "guardian", guardianRef.id, { fullName: guardian.fullName, playerIds: guardian.playerIds || [] })
      return guardianRef
    } catch (error) {
      console.error("Error adding guardian:", error)
      throw error
    }
  }

  const updateGuardian = async (id, updates) => {
    try {
      const safeUpdates = withoutPassword(updates)
      await updateDoc(doc(db, "guardians", id), safeUpdates)
      await recordAudit("updated", "guardian", id, safeUpdates)
    } catch (error) {
      console.error("Error updating guardian:", error)
      throw error
    }
  }

  const deleteGuardian = async id => {
    try {
      await updateDoc(doc(db, "guardians", id), { archived: true, archivedAt: new Date().toISOString(), archivedReason: "Account removed" })
      await recordAudit("archived", "guardians", id)
    } catch (error) {
      console.error("Error deleting guardian:", error)
      throw error
    }
  }

  const addClub = async (club) => addDoc(collection(db, "clubs"), { ...club, createdAt: new Date().toISOString() })
  const updateClub = async (id, updates) => updateDoc(doc(db, "clubs", id), updates)
  const deleteSnapshot = async snapshot => {
    const documents = snapshot.docs
    for (let offset = 0; offset < documents.length; offset += 400) {
      const batch = writeBatch(db)
      documents.slice(offset, offset + 400).forEach(item => batch.delete(item.ref))
      await batch.commit()
    }
  }
  const deleteWhere = async (collectionName, field, operator, value) => {
    const snapshot = await getDocs(query(collection(db, collectionName), where(field, operator, value)))
    await deleteSnapshot(snapshot)
  }
  const teamScopedCollections = [
    "fixtures", "sessions", "injuries", "fitnessTests", "reviews", "matchAnalyses",
    "announcements", "announcementGroups", "clubMessages", "seasonGoals", "awayGames",
    "homeDayPlans", "auditLogs"
  ]
  const clubScopedCollections = [
    "players", "guardians", "fixtures", "sessions", "injuries", "fitnessTests", "reviews",
    "matchAnalyses", "announcements", "announcementGroups", "clubMessages", "seasonGoals",
    "awayGames", "homeDayPlans", "auditLogs"
  ]
  const deleteTeamData = async id => {
    const teamPlayers = await getDocs(query(collection(db, "players"), where("teamId", "==", id)))
    const playerIds = new Set(teamPlayers.docs.map(item => item.id))

    const affectedGuardians = new Map()
    for (const playerId of playerIds) {
      const linkedGuardians = await getDocs(query(collection(db, "guardians"), where("playerIds", "array-contains", playerId)))
      linkedGuardians.docs.forEach(guardian => affectedGuardians.set(guardian.id, guardian))
    }
    for (const guardian of affectedGuardians.values()) {
      const remainingPlayerIds = (guardian.data().playerIds || []).filter(linkedId => !playerIds.has(linkedId))
      if (remainingPlayerIds.length) await updateDoc(guardian.ref, { playerIds: remainingPlayerIds })
      else await deleteDoc(guardian.ref)
    }

    await deleteSnapshot(teamPlayers)
    for (const collectionName of teamScopedCollections) await deleteWhere(collectionName, "teamId", "==", id)

    const directStaff = await getDocs(query(collection(db, "coaches"), where("teamId", "==", id)))
    const assignedStaff = await getDocs(query(collection(db, "coaches"), where("teamIds", "array-contains", id)))
    const staff = new Map([...directStaff.docs, ...assignedStaff.docs].map(item => [item.id, item]))
    for (const account of staff.values()) {
      if (account.data().role === "super-admin") continue
      const remainingTeamIds = (account.data().teamIds || []).filter(teamId => teamId !== id)
      if (remainingTeamIds.length) await updateDoc(account.ref, { teamIds: remainingTeamIds, teamId: remainingTeamIds[0] })
      else await deleteDoc(account.ref)
    }

    await deleteDoc(doc(db, "announcementGroups", id))
    await deleteDoc(doc(db, "teams", id))
  }
  const deleteClub = async id => {
    if (userRole !== "super-admin") throw new Error("Platform administrator access is required.")
    const clubTeams = await getDocs(query(collection(db, "teams"), where("clubId", "==", id)))
    for (const team of clubTeams.docs) await deleteTeamData(team.id)
    for (const collectionName of clubScopedCollections) await deleteWhere(collectionName, "clubId", "==", id)
    const staff = await getDocs(query(collection(db, "coaches"), where("clubId", "==", id)))
    for (const account of staff.docs) if (account.data().role !== "super-admin") await deleteDoc(account.ref)
    await deleteDoc(doc(db, "clubs", id))
  }
  const addTeam = async (team) => {
    const sportTeamCount = teams.filter(item => item.clubId === team.clubId && item.sportId === team.sportId).length
    if (sportTeamCount >= 5) throw new Error(`This club already has the maximum of 5 ${team.sportId} teams.`)
    const teamRef = await addDoc(collection(db, "teams"), { ...team, playerLimit: 30, createdAt: new Date().toISOString() })
    await setDoc(doc(db, "announcementGroups", teamRef.id), { teamId: teamRef.id, clubId: team.clubId, name: `${team.name} Announcements`, memberIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    return teamRef
  }
  const updateTeam = async (id, updates) => updateDoc(doc(db, "teams", id), updates)
  const deleteTeam = async id => {
    if (userRole !== "super-admin") throw new Error("Platform administrator access is required.")
    await deleteTeamData(id)
  }

  const value = {
    coaches,
    setCoaches,
    addCoach,
    updateCoach,
    deleteCoach,
    guardians,
    addGuardian,
    updateGuardian,
    deleteGuardian,
    auditLogs,
    clubs,
    teams,
    addClub,
    updateClub,
    deleteClub,
    addTeam,
    updateTeam,
    deleteTeam,
    players,
    setPlayers,
    addPlayer,
    updatePlayer,
    deletePlayer,
    injuries,
    addInjury,
    updateInjury,
    deleteInjury,
    getPlayerInjuryStatus,
    fitnessTests,
    addFitnessTest,
    updateFitnessTest,
    deleteFitnessTest,
    getPlayerFitnessTests,
    reviews,
    addReview,
    updateReview,
    deleteReview,
    getPlayerReviews,
    matchAnalyses,
    fixtures,
    addFixture,
    updateFixture,
    updateFixtureAvailability,
    resetFixtureAvailability,
    sendFixtureAvailabilityReminders,
    adminOverrideFixture,
    archiveRecord,
    restoreArchivedRecord,
    deleteFixture,
    loading,
    authReady,
    authUser,
    logout,
    userRole,
    setUserRole,
    currentUser,
    setCurrentUser,
    currentPlayerId,
    setCurrentPlayerId,
    currentUserProfile,
    setCurrentUserProfile,
    currentClubId,
    setCurrentClubId,
    currentTeamId,
    setCurrentTeamId,
    unreadCounts,
    lastSeen,
    markAsSeen
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
