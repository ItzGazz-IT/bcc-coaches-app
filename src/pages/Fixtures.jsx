import { useState, useEffect } from "react"
import { Calendar, Clock, MapPin, Trophy, Plus, Edit, Trash2, CheckCircle, Users, Search } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { TableSkeleton } from "../components/Loading"

const getDefaultKickoffTime = (team) => {
  if (team === "Reserve Team") return "13:45"
  if (team === "First Team") return "15:30"
  return ""
}

const getTeamLabel = (team) => {
  if (team === "Others") return "Div 1"
  if (team === "Reserve Team") return "Reserves"
  return team
}

const getFixtureTime = (fixture) => fixture.time || getDefaultKickoffTime(fixture.team)

const groupFixtures = (fixtures) => {
  const groups = new Map()

  fixtures.forEach((fixture) => {
    const key = [
      fixture.date,
      fixture.opponent,
      fixture.venue || "",
      fixture.homeAway || "",
      fixture.competition || ""
    ].join("|")

    if (!groups.has(key)) {
      groups.set(key, {
        date: fixture.date,
        opponent: fixture.opponent,
        venue: fixture.venue,
        homeAway: fixture.homeAway,
        competition: fixture.competition,
        fixtures: []
      })
    }

    groups.get(key).fixtures.push(fixture)
  })

  return Array.from(groups.values()).sort((a, b) => new Date(a.date) - new Date(b.date))
}

