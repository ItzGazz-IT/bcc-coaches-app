import { useState } from "react"
import { UserPlus, AlertTriangle, CheckCircle, Clock, Edit, Trash2, Search, UserCheck } from "lucide-react"
import { useApp } from "../contexts/AppContext"

function InjuriesAvailability() {
  const { players, injuries, addInjury, updateInjury, deleteInjury, getPlayerInjuryStatus } = useApp()

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
    }
  }

  const handleEdit = (injury) => {
    setFormData(injury)
    setEditingId(injury.id)
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

    const matchesSearch =
      player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      injury.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === "all" || injury.status === filterStatus

    return matchesSearch && matchesFilter
  })

  const injuredCount = injuries.filter(i => i.status === 'injured').length
  const unavailableCount = injuries.filter(i => i.status === 'unavailable').length
  const availableCount = players.length - injuredCount - unavailableCount

  return (
    <div className="flex-1 p-10 bg-gradient-to-br from-gray-50 via-white to-red-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-5xl font-black bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent mb-3">Injuries & Availability</h1>
          <p className="text-gray-600 text-lg">Track player injuries and availability status</p>
        </div>
        <div className="flex items-center justify-end mb-8">
          <div className="flex gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-2xl">
                  <CheckCircle className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Available</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{availableCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-2xl">
                  <AlertTriangle className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Injured</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-red-600 to-red-600 bg-clip-text text-transparent">{injuredCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-3 rounded-2xl">
                  <Clock className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Unavailable</p>
                  <p className="text-3xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">{unavailableCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add/Edit Injury Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 h-fit">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-secondary/10 p-2 rounded-lg">
                <UserPlus className="text-secondary" size={24} />
              </div>
              <h2 className="text-xl font-bold text-primary">
                {editingId ? 'Edit Injury/Availability' : 'Report Injury/Availability'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Player
                </label>
                <select
                  required
                  value={formData.playerId}
                  onChange={(e) => setFormData({...formData, playerId: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all bg-white"
                >
                  <option value="">Select Player</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.firstName} {player.lastName} ({player.team})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all bg-white"
                >
                  <option value="injury">Injury</option>
                  <option value="illness">Illness</option>
                  <option value="personal">Personal Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="e.g., Sprained ankle, Food poisoning"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Expected Return Date
                </label>
                <input
                  type="date"
                  value={formData.expectedReturn}
                  onChange={(e) => setFormData({...formData, expectedReturn: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional details..."
                  rows={3}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-red-500 via-orange-600 to-red-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>{editingId ? 'Update' : 'Report'}</span>
                  <AlertTriangle size={18} />
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null)
                      setFormData({
                        playerId: "",
                        type: "injury",
                        description: "",
                        expectedReturn: "",
                        notes: ""
                      })
                    }}
                    className="px-4 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:border-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Injuries List */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-primary mb-4">Player Status</h2>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search players or injuries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all bg-white"
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
                  <p className="text-gray-500">All players are available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredInjuries.map(injury => {
                    const player = players.find(p => p.id === injury.playerId)
                    if (!player) return null

                    return (
                      <div
                        key={injury.id}
                        className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-secondary/30 hover:bg-gray-50 transition-all"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-primary text-lg">
                              {player.firstName} {player.lastName}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                              injury.status === 'recovered' ? 'bg-green-100 text-green-800' :
                              injury.type === 'injury' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {getStatusIcon(injury.status)}
                              {injury.status === 'recovered' ? 'Recovered' :
                               injury.type === 'injury' ? 'Injured' : 'Unavailable'}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                              {player.team}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-1">
                            <strong>{injury.type.charAt(0).toUpperCase() + injury.type.slice(1)}:</strong> {injury.description}
                          </p>

                          {injury.expectedReturn && (
                            <p className="text-sm text-gray-600">
                              <strong>Expected Return:</strong> {new Date(injury.expectedReturn).toLocaleDateString()}
                            </p>
                          )}

                          {injury.notes && (
                            <p className="text-sm text-gray-500 mt-1 italic">
                              {injury.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {injury.status !== 'recovered' && (
                            <button
                              onClick={() => handleRecover(injury.id)}
                              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                              title="Mark as recovered"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}

                          <button
                            onClick={() => handleEdit(injury)}
                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>

                          <button
                            onClick={() => deleteInjury(injury.id)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InjuriesAvailability
