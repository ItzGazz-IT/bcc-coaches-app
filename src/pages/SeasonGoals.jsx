import { useState, useEffect } from "react"
import { Trophy, Target, TrendingUp, Award, Plus, Edit, Trash2, CheckCircle, X } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore"
import { db } from "../firebase/config"

function SeasonGoals() {
  const { fixtures } = useApp()
  const [goals, setGoals] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [formData, setFormData] = useState({
    title: "",
    category: "League",
    target: "",
    current: 0,
    team: "First Team",
    description: ""
  })

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "seasonGoals"), (snapshot) => {
      const goalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setGoals(goalsData)
    })
    return () => unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.title && formData.target) {
      if (editingGoal) {
        await updateDoc(doc(db, "seasonGoals", editingGoal.id), formData)
      } else {
        await addDoc(collection(db, "seasonGoals"), formData)
      }
      setShowModal(false)
      setEditingGoal(null)
      setFormData({
        title: "",
        category: "League",
        target: "",
        current: 0,
        team: "First Team",
        description: ""
      })
    }
  }

  const handleEdit = (goal) => {
    setEditingGoal(goal)
    setFormData({
      title: goal.title,
      category: goal.category,
      target: goal.target,
      current: goal.current,
      team: goal.team,
      description: goal.description || ""
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Delete this goal?")) {
      await deleteDoc(doc(db, "seasonGoals", id))
    }
  }

  const calculateProgress = (current, target) => {
    const percentage = (parseInt(current) / parseInt(target)) * 100
    return Math.min(percentage, 100)
  }

  // Calculate team stats from fixtures
  const teamStats = {
    "First Team": {
      matches: fixtures.filter(f => f.team === "First Team" && f.status === "Completed").length,
      wins: fixtures.filter(f => f.team === "First Team" && f.result === "Win").length,
      goals: fixtures
        .filter(f => f.team === "First Team" && f.scorers)
        .reduce((sum, f) => sum + (f.scorers?.filter(s => s.team === "First Team").length || 0), 0)
    },
    "Reserve Team": {
      matches: fixtures.filter(f => f.team === "Reserve Team" && f.status === "Completed").length,
      wins: fixtures.filter(f => f.team === "Reserve Team" && f.result === "Win").length,
      goals: fixtures
        .filter(f => f.team === "Reserve Team" && f.scorers)
        .reduce((sum, f) => sum + (f.scorers?.filter(s => s.team === "Reserve Team").length || 0), 0)
    },
    "Others": {
      matches: fixtures.filter(f => f.team === "Others" && f.status === "Completed").length,
      wins: fixtures.filter(f => f.team === "Others" && f.result === "Win").length,
      goals: fixtures
        .filter(f => f.team === "Others" && f.scorers)
        .reduce((sum, f) => sum + (f.scorers?.filter(s => s.team === "Others").length || 0), 0)
    }
  }

  const groupedGoals = {
    "League": goals.filter(g => g.category === "League"),
    "Cup": goals.filter(g => g.category === "Cup"),
    "Performance": goals.filter(g => g.category === "Performance"),
    "Development": goals.filter(g => g.category === "Development")
  }

  return (
    <div className="min-h-screen overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6">
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
                Season Goals
              </h1>
              <p className="text-sm md:text-base text-gray-600 hidden md:block">Track team objectives and progress</p>
            </div>
            <button
              onClick={() => {
                setEditingGoal(null)
                setFormData({
                  title: "",
                  category: "League",
                  target: "",
                  current: 0,
                  team: "First Team",
                  description: ""
                })
                setShowModal(true)
              }}
              className="btn btn-purple flex items-center gap-2 text-sm flex-shrink-0"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Goal</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Team Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {["First Team", "Reserve Team", "Others"].map(team => (
            <div key={team} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">{team}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Matches Played</span>
                  <span className="text-xl font-black text-blue-600">{teamStats[team].matches}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Wins</span>
                  <span className="text-xl font-black text-green-600">{teamStats[team].wins}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Win Rate</span>
                  <span className="text-xl font-black text-purple-600">
                    {teamStats[team].matches > 0 
                      ? Math.round((teamStats[team].wins / teamStats[team].matches) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Goals Scored</span>
                  <span className="text-xl font-black text-orange-600">{teamStats[team].goals}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Goals by Category */}
        {Object.entries(groupedGoals).map(([category, categoryGoals]) => (
          <div key={category} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${
                category === "League" ? "bg-blue-100" :
                category === "Cup" ? "bg-green-100" :
                category === "Performance" ? "bg-purple-100" :
                "bg-orange-100"
              }`}>
                {category === "League" ? <Trophy className="text-blue-600" size={24} /> :
                 category === "Cup" ? <Award className="text-green-600" size={24} /> :
                 category === "Performance" ? <TrendingUp className="text-purple-600" size={24} /> :
                 <Target className="text-orange-600" size={24} />}
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{category} Objectives</h2>
            </div>

            {categoryGoals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categoryGoals.map(goal => {
                  const progress = calculateProgress(goal.current, goal.target)
                  const isComplete = progress >= 100
                  
                  return (
                    <div key={goal.id} className={`bg-white rounded-2xl shadow-xl border-2 p-6 transition-all ${
                      isComplete ? 'border-green-500 bg-green-50' : 'border-gray-100'
                    }`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-800">{goal.title}</h3>
                            {isComplete && <CheckCircle className="text-green-500" size={20} />}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{goal.team}</p>
                          {goal.description && (
                            <p className="text-sm text-gray-500 italic">{goal.description}</p>
                          )}
                        </div>
                        {(userRole === "coach" || userRole === "super-admin") && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(goal)}
                              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                              <Edit size={16} className="text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDelete(goal.id)}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">Progress</span>
                          <span className="text-sm font-bold text-gray-800">
                            {goal.current} / {goal.target}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isComplete ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <span className={`text-2xl font-black ${
                          isComplete ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {Math.round(progress)}%
                        </span>
                        {!isComplete && (
                          <button
                            onClick={() => {
                              updateDoc(doc(db, "seasonGoals", goal.id), {
                                current: Math.min(parseInt(goal.current) + 1, parseInt(goal.target))
                              })
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                          >
                            + Update
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                <Target className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">No {category.toLowerCase()} objectives set yet</p>
              </div>
            )}
          </div>
        ))}

        {/* Overall Progress Summary */}
        {goals.length > 0 && (
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl shadow-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-6">Overall Season Progress</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl font-black mb-2">{goals.length}</div>
                <div className="text-purple-100 text-sm">Total Goals</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black mb-2">
                  {goals.filter(g => calculateProgress(g.current, g.target) >= 100).length}
                </div>
                <div className="text-purple-100 text-sm">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black mb-2">
                  {goals.filter(g => {
                    const p = calculateProgress(g.current, g.target)
                    return p > 0 && p < 100
                  }).length}
                </div>
                <div className="text-purple-100 text-sm">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black mb-2">
                  {Math.round(goals.reduce((sum, g) => sum + calculateProgress(g.current, g.target), 0) / goals.length)}%
                </div>
                <div className="text-purple-100 text-sm">Average Progress</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                {editingGoal ? "Edit Goal" : "Add New Goal"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} className="text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Goal Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
                  placeholder="e.g., Finish in top 3 of the league"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
                  >
                    <option>League</option>
                    <option>Cup</option>
                    <option>Performance</option>
                    <option>Development</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Team</label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
                  >
                    <option>First Team</option>
                    <option>Reserve Team</option>
                    <option>Others</option>
                    <option>All Teams</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Target</label>
                  <input
                    type="number"
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
                    placeholder="e.g., 15 (wins)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Current Progress</label>
                  <input
                    type="number"
                    value={formData.current}
                    onChange={(e) => setFormData({ ...formData, current: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
                  rows="3"
                  placeholder="Additional details about this goal..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="btn btn-purple flex-1 text-sm md:text-base"
                >
                  {editingGoal ? "Update Goal" : "Add Goal"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary text-sm md:text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SeasonGoals
