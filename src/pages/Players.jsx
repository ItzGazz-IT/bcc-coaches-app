import { useState, useEffect } from "react"
import { UserPlus, Phone, Users, Shield, Trash2, Search, CheckCircle, Activity, X, Edit } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { useSearchParams } from "react-router-dom"

function Players() {
  const { players, addPlayer, updatePlayer, deletePlayer } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    team: "First Team",
    position: "Midfielder",
    emergencyContact: ""
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
      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, formData)
      } else {
        await addPlayer(formData)
      }
      setFormData({ 
        firstName: "", 
        lastName: "", 
        phone: "", 
        team: "First Team",
        position: "Midfielder",
        emergencyContact: ""
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
      emergencyContact: player.emergencyContact || ""
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
    <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50 h-screen overflow-hidden">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
                Players Management
              </h1>
              <p className="text-gray-600">Manage your team roster and player information</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
            >
              <UserPlus size={20} />
              Add Player
            </button>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="text-green-600" size={24} />
            <p className="font-semibold text-green-800">Player added successfully!</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 rounded-xl">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total</p>
                <p className="text-2xl font-black text-blue-600">{players.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-2.5 rounded-xl">
                <Shield className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">First Team</p>
                <p className="text-2xl font-black text-emerald-600">{firstTeamCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2.5 rounded-xl">
                <Activity className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Reserve Team</p>
                <p className="text-2xl font-black text-orange-600">{reserveTeamCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-2.5 rounded-xl">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Others</p>
                <p className="text-2xl font-black text-purple-600">{othersCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-2.5 rounded-xl">
                <CheckCircle className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Showing</p>
                <p className="text-2xl font-black text-indigo-600">{filteredPlayers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Team Roster</h2>
            
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
              
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
              >
                <option value="All">All Teams</option>
                <option value="First Team">First Team</option>
                <option value="Reserve Team">Reserve Team</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500 font-medium">No players found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlayers.map(player => (
                  <div 
                    key={player.id} 
                    className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800 text-lg">
                          {player.firstName} {player.lastName}
                        </h3>
                        {player.position && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                            {player.position}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm text-gray-500 flex items-center gap-1.5">
                          <Phone size={14} />
                          {player.phone}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        player.team === "First Team" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : player.team === "Reserve Team"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {player.team}
                      </span>
                      
                      <button
                        onClick={() => handleEdit(player)}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all hover:scale-110"
                        title="Edit player"
                      >
                        <Edit size={18} />
                      </button>
                      
                      <button
                        onClick={() => openWhatsApp(player.phone)}
                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all hover:scale-110"
                        title="Open WhatsApp"
                      >
                        <Phone size={18} />
                      </button>
                      
                      <button
                        onClick={() => deletePlayer(player.id)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all hover:scale-110"
                        title="Delete player"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Player Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingPlayer(null)
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 inline-flex items-center justify-center gap-2"
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
