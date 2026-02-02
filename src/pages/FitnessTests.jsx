import { useState, useEffect } from "react"
import { TrendingUp, Search, Edit, Trash2, CheckCircle, X, Activity, Users, Plus, Calendar, Trophy, Award } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { TableSkeleton } from "../components/Loading"

function FitnessTests() {
  const { players, fitnessTests, addFitnessTest, updateFitnessTest, deleteFitnessTest, loading } = useApp()
  
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
  const [filterDate, setFilterDate] = useState("all")

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
        date: new Date().toISOString().split('T')[0],
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

  // Get unique test dates
  const uniqueDates = [...new Set(fitnessTests.map(t => t.date))].sort((a, b) => new Date(b) - new Date(a))

  // Filter tests
  const filteredTests = fitnessTests.filter(test => {
    const matchesSearch = test.playerName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDate = filterDate === "all" || test.date === filterDate
    return matchesSearch && matchesDate
  }).sort((a, b) => new Date(b.date) - new Date(a.date))

  // Calculate overall averages
  const calculateOverallAverages = () => {
    const testsToAverage = filterDate === "all" ? fitnessTests : fitnessTests.filter(t => t.date === filterDate)
    
    if (testsToAverage.length === 0) {
      return { beepTest: 0, sprint10m: 0, tTest: 0, pushUps: 0, sitUps: 0 }
    }

    const totals = testsToAverage.reduce((acc, test) => {
      if (test.beepTest) acc.beepTest.push(parseFloat(test.beepTest))
      if (test.sprint10m) acc.sprint10m.push(parseFloat(test.sprint10m))
      if (test.tTest) acc.tTest.push(parseFloat(test.tTest))
      if (test.pushUps) acc.pushUps.push(parseFloat(test.pushUps))
      if (test.sitUps) acc.sitUps.push(parseFloat(test.sitUps))
      return acc
    }, { beepTest: [], sprint10m: [], tTest: [], pushUps: [], sitUps: [] })

    return {
      beepTest: totals.beepTest.length > 0 ? (totals.beepTest.reduce((a, b) => a + b, 0) / totals.beepTest.length).toFixed(1) : 0,
      sprint10m: totals.sprint10m.length > 0 ? (totals.sprint10m.reduce((a, b) => a + b, 0) / totals.sprint10m.length).toFixed(2) : 0,
      tTest: totals.tTest.length > 0 ? (totals.tTest.reduce((a, b) => a + b, 0) / totals.tTest.length).toFixed(2) : 0,
      pushUps: totals.pushUps.length > 0 ? Math.round(totals.pushUps.reduce((a, b) => a + b, 0) / totals.pushUps.length) : 0,
      sitUps: totals.sitUps.length > 0 ? Math.round(totals.sitUps.reduce((a, b) => a + b, 0) / totals.sitUps.length) : 0
    }
  }

  const averages = calculateOverallAverages()

  // Calculate player rankings based on their latest test
  const calculatePlayerRankings = () => {
    // Get the latest test for each player
    const latestTests = {}
    const testsToRank = filterDate === "all" ? fitnessTests : fitnessTests.filter(t => t.date === filterDate)
    
    testsToRank.forEach(test => {
      if (!latestTests[test.playerId] || new Date(test.date) > new Date(latestTests[test.playerId].date)) {
        latestTests[test.playerId] = test
      }
    })

    // Calculate composite score for each player
    const playerScores = Object.values(latestTests).map(test => {
      let score = 0
      let testCount = 0

      // Beep test (higher is better) - normalize to 0-100
      if (test.beepTest) {
        const beepScore = Math.min((parseFloat(test.beepTest) / 15) * 100, 100)
        score += beepScore
        testCount++
      }

      // 10m Sprint (lower is better) - normalize to 0-100
      if (test.sprint10m) {
        const sprintScore = Math.min(Math.max(100 - ((parseFloat(test.sprint10m) - 1.5) / 0.5) * 100, 0), 100)
        score += sprintScore
        testCount++
      }

      // T Test (lower is better) - normalize to 0-100
      if (test.tTest) {
        const tTestScore = Math.min(Math.max(100 - ((parseFloat(test.tTest) - 8) / 2) * 100, 0), 100)
        score += tTestScore
        testCount++
      }

      // Push ups (higher is better) - normalize to 0-100
      if (test.pushUps) {
        const pushScore = Math.min((parseFloat(test.pushUps) / 80) * 100, 100)
        score += pushScore
        testCount++
      }

      // Sit ups (higher is better) - normalize to 0-100
      if (test.sitUps) {
        const sitScore = Math.min((parseFloat(test.sitUps) / 60) * 100, 100)
        score += sitScore
        testCount++
      }

      const averageScore = testCount > 0 ? score / testCount : 0

      return {
        playerId: test.playerId,
        playerName: test.playerName,
        score: averageScore,
        testCount: testCount,
        date: test.date,
        beepTest: test.beepTest,
        sprint10m: test.sprint10m,
        tTest: test.tTest,
        pushUps: test.pushUps,
        sitUps: test.sitUps
      }
    })

    return playerScores
      .filter(p => p.testCount > 0)
      .sort((a, b) => b.score - a.score)
  }

  const rankings = calculatePlayerRankings()

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
                Fitness Tests
              </h1>
              <p className="text-sm md:text-base text-gray-600 hidden md:block">Overall fitness performance rankings</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all bg-white"
              >
                <option value="all">All Dates</option>
                {uniqueDates.map(date => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setFormData({
                    playerId: "",
                    date: new Date().toISOString().split('T')[0],
                    beepTest: "",
                    sprint10m: "",
                    tTest: "",
                    pushUps: "",
                    sitUps: ""
                  })
                  setEditingTest(null)
                  setShowModal(true)
                }}
                className="btn btn-purple inline-flex items-center gap-2 text-sm md:text-base"
              >
                <Plus size={20} />
                Add Test
              </button>
            </div>
          </div>
        </div>

        {showSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="text-green-600" size={24} />
            <p className="font-semibold text-green-800">Fitness test saved successfully!</p>
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={5} />
        ) : (
          <>

        {/* Test Averages */}
        {fitnessTests.length > 0 && (
          <div className="mb-4 md:mb-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-2 rounded-lg">
                <TrendingUp className="text-white" size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">Average Results</h3>
                <p className="text-xs text-gray-600">
                  {filterDate === "all" 
                    ? `${fitnessTests.length} tests` 
                    : new Date(filterDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  }
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-0.5">Beep</p>
                <p className="text-xl md:text-2xl font-black text-purple-600">{averages.beepTest > 0 ? averages.beepTest : '-'}</p>
                <p className="text-xs text-gray-500">level</p>
              </div>
              
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-0.5">Sprint</p>
                <p className="text-xl md:text-2xl font-black text-blue-600">{averages.sprint10m > 0 ? `${averages.sprint10m}s` : '-'}</p>
                <p className="text-xs text-gray-500">10m</p>
              </div>
              
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-0.5">T-Test</p>
                <p className="text-xl md:text-2xl font-black text-green-600">{averages.tTest > 0 ? `${averages.tTest}s` : '-'}</p>
                <p className="text-xs text-gray-500">time</p>
              </div>
              
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-0.5">Push</p>
                <p className="text-xl md:text-2xl font-black text-orange-600">{averages.pushUps > 0 ? averages.pushUps : '-'}</p>
                <p className="text-xs text-gray-500">reps</p>
              </div>
              
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-0.5">Sit Ups</p>
                <p className="text-xl md:text-2xl font-black text-pink-600">{averages.sitUps > 0 ? averages.sitUps : '-'}</p>
                <p className="text-xs text-gray-500">reps</p>
              </div>
            </div>
          </div>
        )}

        {/* Player Rankings */}
        {rankings.length > 0 && (
          <div className="mb-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-2.5 rounded-xl">
                <Trophy className="text-white" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Overall Fitness Rankings</h3>
                <p className="text-sm text-gray-600">
                  {filterDate === "all" 
                    ? "Based on latest test for each player" 
                    : `For test on ${new Date(filterDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  }
                </p>
              </div>
            </div>
            
            {/* Top 3 Players - Special Display */}
            <div className="space-y-3 mb-6">
              {rankings.slice(0, 3).map((player, index) => {
                const medalColors = {
                  0: 'from-yellow-400 to-yellow-500',
                  1: 'from-gray-300 to-gray-400',
                  2: 'from-orange-400 to-orange-500'
                }
                const bgColors = {
                  0: 'bg-yellow-100 border-yellow-300',
                  1: 'bg-gray-100 border-gray-300',
                  2: 'bg-orange-100 border-orange-300'
                }
                
                return (
                  <div 
                    key={`top-${player.playerId}-${index}`}
                    className={`${bgColors[index]} rounded-xl p-3 border shadow-sm hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-9 h-9 bg-gradient-to-br ${medalColors[index]} rounded-lg flex items-center justify-center`}>
                        <Award className="text-white" size={18} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <h4 className="font-bold text-sm text-gray-800 truncate">{player.playerName}</h4>
                          {index === 0 && <span className="text-[9px] px-1.5 py-0.5 bg-yellow-200 text-yellow-800 rounded-full font-bold">TOP</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-600 mb-2">
                          <span className="flex items-center gap-1">
                            <Activity size={10} />
                            {player.testCount} test{player.testCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="font-semibold">{player.score.toFixed(1)}/100</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {player.beepTest && (
                            <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {player.beepTest}
                            </span>
                          )}
                          {player.sprint10m && (
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {player.sprint10m}s
                            </span>
                          )}
                          {player.pushUps && (
                            <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {player.pushUps}
                            </span>
                          )}
                          {player.sitUps && (
                            <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {player.sitUps}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${medalColors[index]} transition-all duration-500`}
                        style={{ width: `${player.score}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* All Other Players - Compact List */}
            {rankings.length > 3 && (
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 px-2">All Players</h4>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {rankings.slice(3).map((player, index) => {
                    const actualRank = index + 4
                    return (
                      <div 
                        key={`player-${player.playerId}-${actualRank}`}
                        className="p-2.5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xs">{actualRank}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-gray-800 text-sm truncate mb-1">{player.playerName}</h5>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-600 mb-1.5">
                              <span className="font-semibold">{player.score.toFixed(1)}/100</span>
                              <span className="text-gray-300">•</span>
                              <span>{player.testCount} test{player.testCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {player.beepTest && (
                                <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  {player.beepTest}
                                </span>
                              )}
                              {player.sprint10m && (
                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  {player.sprint10m}s
                                </span>
                              )}
                              {player.pushUps && (
                                <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  {player.pushUps}
                                </span>
                              )}
                              {player.sitUps && (
                                <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  {player.sitUps}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
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

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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
                    className="btn btn-secondary flex-1 text-sm md:text-base"
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
                      className="btn btn-danger inline-flex items-center justify-center gap-2 text-sm md:text-base"
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn-purple flex-1 inline-flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    <TrendingUp size={18} />
                    {editingTest ? "Update Test" : "Save Test"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}

export default FitnessTests
