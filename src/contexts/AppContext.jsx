import { createContext, useContext, useState, useEffect } from "react"

const AppContext = createContext()

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}

export const AppProvider = ({ children }) => {
  const [players, setPlayers] = useState(() => {
    const saved = localStorage.getItem('bcc-players')
    return saved ? JSON.parse(saved) : [
      { id: 1, firstName: "John", lastName: "Smith", phone: "+27 82 123 4567", team: "First Team" },
      { id: 2, firstName: "Michael", lastName: "Johnson", phone: "+27 83 234 5678", team: "First Team" },
      { id: 3, firstName: "David", lastName: "Williams", phone: "+27 84 345 6789", team: "Reserves" },
    ]
  })

  useEffect(() => {
    localStorage.setItem('bcc-players', JSON.stringify(players))
  }, [players])

  const addPlayer = (player) => {
    setPlayers([...players, { ...player, id: Date.now() }])
  }

  const deletePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id))
  }

  const value = {
    players,
    setPlayers,
    addPlayer,
    deletePlayer
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
