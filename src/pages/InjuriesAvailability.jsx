import { useState } from "react"
import { UserPlus, AlertTriangle, CheckCircle, Clock, Edit, Trash2, Search, UserCheck, X, Heart } from "lucide-react"
import { useApp } from "../contexts/AppContext"

function InjuriesAvailability() {
  const { players, injuries, addInjury, updateInjury, deleteInjury, getPlayerInjuryStatus, userRole, currentPlayerId } = useApp()

  const [formData, setFormData] = useState({
    playerId: "",
    type: "injury",
    description: "",
    expectedReturn: "",
    notes: ""
  })

  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showModal, setShowModal] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.playerId && formData.description) {
      if (editingId) {
        updateInjury(editingId, formData)
        setEditingId(null)
      } else {
        addInjury(formData)
      }
      setFormData({
        playerId: "",
        type: "injury",
        description: "",
        expectedReturn: "",
        notes: ""
      })
      setShowModal(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  const handleEdit = (injury) => {
    setFormData(injury)
    setEditingId(injury.id)
    setShowModal(true)
  }

  const handleRecover = (injuryId) => {
    updateInjury(injuryId, { status: 'recovered' })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'injured': return 'bg-red-100 text-red-800'
      case 'unavailable': return 'bg-yellow-100 text-yellow-800'
      case 'recovered': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'injured': return <AlertTriangle size={16} />
      case 'unavailable': return <Clock size={16} />
      case 'recovered': return <CheckCircle size={16} />
      default: return <UserCheck size={16} />
    }
  }

  const filteredInjuries = injuries.filter(injury => {
    const player = players.find(p => p.id === injury.playerId)
    if (!player) return false

    // For players, only show their own injuries
    if (userRole === "player" && currentPlayerId && injury.playerId !== currentPlayerId) {
      return false
    }

    const matchesSearch =
      player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      injury.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === "all" || injury.status === filterStatus

    return matchesSearch && matchesFilter
  })

  // Get set of valid player IDs
  const validPlayerIds = new Set(players.map(p => p.id))
  
  // Only count injuries for players that still exist
  const validInjuries = injuries.filter(i => validPlayerIds.has(i.playerId))
  
  const injuredCount = validInjuries.filter(i => i.status === 'injured').length
  const unavailableCount = validInjuries.filter(i => i.status === 'unavailable').length
  
  // Count unique players who are injured or unavailable
  const unavailablePlayerIds = new Set(
    validInjuries
      .filter(i => i.status === 'injured' || i.status === 'unavailable')
      .map(i => i.playerId)
  )
  const availableCount = players.length - unavailablePlayerIds.size
  const recoveredCount = validInjuries.filter(i => i.status === 'recovered').length

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6">
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
                Injuries
              </h1>
              <p className="text-sm md:text-base text-gray-600 hidden md:block">Player health and availability</p>
            </div>
            <button
              onClick={() => {
                setShowModal(true)
                setEditingId(null)
                setFormData({
                  playerId: userRole === "player" && currentPlayerId ? currentPlayerId : "",
                  type: "injury",
                  description: "",
                  expectedReturn: "",
                  notes: ""
                })
              }}
              className="bg-gradient-to-r from-red-500 to-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 inline-flex items-center gap-2"
            >
              <Heart size={20} />
              {userRole === "player" ? "Update My Status" : "Report Injury"}
            </button>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="text-green-600" size={24} />
            <p className="font-semibold text-green-800">Status updated successfully!</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2.5 rounded-xl">
                <CheckCircle className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Available</p>
                <p className="text-2xl font-black text-green-600">{availableCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-2.5 rounded-xl">
                <AlertTriangle className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Injured</p>
                <p className="text-2xl font-black text-red-600">{injuredCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl">
                <Clock className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Unavailable</p>
                <p className="text-2xl font-black text-amber-600">{unavailableCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 rounded-xl">
                <UserCheck className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Showing</p>
                <p className="text-2xl font-black text-blue-600">{filteredInjuries.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Injuries List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Player Status</h2>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search players or injuries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
              >
                <option value="all">All Status</option>
                <option value="injured">Injured</option>
                <option value="unavailable">Unavailable</option>
                <option value="recovered">Recovered</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            {filteredInjuries.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto text-green-300 mb-3" size={48} />
                <p className="text-gray-500 font-medium">All players are available</p>
                <p className="text-gray-400 text-sm mt-1">No injuries or unavailability reported</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInjuries.map(injury => {
                  const player = players.find(p => p.id === injury.playerId)
                  if (!player) return null

                  return (
                    <div
                      key={injury.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-800 text-lg">
                            {player.firstName} {player.lastName}
                          </h3>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            injury.status === 'recovered' ? 'bg-green-100 text-green-700' :
                            injury.type === 'injury' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {getStatusIcon(injury.status)}
                            {injury.status === 'recovered' ? 'Recovered' :
                             injury.type === 'injury' ? 'Injured' : 'Unavailable'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            player.team === "First Team" 
                              ? "bg-emerald-100 text-emerald-700" 
                              : player.team === "Reserve Team"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-purple-100 text-purple-700"
                          }`}>
                            {player.team}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm text-gray-700">
                            <strong className="text-gray-800">{injury.type.charAt(0).toUpperCase() + injury.type.slice(1)}:</strong> {injury.description}
                          </p>

                          {injury.expectedReturn && (
                            <p className="text-sm text-gray-600 flex items-center gap-1.5">
                              <Clock size={14} />
                              Expected Return: {new Date(injury.expectedReturn).toLocaleDateString()}
                            </p>
                          )}

                          {injury.notes && (
                            <p className="text-sm text-gray-500 italic">
                              Note: {injury.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {injury.status !== 'recovered' && (
                          <button
                            onClick={() => handleRecover(injury.id)}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                            title="Mark as recovered"
                          >
                            <CheckCircle size={16} className="text-green-600" />
                          </button>
                        )}

                        <button
                          onClick={() => handleEdit(injury)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} className="text-blue-600" />
                        </button>

                        {(userRole === "coach" || userRole === "super-admin") && (
                          <button
                            onClick={() => deleteInjury(injury.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Injury Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
              <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-red-500 to-orange-600 p-2.5 rounded-xl">
                    <Heart className="text-white" size={22} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingId ? 'Edit Status' : 'Report Injury/Availability'}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingId(null)
                    setFormData({
                      playerId: "",
                      type: "injury",
                      description: "",
                      expectedReturn: "",
                      notes: ""
                    })
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                {(userRole === "coach" || userRole === "super-admin") ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Player *
                    </label>
                    <select
                      required
                      value={formData.playerId}
                      onChange={(e) => setFormData({...formData, playerId: e.target.value})}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                    >
                      <option value="">Select Player</option>
                      {players.map(player => (
                        <option key={player.id} value={player.id}>
                          {player.firstName} {player.lastName} ({player.team})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-blue-800">
                      Updating status for: {players.find(p => p.id === currentPlayerId)?.firstName} {players.find(p => p.id === currentPlayerId)?.lastName}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                  >
                    <option value="injury">Injury</option>
                    <option value="illness">Illness</option>
                    <option value="personal">Personal Leave</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="e.g., Sprained ankle, Food poisoning"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Expected Return Date
                  </label>
                  <input
                    type="date"
                    value={formData.expectedReturn}
                    onChange={(e) => setFormData({...formData, expectedReturn: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                    style={{ colorScheme: 'light' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Additional details..."
                    rows={3}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingId(null)
                      setFormData({
                        playerId: "",
                        type: "injury",
                        description: "",
                        expectedReturn: "",
                        notes: ""
                      })
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-red-500 to-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 inline-flex items-center justify-center gap-2"
                  >
                    <Heart size={18} />
                    {editingId ? 'Update' : 'Report'}
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

export default InjuriesAvailability
