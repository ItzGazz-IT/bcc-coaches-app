import { createContext, useContext, useState, useEffect } from "react"
import { db } from "../firebase/config"
import { collection, getDocs, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore"

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
  const [loading, setLoading] = useState(true)

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

  const addPlayer = async (player) => {
    try {
      await addDoc(collection(db, "players"), player)
    } catch (error) {
      console.error("Error adding player:", error)
    }
  }

  const deletePlayer = async (id) => {
    try {
      await deleteDoc(doc(db, "players", id))
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

  const value = {
    players,
    setPlayers,
    addPlayer,
    deletePlayer,
    injuries,
    addInjury,
    updateInjury,
    deleteInjury,
    getPlayerInjuryStatus,
    loading
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
