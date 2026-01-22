import { createContext, useContext, useState, useEffect } from "react"
import { db } from "../firebase/config"
import { collection, getDocs, addDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore"

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

  const value = {
    players,
    setPlayers,
    addPlayer,
    deletePlayer,
    loading
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
