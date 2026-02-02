import { createContext, useContext, useState, useEffect } from "react"
import { db } from "../firebase/config"
import { collection, getDocs, addDoc, deleteDoc, doc, onSnapshot, updateDoc, query, where } from "firebase/firestore"
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
  const [injuries, setInjuries] = useState([])
  const [fitnessTests, setFitnessTests] = useState([])
  const [reviews, setReviews] = useState([])
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null) // 'coach' or 'player'
  const [currentUser, setCurrentUser] = useState(null)
  const [currentPlayerId, setCurrentPlayerId] = useState(null) // ID of logged-in player
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("bcc-dark-mode")
    return saved === "true"
  })

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem("bcc-dark-mode", darkMode)
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  // Initialize notification service after first data load
  useEffect(() => {
    if (!loading) {
      initializeNotifications({ reviews, fitnessTests, fixtures })
    }
  }, [loading])

  // Real-time listener for players collection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "players"), (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setPlayers(playersData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Real-time listener for injuries collection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "injuries"), (snapshot) => {
      const injuriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setInjuries(injuriesData)
    })

    return () => unsubscribe()
  }, [])

  // Real-time listener for fitness tests collection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "fitnessTests"), (snapshot) => {
      const testsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setFitnessTests(testsData)
      checkForNewFitnessTests(testsData, userRole, currentPlayerId, players)
    })

    return () => unsubscribe()
  }, [userRole, currentPlayerId, players])

  // Real-time listener for reviews collection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "reviews"), (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setReviews(reviewsData)
      checkForNewReviews(reviewsData, userRole, currentPlayerId, players)
    })

    return () => unsubscribe()
  }, [userRole, currentPlayerId, players])

  // Real-time listener for fixtures collection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "fixtures"), (snapshot) => {
      const fixturesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      checkForNewFixtures(fixturesData, userRole)
    })

    return () => unsubscribe()
  }, [userRoleturn () => unsubscribe()
  }, [])

  const addPlayer = async (player) => {
    try {
      await addDoc(collection(db, "players"), player)
    } catch (error) {
      console.error("Error adding player:", error)
    }
  }

  const updatePlayer = async (id, updates) => {
    try {
      await updateDoc(doc(db, "players", id), updates)
    } catch (error) {
      console.error("Error updating player:", error)
    }
  }

  const deletePlayer = async (id) => {
    try {
      // Delete the player
      await deleteDoc(doc(db, "players", id))
      
      // Delete all injuries related to this player
      const playerInjuries = injuries.filter(i => i.playerId === id)
      for (const injury of playerInjuries) {
        await deleteDoc(doc(db, "injuries", injury.id))
      }
      
      // Delete all fitness tests related to this player
      const playerTests = fitnessTests.filter(t => t.playerId === id)
      for (const test of playerTests) {
        await deleteDoc(doc(db, "fitnessTests", test.id))
      }
    } catch (error) {
      console.error("Error deleting player:", error)
    }
  }

  // Injury management functions
  const addInjury = async (injury) => {
    try {
      await addDoc(collection(db, "injuries"), {
        ...injury,
        status: injury.type === 'injury' ? 'injured' : 'unavailable',
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error("Error adding injury:", error)
    }
  }

  const updateInjury = async (id, updates) => {
    try {
      await updateDoc(doc(db, "injuries", id), updates)
    } catch (error) {
      console.error("Error updating injury:", error)
    }
  }

  const deleteInjury = async (id) => {
    try {
      await deleteDoc(doc(db, "injuries", id))
    } catch (error) {
      console.error("Error deleting injury:", error)
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
        ...test,
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
        ...review,
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
      await addDoc(collection(db, "fixtures"), {
        ...fixture,
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error("Error adding fixture:", error)
    }
  }

  const updateFixture = async (id, updates) => {
    try {
      await updateDoc(doc(db, "fixtures", id), updates)
    } catch (error) {
      console.error("Error updating fixture:", error)
    }
  }

  const deleteFixture = async (id) => {
    try {
      await deleteDoc(doc(db, "fixtures", id))
    } catch (error) {
      console.error("Error deleting fixture:", error)
    }
  }

  const value = {
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
    fixtures,
    addFixture,
    updateFixture,
    deleteFixture,
    loading,
    userRole,
    setUserRole,
    currentUser,
    setCurrentUser,
    currentPlayerId,
    setCurrentPlayerId,
    darkMode,
    toggleDarkMode
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
