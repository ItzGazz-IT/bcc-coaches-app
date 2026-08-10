import { useState, useEffect } from "react"
import { UserPlus, Phone, Users, Shield, Trash2, Search, CheckCircle, Activity, X, Edit } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { useSearchParams } from "react-router-dom"
import { TableSkeleton } from "../components/Loading"
import { generateUsername, generatePassword } from "../utils/credentialUtils"
import { getSport } from "../config/sports"

function Players() {
  const { players, addPlayer, updatePlayer, deletePlayer, loading, userRole, teams, currentTeamId, currentClubId } = useApp()
  const availableTeams = teams.filter(team => team.clubId === currentClubId && (userRole === "club-admin" || team.id === currentTeamId))
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    phone: "",
    teamId: currentTeamId || "",
    position: "Midfielder",
    emergencyContact: "",
    username: "",
    password: ""
  })
  const selectedTeam = teams.find(team => team.id === formData.teamId) || teams.find(team => team.id === currentTeamId)
  const activeSport = getSport(selectedTeam?.sportId)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    if (!editingPlayer && !activeSport.roles.includes(formData.position)) {
      setFormData(current => ({ ...current, position: activeSport.roles[0] }))
    }
  }, [activeSport.id, editingPlayer])

  useEffect(() => {
    searchParams.get("team")
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError("")
    if (formData.firstName && formData.lastName && formData.phone) {
      const playerData = { ...formData }
      
      // Auto-generate credentials if creating a new player
      if (!editingPlayer) {
        // Generate username and password
        playerData.username = generateUsername(formData.firstName, formData.lastName)
        playerData.password = generatePassword(10)
      } else if (editingPlayer && !formData.password) {
        // If editing and password is empty, remove it from the update
        delete playerData.password
      }
      
      // If username is empty, remove it
      if (!playerData.username) {
        delete playerData.username
        delete playerData.password
      }
      
      try {
        if (editingPlayer) await updatePlayer(editingPlayer.id, playerData)
        else await addPlayer(playerData)
      } catch (error) {
        setFormError(error.message || "Could not save this player.")
        return
      }
      setFormData({ 
        firstName: "", 
        lastName: "", 
        nickname: "",
        phone: "", 
        teamId: currentTeamId || "",
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
      nickname: player.nickname || "",
      phone: player.phone,
      teamId: player.teamId || currentTeamId || "",
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
      player.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.phone.includes(searchTerm)
    return matchesSearch
  })

  if (userRole !== "coach" && userRole !== "club-admin" && userRole !== "super-admin") {
    return (
      <div className="flex-1 p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto text-red-500 mb-3" size={48} />
          <p className="text-gray-600 font-semibold">Coaches only</p>
        </div>
      </div>
    )
  }

  return (
    <div className="players-directory flex-1 p-4 md:p-8 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="page-hero mb-5">
          <div className="directory-page-head">
            <div className="flex-1">
              <span className="eyebrow">Team setup</span><h1 className="text-3xl md:text-5xl font-black text-slate-950 mb-1">
                Players
              </h1>
              <p className="text-sm md:text-base text-gray-600 hidden md:block">Manage your team roster</p>
            </div>
            {(userRole === "coach" || userRole === "club-admin" || userRole === "super-admin") && (
              <button
                onClick={() => { setEditingPlayer(null); setFormError(""); setFormData({ firstName:"", lastName:"", nickname:"", phone:"", teamId:currentTeamId||availableTeams[0]?.id||"", position:getSport(availableTeams.find(team=>team.id===(currentTeamId||availableTeams[0]?.id))?.sportId).roles[0], emergencyContact:"", username:"", password:"" }); setShowModal(true) }}
                className="directory-add-button"
              >
                <UserPlus size={18} />
                <span className="hidden sm:inline">Add Player</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
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
        <div className="directory-summary grid grid-cols-2 gap-3 mb-4">
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
        <div className="directory-surface bg-white rounded-xl shadow-sm border border-gray-100">
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
                    className="directory-person-row flex flex-col sm:flex-row sm:items-center gap-3 p-3"
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
                        {player.nickname && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded">
                            {player.nickname}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">
                          {teams.find(team => team.id === player.teamId)?.name || "No team"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1.5">
                        <Phone size={13} />
                        {player.phone}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {(userRole === "coach" || userRole === "club-admin" || userRole === "super-admin") && (
                        <>
                          <button
                            onClick={() => handleEdit(player)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                            title="Edit"
                          >
                            <Edit size={16} className="text-blue-600" />
                          </button>
                          
                          <button
                            onClick={() => deletePlayer(player.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => openWhatsApp(player.phone)}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors flex-shrink-0"
                        title="WhatsApp"
                      >
                        <Phone size={16} className="text-green-600" />
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
            <div className="unyra-dialog bg-white max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
              <div className="unyra-dialog-head sticky top-0 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-cyan-500 p-2.5 rounded-xl">
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
                    Nickname / Known As
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                    placeholder="e.g., Speedy"
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
                    Team
                  </label>
                  <select
                    value={formData.teamId}
                    onChange={(e) => setFormData({...formData, teamId: e.target.value, position: getSport(teams.find(team => team.id === e.target.value)?.sportId).roles[0]})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                    required
                  >
                    <option value="">Choose a team</option>
                    {availableTeams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
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
                    {activeSport.roles.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>

                <div className="player-login-module-note"><Shield size={18} /><div><strong>Player Login module</strong><p>Login access is prepared automatically and remains available for later activation.</p></div></div>

                {formError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError}</div>}
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
                    className="unyra-dialog-submit flex-1 inline-flex items-center justify-center gap-2"
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
