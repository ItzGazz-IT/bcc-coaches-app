import { useState, useEffect } from "react"
import { Calendar, CheckCircle, Clock, XCircle, Save, AlertCircle } from "lucide-react"
import { useApp } from "../contexts/AppContext"
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase/config"

function AttendanceAdmin() {
  const { players, userRole } = useApp()
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [attendance, setAttendance] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })

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

  // Load attendance for selected session
  useEffect(() => {
    if (selectedSession) {
      const session = sessions.find(s => s.id === selectedSession)
      if (session && session.attendance) {
        setAttendance(session.attendance)
      } else {
        setAttendance({})
      }
    }
  }, [selectedSession, sessions])

  const handleAttendanceChange = (playerId, status) => {
    setAttendance(prev => ({
      ...prev,
      [playerId]: {
        status: status,
        timestamp: new Date().toISOString()
      }
    }))
  }

  const markAllAs = async (status) => {
    const updated = {}
    players.forEach(player => {
      updated[player.id] = {
        status: status,
        timestamp: new Date().toISOString()
      }
    })
    setAttendance(updated)
    setMessage({ type: "info", text: `Marked all as ${status}. Click Save to confirm.` })
  }

  const saveAttendance = async () => {
    if (!selectedSession) {
      setMessage({ type: "error", text: "Please select a session first" })
      return
    }

    setSaving(true)
    try {
      const session = sessions.find(s => s.id === selectedSession)
      await updateDoc(doc(db, "sessions", selectedSession), {
        attendance: attendance
      })
      setMessage({ type: "success", text: `Attendance saved for ${session.date}` })
      setTimeout(() => setMessage({ type: "", text: "" }), 3000)
    } catch (error) {
      console.error("Error saving attendance:", error)
      setMessage({ type: "error", text: "Failed to save attendance" })
    } finally {
      setSaving(false)
    }
  }

  if (userRole !== "coach") {
    return (
      <div className="flex-1 p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-3" size={48} />
          <p className="text-gray-600 font-semibold">Coaches only</p>
        </div>
      </div>
    )
  }

  const selectedSessionData = sessions.find(s => s.id === selectedSession)

  return (
    <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            Attendance Admin
          </h1>
          <p className="text-gray-600">Manage player attendance for sessions</p>
        </div>

        {message.text && (
          <div className={`mb-4 p-4 rounded-xl border ${
            message.type === "success" 
              ? "bg-green-50 border-green-200 text-green-800"
              : message.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}>
            {message.text}
          </div>
        )}

        {/* Session Selector */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
          <label className="block text-sm font-bold text-gray-700 mb-3">Select Session</label>
          <select
            value={selectedSession || ""}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
          >
            <option value="">-- Choose a session --</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {new Date(session.date).toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} - {session.type}
              </option>
            ))}
          </select>
        </div>

        {selectedSessionData && (
          <>
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
              <p className="text-sm font-bold text-gray-700 mb-3">Quick Actions</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => markAllAs("on-time")}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg font-semibold transition-all text-sm"
                >
                  <CheckCircle size={16} className="inline mr-2" />
                  All On-Time
                </button>
                <button
                  onClick={() => markAllAs("late")}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg font-semibold transition-all text-sm"
                >
                  <Clock size={16} className="inline mr-2" />
                  All Late
                </button>
                <button
                  onClick={() => markAllAs("absent")}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg font-semibold transition-all text-sm"
                >
                  <XCircle size={16} className="inline mr-2" />
                  All Absent
                </button>
              </div>
            </div>

            {/* Player Attendance Grid */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <p className="text-sm font-bold text-gray-700 mb-4">Individual Attendance</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {players.map(player => {
                  const att = attendance[player.id]
                  const status = att?.status || "absent"

                  const getStyles = (status) => {
                    switch(status) {
                      case "on-time":
                        return "border-green-300 bg-green-50"
                      case "late":
                        return "border-yellow-300 bg-yellow-50"
                      default:
                        return "border-gray-200 bg-white"
                    }
                  }

                  const getIcon = (status) => {
                    switch(status) {
                      case "on-time":
                        return <CheckCircle className="text-green-600" size={18} />
                      case "late":
                        return <Clock className="text-yellow-600" size={18} />
                      default:
                        return <XCircle className="text-gray-400" size={18} />
                    }
                  }

                  return (
                    <div key={player.id} className={`border-2 rounded-lg p-3 ${getStyles(status)}`}>
                      <div className="flex items-start gap-2 mb-2">
                        {getIcon(status)}
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{status}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAttendanceChange(player.id, "on-time")}
                          className="flex-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-semibold transition-all"
                          title="Mark on-time"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(player.id, "late")}
                          className="flex-1 px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-semibold transition-all"
                          title="Mark late"
                        >
                          🕐
                        </button>
                        <button
                          onClick={() => handleAttendanceChange(player.id, "absent")}
                          className="flex-1 px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs font-semibold transition-all"
                          title="Mark absent"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Save Button */}
              <button
                onClick={saveAttendance}
                disabled={saving}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {saving ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          </>
        )}

        {!selectedSession && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <Calendar className="mx-auto text-blue-600 mb-3" size={40} />
            <p className="text-blue-800 font-semibold">Select a session to manage attendance</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AttendanceAdmin
