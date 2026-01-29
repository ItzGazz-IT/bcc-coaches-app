import { useState, useEffect } from "react"
import { TrendingUp, Search, Edit, Trash2, CheckCircle, X, Activity, Users } from "lucide-react"
import { useApp } from "../contexts/AppContext"

function FitnessTests() {
  const { players, fitnessTests, addFitnessTest, updateFitnessTest, deleteFitnessTest } = useApp()
  
  const [formData, setFormData] = useState({
    playerId: "",
    date: new Date().toISOString().split('T')[0],
    beepTest: "",
    sprint10m: "",
    tTest: "",
    pushUps: "",
    sitUps: ""
  })
  
  const [searchTerm, setSearchTerm] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingTest, setEditingTest] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const handlePlayerClick = (player) => {
    setFormData({
      playerId: player.id,
      date: selectedDate,
      beepTest: "",
      sprint10m: "",
      tTest: "",
      pushUps: "",
      sitUps: ""
    })
    setEditingTest(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.playerId && formData.date) {
      const player = players.find(p => p.id === formData.playerId)
      const testData = {
        playerId: formData.playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        ...formData
      }

      if (editingTest) {
        await updateFitnessTest(editingTest.id, testData)
      } else {
        await addFitnessTest(testData)
      }

      setFormData({
        playerId: "",
        date: selectedDate,
        beepTest: "",
        sprint10m: "",
        tTest: "",
        pushUps: "",
        sitUps: ""
      })
      setShowModal(false)
      setEditingTest(null)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  const handleEdit = (test) => {
    setEditingTest(test)
    setFormData({
      playerId: test.playerId,
      date: test.date,
      beepTest: test.beepTest || "",
      sprint10m: test.sprint10m || "",
      tTest: test.tTest || "",
      pushUps: test.pushUps || "",
      sitUps: test.sitUps || ""
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this fitness test?")) {
      await deleteFitnessTest(id)
    }
  }

  const filteredPlayers = players.filter(player => {
    const matchesSearch = 
      player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const getPlayerTestForDate = (playerId, date) => {
    return fitnessTests.find(t => t.playerId === playerId && t.date === date)
  }

  const testsForSelectedDate = fitnessTests.filter(t => t.date === selectedDate)

  const getPlayerStats = (playerId) => {
    const playerTests = fitnessTests.filter(t => t.playerId === playerId)
    return {
      totalTests: playerTests.length,
      latestTest: playerTests.length > 0 ? playerTests.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null
    }
  }

  return (
    <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50 h-screen overflow-hidden">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
                Fitness Tests
              </h1>
              <p className="text-gray-600">Record fitness test results for today's session</p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Test Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {showSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="text-green-600" size={24} />
            <p className="font-semibold text-green-800">Fitness test saved successfully!</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 rounded-xl">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total Players</p>
                <p className="text-2xl font-black text-blue-600">{players.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-2.5 rounded-xl">
                <CheckCircle className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Tested Today</p>
                <p className="text-2xl font-black text-green-600">{testsForSelectedDate.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-2.5 rounded-xl">
                <Activity className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Remaining</p>
                <p className="text-2xl font-black text-orange-600">{players.length - testsForSelectedDate.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-2.5 rounded-xl">
                <TrendingUp className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Completion</p>
                <p className="text-2xl font-black text-purple-600">
                  {players.length > 0 ? Math.round((testsForSelectedDate.length / players.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Select Player for {new Date(selectedDate).toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500 font-medium">No players found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPlayers.map(player => {
                  const existingTest = getPlayerTestForDate(player.id, selectedDate)
                  const stats = getPlayerStats(player.id)
                  
                  return (
                    <button
                      key={player.id}
                      onClick={() => existingTest ? handleEdit(existingTest) : handlePlayerClick(player)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        existingTest
                          ? "border-green-300 bg-green-50 hover:bg-green-100"
                          : "border-gray-200 bg-white hover:bg-purple-50 hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-800">
                              {player.firstName} {player.lastName}
                            </h3>
                            {existingTest && (
                              <CheckCircle className="text-green-600" size={18} />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              player.team === "First Team" 
                                ? "bg-emerald-100 text-emerald-700" 
                                : player.team === "Reserve Team"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-purple-100 text-purple-700"
                            }`}>
                              {player.team}
                            </span>
                            <span className="text-xs text-gray-500">
                              {stats.totalTests} {stats.totalTests === 1 ? 'test' : 'tests'} total
                            </span>
                          </div>
                        </div>
                      </div>

                      {existingTest ? (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {existingTest.beepTest && (
                            <div className="bg-white rounded p-2 border border-green-200">
                              <p className="text-[10px] font-semibold text-green-600 uppercase">Beep</p>
                              <p className="text-sm font-black text-green-700">{existingTest.beepTest}</p>
                            </div>
                          )}
                          {existingTest.sprint10m && (
                            <div className="bg-white rounded p-2 border border-green-200">
                              <p className="text-[10px] font-semibold text-green-600 uppercase">10m</p>
                              <p className="text-sm font-black text-green-700">{existingTest.sprint10m}s</p>
                            </div>
                          )}
                          {existingTest.tTest && (
                            <div className="bg-white rounded p-2 border border-green-200">
                              <p className="text-[10px] font-semibold text-green-600 uppercase">T Test</p>
                              <p className="text-sm font-black text-green-700">{existingTest.tTest}s</p>
                            </div>
                          )}
                          {existingTest.pushUps && (
                            <div className="bg-white rounded p-2 border border-green-200">
                              <p className="text-[10px] font-semibold text-green-600 uppercase">Push</p>
                              <p className="text-sm font-black text-green-700">{existingTest.pushUps}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 text-purple-600 text-sm font-semibold flex items-center gap-1">
                          <TrendingUp size={16} />
                          Click to record test
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-2.5 rounded-xl">
                    <TrendingUp className="text-white" size={22} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {editingTest ? "Edit Fitness Test" : "Record Fitness Test"}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingTest(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Player *
                  </label>
                  <select
                    required
                    value={formData.playerId}
                    onChange={(e) => setFormData({...formData, playerId: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all bg-white"
                    disabled={!editingTest}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Test Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Beep Test Level
                    </label>
                    <input
                      type="text"
                      value={formData.beepTest}
                      onChange={(e) => setFormData({...formData, beepTest: e.target.value})}
                      placeholder="e.g., 12.5"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      10m Sprint (seconds)
                    </label>
                    <input
                      type="text"
                      value={formData.sprint10m}
                      onChange={(e) => setFormData({...formData, sprint10m: e.target.value})}
                      placeholder="e.g., 1.75"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      T Test (seconds)
                    </label>
                    <input
                      type="text"
                      value={formData.tTest}
                      onChange={(e) => setFormData({...formData, tTest: e.target.value})}
                      placeholder="e.g., 9.5"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Push Ups (number)
                    </label>
                    <input
                      type="text"
                      value={formData.pushUps}
                      onChange={(e) => setFormData({...formData, pushUps: e.target.value})}
                      placeholder="e.g., 65"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sit Ups (number)
                    </label>
                    <input
                      type="text"
                      value={formData.sitUps}
                      onChange={(e) => setFormData({...formData, sitUps: e.target.value})}
                      placeholder="e.g., 45"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingTest(null)
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  {editingTest && (
                    <button
                      type="button"
                      onClick={() => {
                        handleDelete(editingTest.id)
                        setShowModal(false)
                        setEditingTest(null)
                      }}
                      className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all inline-flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 inline-flex items-center justify-center gap-2"
                  >
                    <TrendingUp size={18} />
                    {editingTest ? "Update Test" : "Save Test"}
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

export default FitnessTests
