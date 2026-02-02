import { useState, useEffect } from "react"
import { Bell, Plus, Edit, Trash2, X, AlertCircle, Info, CheckCircle, Trophy } from "lucide-react"
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore"
import { db } from "../firebase/config"

function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
    priority: "normal",
    team: "All Teams"
  })

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "announcements"),
      (snapshot) => {
        const announcementsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        // Sort by timestamp, newest first
        announcementsData.sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0
          const timeB = b.timestamp?.seconds || 0
          return timeB - timeA
        })
        setAnnouncements(announcementsData)
      }
    )
    return () => unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.title && formData.message) {
      const dataToSave = {
        ...formData,
        timestamp: serverTimestamp()
      }

      if (editingAnnouncement) {
        await updateDoc(doc(db, "announcements", editingAnnouncement.id), formData)
      } else {
        await addDoc(collection(db, "announcements"), dataToSave)
      }

      setShowModal(false)
      setEditingAnnouncement(null)
      setFormData({
        title: "",
        message: "",
        type: "info",
        priority: "normal",
        team: "All Teams"
      })
    }
  }

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      team: announcement.team
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Delete this announcement?")) {
      await deleteDoc(doc(db, "announcements", id))
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case "urgent":
        return <AlertCircle size={24} />
      case "success":
        return <CheckCircle size={24} />
      case "match":
        return <Trophy size={24} />
      default:
        return <Info size={24} />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case "urgent":
        return "from-red-500 to-red-600"
      case "success":
        return "from-green-500 to-green-600"
      case "match":
        return "from-blue-500 to-blue-600"
      default:
        return "from-gray-500 to-gray-600"
    }
  }

  const getBorderColor = (type) => {
    switch (type) {
      case "urgent":
        return "border-red-300 bg-red-50"
      case "success":
        return "border-green-300 bg-green-50"
      case "match":
        return "border-blue-300 bg-blue-50"
      default:
        return "border-gray-300 bg-gray-50"
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Just now"
    const date = timestamp.toDate()
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const urgentAnnouncements = announcements.filter(a => a.priority === "high")
  const normalAnnouncements = announcements.filter(a => a.priority === "normal")

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 h-screen overflow-auto">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
                Announcements
              </h1>
              <p className="text-sm md:text-base text-gray-600 hidden md:block">Team updates and news</p>
            </div>
            <button
              onClick={() => {
                setEditingAnnouncement(null)
                setFormData({
                  title: "",
                  message: "",
                  type: "info",
                  priority: "normal",
                  team: "All Teams"
                })
                setShowModal(true)
              }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-indigo-700 transition-all w-full md:w-auto"
            >
              <Plus size={20} />
              New Announcement
            </button>
          </div>
        </div>

        {announcements.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
            <Bell className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Announcements Yet</h3>
            <p className="text-gray-500 mb-6">Create your first team announcement to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-indigo-700 transition-all"
            >
              Create Announcement
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Urgent Announcements */}
            {urgentAnnouncements.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Urgent
                </h2>
                <div className="space-y-4">
                  {urgentAnnouncements.map(announcement => (
                    <div
                      key={announcement.id}
                      className={`rounded-2xl border-2 ${getBorderColor(announcement.type)} shadow-lg overflow-hidden transition-all hover:shadow-xl`}
                    >
                      <div className={`bg-gradient-to-r ${getTypeColor(announcement.type)} p-4 text-white flex items-center justify-between`}>
                        <div className="flex items-center gap-3 flex-1">
                          {getTypeIcon(announcement.type)}
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{announcement.title}</h3>
                            <p className="text-xs text-white/80 mt-1">{announcement.team}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(announcement)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-700 whitespace-pre-wrap">{announcement.message}</p>
                        <p className="text-xs text-gray-500 mt-3">
                          {formatTimestamp(announcement.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Normal Announcements */}
            {normalAnnouncements.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-700 mb-3">Recent Updates</h2>
                <div className="space-y-4">
                  {normalAnnouncements.map(announcement => (
                    <div
                      key={announcement.id}
                      className={`rounded-2xl border-2 ${getBorderColor(announcement.type)} shadow-lg overflow-hidden transition-all hover:shadow-xl`}
                    >
                      <div className={`bg-gradient-to-r ${getTypeColor(announcement.type)} p-4 text-white flex items-center justify-between`}>
                        <div className="flex items-center gap-3 flex-1">
                          {getTypeIcon(announcement.type)}
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{announcement.title}</h3>
                            <p className="text-xs text-white/80 mt-1">{announcement.team}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(announcement)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-700 whitespace-pre-wrap">{announcement.message}</p>
                        <p className="text-xs text-gray-500 mt-3">
                          {formatTimestamp(announcement.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 md:p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {editingAnnouncement ? "Edit Announcement" : "New Announcement"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} className="text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                  placeholder="e.g., Training Session Tomorrow"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                  >
                    <option value="info">Info</option>
                    <option value="match">Match</option>
                    <option value="success">Success</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Team</label>
                  <select
                    value={formData.team}
                    onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                  >
                    <option>All Teams</option>
                    <option>First Team</option>
                    <option>Reserve Team</option>
                    <option>Others</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                  rows="6"
                  placeholder="Enter the announcement details..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-3 rounded-xl font-bold hover:from-indigo-600 hover:to-indigo-700 transition-all"
                >
                  {editingAnnouncement ? "Update" : "Post Announcement"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
  )
}

export default Announcements