const getTeamSortKey = (team) => {
  if (team === "Reserve Team") return 1
  if (team === "First Team") return 2
  if (team === "Others" || team === "Div 1") return 3
  return 4
}

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
    time: getDefaultKickoffTime("First Team"),
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
        time: getDefaultKickoffTime("First Team"),
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
      time: fixture.time || getDefaultKickoffTime(fixture.team || "First Team"),
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

  const groupedUpcomingFixtures = groupFixtures(upcomingFixtures)
  const groupedCompletedFixtures = groupFixtures(completedFixtures)

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
                    time: getDefaultKickoffTime("First Team"),
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
          {(filterStatus === "All" || filterStatus === "Upcoming") && groupedUpcomingFixtures.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                <h2 className="text-xl font-bold text-gray-800">Upcoming Fixtures ({groupedUpcomingFixtures.length})</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {groupedUpcomingFixtures.map(group => {
                  const sortedFixtures = [...group.fixtures].sort((a, b) => getTeamSortKey(a.team) - getTeamSortKey(b.team))
                  return (
                    <div key={`${group.date}-${group.opponent}-${group.venue}-${group.homeAway}`} className="p-4 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {sortedFixtures.map(teamFixture => {
                                const kickoffTime = getFixtureTime(teamFixture)
                                return (
                                  <div key={teamFixture.id} className="flex items-center gap-2">
                                    <div className="bg-blue-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold">
                                      {getTeamLabel(teamFixture.team)}
                                    </div>
                                    {kickoffTime && (
                                      <div className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                        {kickoffTime}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                              <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                group.homeAway === "Home" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                              }`}>
                                {group.homeAway}
                              </div>
                            </div>
                          </div>
                          <h3 className="text-lg font-black text-gray-800 mb-2">
                            vs {group.opponent}
                          </h3>
                          <div className="grid grid-cols-1 gap-2 text-xs">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar size={16} className="text-blue-500" />
                              <span className="font-semibold">{new Date(group.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            {sortedFixtures.map(teamFixture => {
                              const kickoffTime = getFixtureTime(teamFixture)
                              if (!kickoffTime) return null
                              return (
                                <div key={`${teamFixture.id}-time`} className="flex items-center gap-2 text-gray-600">
                                  <Clock size={16} className="text-blue-500" />
                                  <span className="font-semibold">{getTeamLabel(teamFixture.team)} {kickoffTime}</span>
                                </div>
                              )
                            })}
                            {group.venue && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin size={16} className="text-blue-500" />
                                <span className="font-semibold">{group.venue}</span>
                              </div>
                            )}
                            {group.competition && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Trophy size={16} className="text-blue-500" />
                                <span className="font-semibold">{group.competition}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {(userRole === "coach" || userRole === "super-admin") && (
                          <div className="flex flex-col items-end gap-2">
                            {sortedFixtures.map(teamFixture => (
                              <div key={`${teamFixture.id}-actions`} className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(teamFixture)}
                                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                  title={`Edit ${getTeamLabel(teamFixture.team)}`}
                                >
                                  <Edit size={16} className="text-blue-600" />
                                </button>
                                <button
                                  onClick={() => handleDelete(teamFixture.id)}
                                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                  title={`Delete ${getTeamLabel(teamFixture.team)}`}
                                >
                                  <Trash2 size={16} className="text-red-600" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed Fixtures */}
          {(filterStatus === "All" || filterStatus === "Completed") && groupedCompletedFixtures.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                <h2 className="text-xl font-bold text-gray-800">Results ({groupedCompletedFixtures.length})</h2>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {groupedCompletedFixtures.map(group => {
                  const sortedFixtures = [...group.fixtures].sort((a, b) => getTeamSortKey(a.team) - getTeamSortKey(b.team))
                  return (
                    <div key={`${group.date}-${group.opponent}-${group.venue}-${group.homeAway}-completed`} className="p-4 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {sortedFixtures.map(teamFixture => {
                                const kickoffTime = getFixtureTime(teamFixture)
                                return (
                                  <div key={teamFixture.id} className="flex items-center gap-2">
                                    <div className="bg-gray-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold">
                                      {getTeamLabel(teamFixture.team)}
                                    </div>
                                    {kickoffTime && (
                                      <div className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                        {kickoffTime}
                                      </div>
                                    )}
                                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                      teamFixture.result === "Win" ? "bg-green-100 text-green-700" :
                                      teamFixture.result === "Loss" ? "bg-red-100 text-red-700" :
                                      "bg-gray-100 text-gray-700"
                                    }`}>
                                      {teamFixture.result}
                                    </div>
                                    {teamFixture.score && (
                                      <div className="text-sm font-black text-gray-800">
                                        {teamFixture.score}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          <h3 className="text-lg font-black text-gray-800 mb-2">
                            vs {group.opponent}
                          </h3>
                          <div className="grid grid-cols-1 gap-2 text-xs">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar size={16} className="text-gray-500" />
                              <span className="font-semibold">{new Date(group.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                            {sortedFixtures.map(teamFixture => {
                              const kickoffTime = getFixtureTime(teamFixture)
                              if (!kickoffTime) return null
                              return (
                                <div key={`${teamFixture.id}-time`} className="flex items-center gap-2 text-gray-600">
                                  <Clock size={16} className="text-gray-500" />
                                  <span className="font-semibold">{getTeamLabel(teamFixture.team)} {kickoffTime}</span>
                                </div>
                              )
                            })}
                            {group.competition && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Trophy size={16} className="text-gray-500" />
                                <span className="font-semibold">{group.competition}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {(userRole === "coach" || userRole === "super-admin") && (
                          <div className="flex flex-col items-end gap-2">
                            {sortedFixtures.map(teamFixture => (
                              <div key={`${teamFixture.id}-actions`} className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(teamFixture)}
                                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                                  title={`Edit ${getTeamLabel(teamFixture.team)}`}
                                >
                                  <Edit size={16} className="text-blue-600" />
                                </button>
                                <button
                                  onClick={() => handleDelete(teamFixture.id)}
                                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                  title={`Delete ${getTeamLabel(teamFixture.team)}`}
                                >
                                  <Trash2 size={16} className="text-red-600" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
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
                    onChange={(e) => {
                      const nextTeam = e.target.value
                      const currentDefault = getDefaultKickoffTime(formData.team)
                      const nextDefault = getDefaultKickoffTime(nextTeam)
                      const nextTime = formData.time && formData.time !== currentDefault
                        ? formData.time
                        : nextDefault
                      setFormData({ ...formData, team: nextTeam, time: nextTime })
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none bg-white"
                  >
                    <option>First Team</option>
                    <option>Reserve Team</option>
                    <option>Div 1</option>
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
