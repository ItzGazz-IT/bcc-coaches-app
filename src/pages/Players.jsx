import { useState, useEffect } from "react"
import { UserPlus, Phone, Users, Shield, Trash2, Search, CheckCircle, Activity, X, Edit } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { useSearchParams } from "react-router-dom"
import { TableSkeleton } from "../components/Loading"

function Players() {
  const { players, addPlayer, updatePlayer, deletePlayer, loading } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    team: "First Team",
    position: "Midfielder",
    emergencyContact: "",
    username: "",
    password: ""
  })
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTeam, setFilterTeam] = useState("All")
  const [showSuccess, setShowSuccess] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)

  // Check for team filter from URL params
  useEffect(() => {
    const teamParam = searchParams.get('team')
    if (teamParam) {
      setFilterTeam(teamParam)
    }
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.firstName && formData.lastName && formData.phone) {
      const playerData = { ...formData }
      
      // If editing and password is empty, remove it from the update
      if (editingPlayer && !formData.password) {
        delete playerData.password
      }
      
      // If username is empty, remove it
      if (!playerData.username) {
        delete playerData.username
        delete playerData.password
      }
      
      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, playerData)
      } else {
        await addPlayer(playerData)
      }
      setFormData({ 
        firstName: "", 
        lastName: "", 
        phone: "", 
        team: "First Team",
        position: "Midfielder",
        emergencyContact: "",
        username: "",
        password: ""
      })
      setShowSuccess(true)
      setShowModal(false)
      setEditingPlayer(null)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  const handleEdit = (player) => {
    setEditingPlayer(player)
    setFormData({
      firstName: player.firstName,
      lastName: player.lastName,
      phone: player.phone,
      team: player.team,
      position: player.position || "Midfielder",
      emergencyContact: player.emergencyContact || "",
      username: player.username || "",
      password: "" // Don't show existing password
    })
    setShowModal(true)
  }

  const openWhatsApp = (phone) => {
    const cleanPhone = phone.replace(/\s/g, "")
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  const filteredPlayers = players.filter(player => {
    const matchesSearch = 
      player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.phone.includes(searchTerm)
    const matchesTeam = filterTeam === "All" || player.team === filterTeam
    return matchesSearch && matchesTeam
  })

  const firstTeamCount = players.filter(p => p.team === "First Team").length
  const reserveTeamCount = players.filter(p => p.team === "Reserve Team").length
  const othersCount = players.filter(p => p.team === "Others").length

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
                Players
              </h1>
              <p className="text-sm md:text-base text-gray-600 hidden md:block">Manage your team roster</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary inline-flex items-center gap-2 text-sm flex-shrink-0"
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">Add Player</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : (
          <>
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="text-green-600" size={24} />
            <p className="font-semibold text-green-800">Player added successfully!</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-1.5 rounded-lg">
                  <Users className="text-white" size={16} />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total</p>
              </div>
              <p className="text-2xl font-black text-blue-600">{players.length}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-1.5 rounded-lg">
                  <Shield className="text-white" size={16} />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase truncate">First</p>
              </div>
              <p className="text-2xl font-black text-emerald-600">{firstTeamCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-1.5 rounded-lg">
                  <Activity className="text-white" size={16} />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase truncate">Reserve</p>
              </div>
              <p className="text-2xl font-black text-orange-600">{reserveTeamCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-1.5 rounded-lg">
                  <Users className="text-white" size={16} />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase">Others</p>
              </div>
              <p className="text-2xl font-black text-purple-600">{othersCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-1.5 rounded-lg">
                  <CheckCircle className="text-white" size={16} />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase truncate">Showing</p>
              </div>
              <p className="text-2xl font-black text-indigo-600">{filteredPlayers.length}</p>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-3">Team Roster</h2>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
              
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
              >
                <option value="All">All Teams</option>
                <option value="First Team">First Team</option>
                <option value="Reserve Team">Reserve Team</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          <div className="p-4">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500 font-medium">No players found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPlayers.map(player => (
                  <div 
                    key={player.id} 
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-gray-800 text-base">
                          {player.firstName} {player.lastName}
                        </h3>
                        {player.position && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                            {player.position}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          player.team === "First Team" 
                            ? "bg-emerald-100 text-emerald-700" 
                            : player.team === "Reserve Team"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-purple-100 text-purple-700"
                        }`}>
                          {player.team}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1.5">
                        <Phone size={13} />
                        {player.phone}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={() => handleEdit(player)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                        title="Edit"
                      >
                        <Edit size={16} className="text-blue-600" />
                      </button>
                      
                      <button
                        onClick={() => openWhatsApp(player.phone)}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors flex-shrink-0"
                        title="WhatsApp"
                      >
                        <Phone size={16} className="text-green-600" />
                      </button>
                      
                      <button
                        onClick={() => deletePlayer(player.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>
        )}

        {/* Add Player Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
              <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl">
                    <UserPlus className="text-white" size={22} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingPlayer ? "Edit Player" : "Add New Player"}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingPlayer(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    placeholder="John"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    placeholder="Smith"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+27 82 123 4567"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                    placeholder="+27 82 987 6543"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Team *
                  </label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({...formData, team: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                  >
                    <option value="First Team">First Team</option>
                    <option value="Reserve Team">Reserve Team</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Position/Role
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                  >
                    <option value="Goalkeeper">Goalkeeper</option>
                    <option value="Defender">Defender</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Forward">Forward/Winger</option>
                    <option value="Striker">Striker</option>
                  </select>
                </div>

                <div className="border-t pt-4 mt-2">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">Player Login Credentials (Optional)</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        placeholder="player.username"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">Used for player login to the portal</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Password {editingPlayer && "(leave blank to keep current)"}
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Enter password"
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                      <p className="text-xs text-gray-500 mt-1">Minimum 6 characters recommended</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingPlayer(null)
                    }}
                    className="btn btn-secondary flex-1 text-sm md:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    <UserPlus size={18} />
                    {editingPlayer ? "Update Player" : "Add Player"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Players
