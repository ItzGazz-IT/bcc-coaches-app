import { useState, useEffect } from "react"
import { Calendar, Clock, MapPin, Trophy, Plus, Edit, Trash2, CheckCircle, Users, Search } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { TableSkeleton } from "../components/Loading"

function Fixtures() {
  const { fixtures, addFixture, updateFixture, deleteFixture, loading, userRole, markAsSeen } = useApp()
  
  // Mark fixtures as seen when component mounts
  useEffect(() => {
    markAsSeen("fixtures")
  }, [])
  
  const [showModal, setShowModal] = useState(false)
  const [editingFixture, setEditingFixture] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("All")
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    opponent: "",
    competition: "",
    venue: "",
    homeAway: "Home",
    team: "First Team",
    result: "",
    score: ""
  })
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.date && formData.opponent) {
      const fixtureData = {
        ...formData,
        status: formData.result ? "Completed" : "Upcoming"
      }

      if (editingFixture) {
        await updateFixture(editingFixture.id, fixtureData)
      } else {
        await addFixture(fixtureData)
      }

      setShowModal(false)
      setEditingFixture(null)
      setFormData({
        date: "",
        time: "",
        opponent: "",
        competition: "",
        venue: "",
        homeAway: "Home",
        team: "First Team",
        result: "",
        score: ""
      })
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  const handleEdit = (fixture) => {
    setEditingFixture(fixture)
    setFormData({
      date: fixture.date,
      time: fixture.time || "",
      opponent: fixture.opponent,
      competition: fixture.competition || "",
      venue: fixture.venue || "",
      homeAway: fixture.homeAway || "Home",
      team: fixture.team || "First Team",
      result: fixture.result || "",
      score: fixture.score || ""
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this fixture?")) {
      await deleteFixture(id)
    }
  }

  const filteredFixtures = fixtures
    .filter(fixture => {
      const matchesSearch = fixture.opponent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           fixture.competition?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === "All" || fixture.status === filterStatus
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const upcomingFixtures = filteredFixtures.filter(f => f.status === "Upcoming")
  const completedFixtures = filteredFixtures.filter(f => f.status === "Completed")

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6">
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
                Fixtures
              </h1>
              <p className="text-sm md:text-base text-gray-600 hidden md:block">Team fixtures and match results</p>
            </div>
            {(userRole === "coach" || userRole === "super-admin") && (
              <button
                onClick={() => {
                  setShowModal(true)
                  setEditingFixture(null)
                  setFormData({
                    date: "",
                    time: "",
                    opponent: "",
                    competition: "",
                    venue: "",
                    homeAway: "Home",
                    team: "First Team",
                    result: "",
                    score: ""
                  })
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
              <Plus size={20} />
              Add Fixture
            </button>
            )}
          </div>
        </div>

        {showSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="text-green-600" size={24} />
            <p className="font-semibold text-green-800">Fixture saved successfully!</p>
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={3} />
        ) : (
          <>
        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search fixtures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none bg-white font-semibold"
          >
            <option value="All">All Fixtures</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Fixtures List */}
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Upcoming Fixtures */}
          {(filterStatus === "All" || filterStatus === "Upcoming") && upcomingFixtures.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                <h2 className="text-xl font-bold text-gray-800">Upcoming Fixtures ({upcomingFixtures.length})</h2>
              </div>
              <div className="p-6 space-y-4">
                {upcomingFixtures.map(fixture => (
                  <div key={fixture.id} className="p-5 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
                            {fixture.team}
                          </div>
                          <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
                            fixture.homeAway === "Home" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                          }`}>
                            {fixture.homeAway}
                          </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">
                          vs {fixture.opponent}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar size={16} className="text-blue-500" />
                            <span className="font-semibold">{new Date(fixture.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          {fixture.time && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock size={16} className="text-blue-500" />
                              <span className="font-semibold">{fixture.time}</span>
                            </div>
                          )}
                          {fixture.venue && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin size={16} className="text-blue-500" />
                              <span className="font-semibold">{fixture.venue}</span>
                            </div>
                          )}
                          {fixture.competition && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Trophy size={16} className="text-blue-500" />
                              <span className="font-semibold">{fixture.competition}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {(userRole === "coach" || userRole === "super-admin") && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(fixture)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Edit size={18} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(fixture.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Fixtures */}
          {(filterStatus === "All" || filterStatus === "Completed") && completedFixtures.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                <h2 className="text-xl font-bold text-gray-800">Results ({completedFixtures.length})</h2>
              </div>
              <div className="p-6 space-y-4">
                {completedFixtures.map(fixture => (
                  <div key={fixture.id} className="p-5 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-gray-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
                            {fixture.team}
                          </div>
                          <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
                            fixture.result === "Win" ? "bg-green-100 text-green-700" :
                            fixture.result === "Loss" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {fixture.result}
                          </div>
                          {fixture.score && (
                            <div className="text-2xl font-black text-gray-800">
                              {fixture.score}
                            </div>
                          )}
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">
                          vs {fixture.opponent}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar size={16} className="text-gray-500" />
                            <span className="font-semibold">{new Date(fixture.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          {fixture.competition && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Trophy size={16} className="text-gray-500" />
                              <span className="font-semibold">{fixture.competition}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {(userRole === "coach" || userRole === "super-admin") && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(fixture)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Edit size={18} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(fixture.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredFixtures.length === 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
              <Trophy className="mx-auto text-gray-300 mb-3" size={64} />
              <p className="text-gray-500 font-medium text-lg">No fixtures found</p>
              <p className="text-gray-400 mt-1">Click "Add Fixture" to create one</p>
            </div>
          )}
        </div>
      </>
        )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
              <h2 className="text-2xl font-bold text-white">
                {editingFixture ? "Edit Fixture" : "Add New Fixture"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Opponent *</label>
                <input
                  type="text"
                  required
                  value={formData.opponent}
                  onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="e.g., Arsenal FC"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Team</label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none bg-white"
                  >
                    <option>First Team</option>
                    <option>Reserve Team</option>
                    <option>Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Home/Away</label>
                  <select
                    value={formData.homeAway}
                    onChange={(e) => setFormData({ ...formData, homeAway: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none bg-white"
                  >
                    <option>Home</option>
                    <option>Away</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Competition</label>
                <input
                  type="text"
                  value={formData.competition}
                  onChange={(e) => setFormData({ ...formData, competition: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="e.g., Premier League, FA Cup"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Venue</label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="e.g., Wembley Stadium"
                />
              </div>

              <div className="border-t pt-5">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Match Result (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Result</label>
                    <select
                      value={formData.result}
                      onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="">Not Played</option>
                      <option>Win</option>
                      <option>Draw</option>
                      <option>Loss</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Score</label>
                    <input
                      type="text"
                      value={formData.score}
                      onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="e.g., 2-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                  {editingFixture ? "Update Fixture" : "Save Fixture"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingFixture(null)
                  }}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  Cancel
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

export default Fixtures
