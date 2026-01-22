import { useState } from "react"
import { UserPlus, Phone, Users, Shield, Trash2, Search } from "lucide-react"
import { useApp } from "../contexts/AppContext"

function Players() {
  const { players, addPlayer, deletePlayer } = useApp()
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    team: "First Team"
  })
  
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTeam, setFilterTeam] = useState("All")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.firstName && formData.lastName && formData.phone) {
      addPlayer(formData)
      setFormData({ firstName: "", lastName: "", phone: "", team: "First Team" })
    }
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
  const reservesCount = players.filter(p => p.team === "Reserves").length

  return (
    <div className="flex-1 p-8 bg-bg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">Players</h1>
            <p className="text-gray-600">Manage your team roster</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2">
                <Shield className="text-secondary" size={20} />
                <div>
                  <p className="text-xs text-gray-500">First Team</p>
                  <p className="text-2xl font-bold text-primary">{firstTeamCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="text-accent" size={20} />
                <div>
                  <p className="text-xs text-gray-500">Reserves</p>
                  <p className="text-2xl font-bold text-primary">{reservesCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Player Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 h-fit">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-secondary/10 p-2 rounded-lg">
                <UserPlus className="text-secondary" size={24} />
              </div>
              <h2 className="text-xl font-bold text-primary">Add New Player</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  placeholder="John"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Smith"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+27 82 123 4567"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Team
                </label>
                <select
                  value={formData.team}
                  onChange={(e) => setFormData({...formData, team: e.target.value})}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all bg-white"
                >
                  <option value="First Team">First Team</option>
                  <option value="Reserves">Reserves</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-secondary to-accent text-white py-3 rounded-xl font-bold shadow-lg shadow-secondary/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
              >
                Add Player
              </button>
            </form>
          </div>

          {/* Players List */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-primary mb-4">Team Roster</h2>
              
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
                  />
                </div>
                
                <select
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all bg-white"
                >
                  <option value="All">All Teams</option>
                  <option value="First Team">First Team</option>
                  <option value="Reserves">Reserves</option>
                </select>
              </div>
            </div>

            <div className="p-6">
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">No players found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPlayers.map(player => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-secondary/30 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex-1">
                        <h3 className="font-bold text-primary text-lg">
                          {player.firstName} {player.lastName}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Phone size={14} />
                          {player.phone}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          player.team === "First Team" 
                            ? "bg-secondary/10 text-secondary" 
                            : "bg-accent/10 text-accent"
                        }`}>
                          {player.team}
                        </span>
                        
                        <button
                          onClick={() => openWhatsApp(player.phone)}
                          className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                          title="Open WhatsApp"
                        >
                          <Phone size={18} />
                        </button>
                        
                        <button
                          onClick={() => deletePlayer(player.id)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
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
        </div>
      </div>
    </div>
  )
}

export default Players
