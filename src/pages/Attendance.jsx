import { useState, useEffect } from "react"
import { Calendar, Users, CheckCircle, XCircle, Clock, Plus, X, ChevronDown, ChevronUp, Trash2 } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore"
import { db } from "../firebase/config"

function Attendance() {
  const { players, userRole } = useApp()
  const [sessions, setSessions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [expandedSession, setExpandedSession] = useState(null)
  const [newSession, setNewSession] = useState({
    date: new Date().toISOString().split('T')[0],
    time: "18:00",
    type: "Training",
    notes: ""
  })
  const [attendance, setAttendance] = useState({})
  const [showSuccess, setShowSuccess] = useState(false)

  // Load sessions from Firestore
  useEffect(() => {
    const q = query(collection(db, "sessions"), orderBy("date", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setSessions(sessionsData)
    })
    return () => unsubscribe()
  }, [])

  const createSession = async () => {
    if (!newSession.date) return

    // Initialize attendance for all players
    const initialAttendance = {}
    players.forEach(player => {
      initialAttendance[player.id] = "absent"
    })

    try {
      await addDoc(collection(db, "sessions"), {
        ...newSession,
        attendance: initialAttendance,
        createdAt: new Date().toISOString()
      })

      setNewSession({
        date: new Date().toISOString().split('T')[0],
        time: "18:00",
        type: "Training",
        notes: ""
      })
      setShowModal(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error("Error creating session:", error)
    }
  }

  const getAttendanceStatus = (sessionTime) => {
    // sessionTime format: "HH:mm"
    const [sessionHour, sessionMinute] = sessionTime.split(':').map(Number)
    const sessionStartMinutes = sessionHour * 60 + sessionMinute
    const onTimeEndMinutes = sessionStartMinutes + 45 // 18:00 + 45 mins = 18:45

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentMinutes = currentHour * 60 + currentMinute

    if (currentMinutes <= onTimeEndMinutes) {
      return "on-time"
    } else {
      return "late"
    }
  }

  const getDefaultTimeForDate = (dateString) => {
    // Check if date is Tuesday (2), Wednesday (3), or Thursday (4)
    const date = new Date(dateString)
    const dayOfWeek = date.getDay()
    
    // Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6
    if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) {
      return "18:00"
    }
    return "18:00" // Default to 18:00 anyway
  }

  const toggleAttendance = async (sessionId, playerId, currentStatus) => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return

    let newStatus
    if (currentStatus === "absent") {
      // Mark as present - determine if on-time or late
      newStatus = getAttendanceStatus(session.time)
    } else {
      // Toggle between on-time and late if already marked, or go back to absent
      newStatus = "absent"
    }

    const updatedAttendance = {
      ...session.attendance,
      [playerId]: {
        status: newStatus,
        timestamp: new Date().toISOString()
      }
    }

    try {
      const { updateDoc, doc } = await import("firebase/firestore")
      await updateDoc(doc(db, "sessions", sessionId), {
        attendance: updatedAttendance
      })
    } catch (error) {
      console.error("Error updating attendance:", error)
    }
  }

  const deleteSession = async (sessionId) => {
    if (window.confirm("Are you sure you want to delete this session?")) {
      try {
        await deleteDoc(doc(db, "sessions", sessionId))
      } catch (error) {
        console.error("Error deleting session:", error)
      }
    }
  }

  const getAttendanceStats = (session) => {
    if (!session.attendance) return { present: 0, late: 0, absent: 0, total: 0 }
    
    const attendanceValues = Object.values(session.attendance)
    const onTime = attendanceValues.filter(att => {
      const status = typeof att === 'object' ? att.status : att
      return status === "on-time"
    }).length
    const late = attendanceValues.filter(att => {
      const status = typeof att === 'object' ? att.status : att
      return status === "late"
    }).length
    const absent = attendanceValues.filter(att => {
      const status = typeof att === 'object' ? att.status : att
      return status === "absent"
    }).length
    const present = onTime + late
    
    return {
      onTime,
      late,
      absent,
      present,
      total: attendanceValues.length,
      percentage: attendanceValues.length > 0 ? Math.round((present / attendanceValues.length) * 100) : 0
    }
  }

  const getPlayerAttendanceHistory = (playerId) => {
    let onTime = 0
    let late = 0
    let total = 0

    sessions.forEach(session => {
      if (session.attendance && session.attendance[playerId]) {
        const att = session.attendance[playerId]
        const status = typeof att === 'object' ? att.status : att
        
        if (status !== "absent") {
          total++
          if (status === "on-time") {
            onTime++
          } else if (status === "late") {
            late++
          }
        } else {
          total++
        }
      }
    })

    const present = onTime + late
    return {
      onTime,
      late,
      present,
      total,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0
    }
  }

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6">
          <div className="flex items-start md:items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
                Attendance
              </h1>
              <p className="text-sm md:text-base text-gray-600 hidden md:block">Track training sessions</p>
            </div>
            {(userRole === "coach" || userRole === "super-admin") && (
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary inline-flex items-center gap-2 text-sm flex-shrink-0"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">New Session</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
        </div>

        {showSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="text-green-600" size={24} />
            <p className="font-semibold text-green-800">Session created successfully!</p>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 rounded-xl">
                <Calendar className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Total Sessions</p>
                <p className="text-2xl font-black text-blue-600">{sessions.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-2.5 rounded-xl">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Active Players</p>
                <p className="text-2xl font-black text-green-600">{players.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-2.5 rounded-xl">
                <CheckCircle className="text-white" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Avg Attendance</p>
                <p className="text-2xl font-black text-purple-600">
                  {sessions.length > 0
                    ? Math.round(
                        sessions.reduce((sum, s) => sum + getAttendanceStats(s).percentage, 0) / sessions.length
                      )
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">Training Sessions</h2>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500 font-medium">No sessions yet</p>
                <p className="text-gray-400 text-sm mt-1">Create your first training session to start tracking attendance</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(session => {
                  const stats = getAttendanceStats(session)
                  const isExpanded = expandedSession === session.id

                  return (
                    <div key={session.id} className="border-2 border-gray-100 rounded-xl overflow-hidden">
                      <div 
                        onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-gray-800 text-lg">
                                {new Date(session.date).toLocaleDateString('en-GB', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </h3>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                {session.type}
                              </span>
                            </div>
                            {session.notes && (
                              <p className="text-sm text-gray-500">{session.notes}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {(userRole === "coach" || userRole === "super-admin") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteSession(session.id)
                                }}
                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all hover:scale-110"
                                title="Delete session"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                            <div className="text-right mr-4">
                              <div className="text-2xl font-black text-green-600">{stats.percentage}%</div>
                              <div className="text-xs text-gray-500">
                                {stats.onTime} on-time, {stats.late} late
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 p-4 bg-gray-50">
                          <h4 className="font-bold text-gray-700 mb-3">Player Attendance</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {players.map(player => {
                              const att = session.attendance?.[player.id]
                              const status = typeof att === 'object' ? att?.status : att
                              const timestamp = typeof att === 'object' ? att?.timestamp : null
                              const playerStats = getPlayerAttendanceHistory(player.id)

                              const getStatusStyles = (status) => {
                                switch(status) {
                                  case "on-time":
                                    return "border-green-300 bg-green-50 hover:bg-green-100"
                                  case "late":
                                    return "border-yellow-300 bg-yellow-50 hover:bg-yellow-100"
                                  default:
                                    return "border-gray-200 bg-white hover:bg-gray-50"
                                }
                              }

                              const getStatusIcon = (status) => {
                                switch(status) {
                                  case "on-time":
                                    return <CheckCircle className="text-green-600" size={18} />
                                  case "late":
                                    return <Clock className="text-yellow-600" size={18} />
                                  default:
                                    return <XCircle className="text-gray-400" size={18} />
                                }
                              }

                              const getStatusLabel = (status) => {
                                switch(status) {
                                  case "on-time":
                                    return "On-Time"
                                  case "late":
                                    return "Late"
                                  default:
                                    return "Absent"
                                }
                              }

                              return (
                                <button
                                  key={player.id}
                                  onClick={() => toggleAttendance(session.id, player.id, status)}
                                  className={`p-3 rounded-lg border-2 transition-all text-left ${getStatusStyles(status)}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(status)}
                                      <div>
                                        <span className="font-semibold text-gray-800 block">
                                          {player.firstName} {player.lastName}
                                        </span>
                                        {timestamp && (
                                          <span className="text-xs text-gray-500">
                                            {new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-semibold block" style={{
                                        color: status === "on-time" ? "#16a34a" : status === "late" ? "#ca8a04" : "#6b7280"
                                      }}>
                                        {getStatusLabel(status)}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {playerStats.percentage}% overall
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Create Session Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl">
                    <Plus className="text-white" size={22} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">New Training Session</h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newSession.date}
                    onChange={(e) => {
                      const selectedDate = e.target.value
                      const defaultTime = getDefaultTimeForDate(selectedDate)
                      setNewSession({...newSession, date: selectedDate, time: defaultTime})
                    }}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                    style={{ colorScheme: 'light' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Session Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={newSession.time}
                    onChange={(e) => setNewSession({...newSession, time: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="block">Players marked on-time from this time until 45 minutes later</span>
                    <span className="block mt-1 font-semibold">✓ Auto-set to 18:00 on Tue/Wed/Thu</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Session Type *
                  </label>
                  <select
                    value={newSession.type}
                    onChange={(e) => setNewSession({...newSession, type: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                  >
                    <option value="Training">Training</option>
                    <option value="Match">Match</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={newSession.notes}
                    onChange={(e) => setNewSession({...newSession, notes: e.target.value})}
                    placeholder="Session notes or details..."
                    rows={3}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
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
                    onClick={createSession}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 inline-flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Create Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Attendance
