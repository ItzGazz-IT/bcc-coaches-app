import { useState } from "react"
import { Send, Phone, Copy, RefreshCw, AlertCircle, CheckCircle, Zap } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { createWhatsAppMessage, generateWhatsAppLink, generatePassword, generateUsername } from "../utils/credentialUtils"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase/config"

function CredentialsManager() {
  const { players, userRole } = useApp()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTeam, setFilterTeam] = useState("All")
  const [copiedId, setCopiedId] = useState(null)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [loadingId, setLoadingId] = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  if (userRole !== "coach") {
    return (
      <div className="flex-1 p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={48} />
          <p className="text-gray-600 font-semibold">Coaches only</p>
        </div>
      </div>
    )
  }

  const filteredPlayers = players
    .filter(player => {
      const matchesSearch = 
        player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (player.username && player.username.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesTeam = filterTeam === "All" || player.team === filterTeam
      return matchesSearch && matchesTeam
    })
    .sort((a, b) => (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName))

  const handleCopyPassword = (password) => {
    navigator.clipboard.writeText(password)
    setCopiedId(null)
    setMessage({ type: "success", text: "Password copied to clipboard!" })
    setTimeout(() => setMessage({ type: "", text: "" }), 2000)
  }

  const handleSendWhatsApp = (player) => {
    if (!player.username || !player.password || !player.phone) {
      setMessage({ type: "error", text: "Player missing credentials or phone number" })
      return
    }

    const message = createWhatsAppMessage(player.firstName, player.lastName, player.username, player.password)
    const whatsappLink = generateWhatsAppLink(player.phone, message)
    window.open(whatsappLink, '_blank')
  }

  const handleRegeneratePassword = async (player) => {
    if (!player.id) return
    
    setLoadingId(player.id)
    try {
      const newPassword = generatePassword(10)
      await updateDoc(doc(db, "players", player.id), {
        password: newPassword
      })
      setMessage({ type: "success", text: `Password regenerated for ${player.firstName}` })
      setTimeout(() => setMessage({ type: "", text: "" }), 2000)
    } catch (error) {
      console.error("Error regenerating password:", error)
      setMessage({ type: "error", text: "Failed to regenerate password" })
    } finally {
      setLoadingId(null)
    }
  }

  const handleBulkGenerate = async () => {
    const playersNeedingCredentials = players.filter(p => !p.username || !p.password)
    
    if (playersNeedingCredentials.length === 0) {
      setMessage({ type: "info", text: "All players already have credentials!" })
      return
    }

    if (!window.confirm(`Generate credentials for ${playersNeedingCredentials.length} players? This action cannot be undone.`)) {
      return
    }

    setBulkLoading(true)
    let successCount = 0
    let errorCount = 0

    try {
      for (const player of playersNeedingCredentials) {
        try {
          const username = generateUsername(player.firstName, player.lastName)
          const password = generatePassword(10)
          
          await updateDoc(doc(db, "players", player.id), {
            username: username,
            password: password
          })
          successCount++
        } catch (error) {
          console.error(`Failed to update ${player.firstName} ${player.lastName}:`, error)
          errorCount++
        }
      }

      setMessage({ 
        type: "success", 
        text: `✓ Generated credentials for ${successCount} players${errorCount > 0 ? ` (${errorCount} failed)` : ''}` 
      })
    } catch (error) {
      console.error("Bulk generation error:", error)
      setMessage({ type: "error", text: "Bulk generation failed" })
    } finally {
      setBulkLoading(false)
      setTimeout(() => setMessage({ type: "", text: "" }), 3000)
    }
  }

  const teamOptions = ["All", ...new Set(players.map(p => p.team))]

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              Player Credentials
            </h1>
            <p className="text-gray-600">Manage login credentials and send via WhatsApp</p>
          </div>
          <button
            onClick={handleBulkGenerate}
            disabled={bulkLoading || players.filter(p => !p.username || !p.password).length === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Zap size={18} />
            {bulkLoading ? "Generating..." : "Generate All"}
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-xl border flex items-center gap-3 ${
            message.type === "success" 
              ? "bg-green-50 border-green-200 text-green-800"
              : message.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}>
            {message.type === "success" ? (
              <CheckCircle size={20} />
            ) : message.type === "error" ? (
              <AlertCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            {message.text}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search Players</label>
              <input
                type="text"
                placeholder="Name or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Team</label>
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
              >
                {teamOptions.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Credentials Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Player</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Team</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Password</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No players found
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map(player => (
                    <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">
                          {player.firstName} {player.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{player.position}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{player.team}</td>
                      <td className="px-4 py-3">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800">
                          {player.username || "-"}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800 max-w-[100px] truncate">
                            {player.password ? player.password.substring(0, 6) + "..." : "-"}
                          </code>
                          {player.password && (
                            <button
                              onClick={() => handleCopyPassword(player.password)}
                              className="p-1.5 hover:bg-gray-200 rounded transition-colors text-gray-600 hover:text-gray-900"
                              title="Copy full password"
                            >
                              <Copy size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {player.phone ? (
                          <a
                            href={`tel:${player.phone}`}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                          >
                            <Phone size={14} />
                            {player.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSendWhatsApp(player)}
                            disabled={!player.username || !player.password || !player.phone}
                            className="p-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded transition-colors"
                            title="Send credentials via WhatsApp"
                          >
                            <Send size={16} />
                          </button>
                          <button
                            onClick={() => handleRegeneratePassword(player)}
                            disabled={loadingId === player.id}
                            className="p-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded transition-colors"
                            title="Regenerate password"
                          >
                            <RefreshCw size={16} className={loadingId === player.id ? "animate-spin" : ""} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-600 uppercase font-bold">Total Players</p>
            <p className="text-2xl font-black text-blue-600">{players.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-600 uppercase font-bold">With Credentials</p>
            <p className="text-2xl font-black text-green-600">
              {players.filter(p => p.username && p.password).length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-600 uppercase font-bold">Missing Credentials</p>
            <p className="text-2xl font-black text-red-600">
              {players.filter(p => !p.username || !p.password).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CredentialsManager
