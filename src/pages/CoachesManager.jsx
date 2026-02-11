import { useState } from "react"
import { Plus, Trash2, Edit, X, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { generatePassword } from "../utils/credentialUtils"

function CoachesManager() {
  const { coaches, addCoach, updateCoach, deleteCoach, userRole } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editingCoach, setEditingCoach] = useState(null)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [showPassword, setShowPassword] = useState({})
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: ""
  })

  // Only super-admin can access this page
  if (userRole !== "super-admin") {
    return (
      <div className="flex-1 p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={48} />
          <p className="text-gray-600 font-semibold">Super Admin only</p>
        </div>
      </div>
    )
  }

  const handleOpenModal = (coach = null) => {
    if (coach) {
      setEditingCoach(coach)
      setFormData({
        username: coach.username,
        password: coach.password,
        fullName: coach.fullName || "",
        email: coach.email || ""
      })
    } else {
      setEditingCoach(null)
      setFormData({
        username: "",
        password: generatePassword(10),
        fullName: "",
        email: ""
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.username || !formData.password) {
      setMessage({ type: "error", text: "Username and password are required" })
      return
    }

    try {
      if (editingCoach) {
        await updateCoach(editingCoach.id, {
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
          email: formData.email
        })
        setMessage({ type: "success", text: "Coach updated successfully" })
      } else {
        // Check if username already exists
        const exists = coaches.some(c => c.username === formData.username)
        if (exists) {
          setMessage({ type: "error", text: "Username already exists" })
          return
        }

        await addCoach({
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
          email: formData.email
        })
        setMessage({ type: "success", text: "Coach added successfully" })
      }

      setShowModal(false)
      setEditingCoach(null)
      setFormData({
        username: "",
        password: "",
        fullName: "",
        email: ""
      })
      setTimeout(() => setMessage({ type: "", text: "" }), 3000)
    } catch (error) {
      console.error("Error saving coach:", error)
      setMessage({ type: "error", text: "Failed to save coach" })
    }
  }

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Delete coach "${username}"? This cannot be undone.`)) {
      return
    }

    try {
      await deleteCoach(id)
      setMessage({ type: "success", text: "Coach deleted successfully" })
      setTimeout(() => setMessage({ type: "", text: "" }), 3000)
    } catch (error) {
      console.error("Error deleting coach:", error)
      setMessage({ type: "error", text: "Failed to delete coach" })
    }
  }

  const togglePasswordVisibility = (coachId) => {
    setShowPassword(prev => ({
      ...prev,
      [coachId]: !prev[coachId]
    }))
  }

  const isSuperAdmin = (coach) => coach.username === "Gareth"

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              Coaches Management
            </h1>
            <p className="text-gray-600">Add and manage coach accounts</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 w-fit"
          >
            <Plus size={20} />
            Add Coach
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-xl border flex items-center gap-3 ${
            message.type === "success" 
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            {message.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            {message.text}
          </div>
        )}

        {/* Coaches Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          {coaches.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 font-medium">No coaches added yet</p>
              <p className="text-gray-400 text-sm mt-1">Click "Add Coach" to create the first coach account</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Username</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Full Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Password</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {coaches.map(coach => (
                    <tr key={coach.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono text-blue-900">
                            {coach.username}
                          </code>
                          {isSuperAdmin(coach) && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                              Super Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{coach.fullName || "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{coach.email || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className={`px-2 py-1 rounded text-xs font-mono ${
                            showPassword[coach.id]
                              ? "bg-gray-100 text-gray-900"
                              : "bg-gray-100 text-gray-400"
                          }`}>
                            {showPassword[coach.id] 
                              ? coach.password 
                              : "•".repeat(coach.password.length)}
                          </code>
                          <button
                            onClick={() => togglePasswordVisibility(coach.id)}
                            className="p-1.5 hover:bg-gray-200 rounded transition-colors text-gray-600"
                            title="Toggle password visibility"
                          >
                            {showPassword[coach.id] ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!isSuperAdmin(coach) && (
                            <>
                              <button
                                onClick={() => handleOpenModal(coach)}
                                className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                                title="Edit coach"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(coach.id, coach.username)}
                                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                                title="Delete coach"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                          {isSuperAdmin(coach) && (
                            <button
                              onClick={() => handleOpenModal(coach)}
                              className="p-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
                              title="Edit super admin"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-600 uppercase font-bold">Total Coaches</p>
            <p className="text-2xl font-black text-blue-600">{coaches.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-600 uppercase font-bold">Super Admin</p>
            <p className="text-2xl font-black text-purple-600">
              {coaches.filter(c => c.username === "Gareth").length > 0 ? "✓ Active" : "✗ None"}
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Coach Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {editingCoach ? "Edit Coach" : "Add New Coach"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="coach.name"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  disabled={editingCoach && editingCoach.username === "Gareth"}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, password: generatePassword(10)})}
                    className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  placeholder="Coach's full name"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="coach@example.com"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                >
                  {editingCoach ? "Update Coach" : "Add Coach"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CoachesManager
