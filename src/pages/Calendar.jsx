import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, CalendarDays, Clock, X, MapPin, Dumbbell, Trophy } from "lucide-react"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { db } from "../firebase/config"
import { useApp } from "../contexts/AppContext"

function Calendar() {
  const { fixtures } = useApp()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [sessions, setSessions] = useState([])

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

  // Get sessions for a specific day
  const getScheduleForDay = (day) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString()
      .split('T')[0]
    
    const firestoreSessions = sessions
      .filter(session => session.date === dateStr)
      .map(session => ({
        id: session.id,
        type: session.type || "Training",
        title: `${session.type || "Training"} Session`,
        time: "18:30 - 20:00",
        location: "Main Field",
        description: session.notes || "Team training session",
        icon: Dumbbell,
        color: "blue",
        sessionData: session
      }))

    // Add fixtures for the day
    const dayFixtures = fixtures
      .filter(fixture => fixture.date === dateStr)
      .map(fixture => ({
        id: fixture.id,
        type: "Match",
        title: `${fixture.homeAway} vs ${fixture.opponent}`,
        time: fixture.time || "TBC",
        location: fixture.venue || (fixture.homeAway === "Home" ? "Home Ground" : "Away"),
        description: `${fixture.competition || "Friendly"} - ${fixture.team}`,
        icon: Trophy,
        color: fixture.status === "Completed" ? "gray" : "red",
        fixtureData: fixture
      }))

    const allEvents = [...firestoreSessions, ...dayFixtures]

    // If there are events, return them
    if (allEvents.length > 0) {
      return allEvents
    }

    // Otherwise, generate fake data for training days (Tue, Wed, Thu)
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const dayOfWeek = date.getDay()
    
    // Tuesday = 2, Wednesday = 3, Thursday = 4
    if (dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4) {
      const trainingTypes = [
        {
          type: "Skills Training",
          time: "18:30 - 20:00",
          location: "Main Field",
          description: "Focus on passing accuracy, ball control, and positioning drills",
          color: "blue"
        },
        {
          type: "Tactical Session",
          time: "18:30 - 20:00",
          location: "Main Field",
          description: "Team formations, set pieces, and game strategy analysis",
          color: "indigo"
        },
        {
          type: "Fitness Training",
          time: "18:30 - 20:00",
          location: "Training Ground",
          description: "Conditioning work, sprint drills, and endurance building",
          color: "teal"
        }
      ]

      // Use day of week to determine training type
      const trainingIndex = dayOfWeek === 2 ? 0 : dayOfWeek === 3 ? 1 : 2
      const training = trainingTypes[trainingIndex]

      return [{
        id: `fake-${dateStr}`,
        type: training.type,
        title: training.type,
        time: training.time,
        location: training.location,
        description: training.description,
        icon: Dumbbell,
        color: training.color
      }]
    }

    return []
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  const isPracticeDay = (dayOfWeek) => {
    // Tuesday = 2, Wednesday = 3, Thursday = 4
    return dayOfWeek === 2 || dayOfWeek === 3 || dayOfWeek === 4
  }

  const getDayOfWeek = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return date.getDay()
  }

  const handleDayClick = (day) => {
    const dayOfWeek = getDayOfWeek(day)
    const events = getScheduleForDay(day)
    setSelectedDay({
      day,
      dayOfWeek,
      events,
      date: new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const isToday = (day) => {
    const today = new Date()
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear()
  }

  const hasEvents = (day) => {
    const events = getScheduleForDay(day)
    return events.length > 0
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i)

  const getEventColor = (color) => {
    const colors = {
      blue: "bg-blue-100 text-blue-700 border-blue-300",
      green: "bg-green-100 text-green-700 border-green-300",
      orange: "bg-orange-100 text-orange-700 border-orange-300",
      purple: "bg-purple-100 text-purple-700 border-purple-300",
      indigo: "bg-indigo-100 text-indigo-700 border-indigo-300",
      teal: "bg-teal-100 text-teal-700 border-teal-300"
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 via-white to-blue-50 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-black bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
            Training Calendar
          </h1>
          <p className="text-gray-600">View and manage your team's schedule</p>
        </div>

        <div>
          {/* Calendar */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col h-full overflow-hidden">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={previousMonth}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 hover:text-white transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-600 hover:text-white transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center font-bold text-gray-600 text-sm py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2 flex-1 overflow-y-auto">
              {emptyDays.map(day => (
                <div key={`empty-${day}`} className="aspect-square"></div>
              ))}
              
              {days.map(day => {
                const dayOfWeek = getDayOfWeek(day)
                const dayHasEvents = hasEvents(day)
                const today = isToday(day)
                const events = getScheduleForDay(day)

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`aspect-square p-2 rounded-xl border-2 transition-all cursor-pointer hover:scale-105 ${
                      today
                        ? "border-blue-500 bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold shadow-lg"
                        : dayHasEvents
                        ? "border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300"
                        : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <span className={`text-sm font-semibold ${today ? "text-white" : "text-gray-700"}`}>
                        {day}
                      </span>
                      {events.length > 0 && (
                        <div className="mt-auto flex flex-col gap-0.5">
                          {events.slice(0, 2).map((event, idx) => (
                            <div 
                              key={idx}
                              className={`text-[10px] font-semibold truncate ${
                                today ? "text-white/90" : "text-blue-600"
                              }`}
                            >
                              {event.time.split(' - ')[0]}
                            </div>
                          ))}
                          {events.length > 2 && (
                            <div className={`text-[10px] font-semibold ${today ? "text-white/90" : "text-blue-600"}`}>
                              +{events.length - 2}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Day Details Modal */}
        {selectedDay && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold">
                    {dayNames[selectedDay.dayOfWeek]}, {selectedDay.day}
                  </h3>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="text-white/90">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </p>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {selectedDay.events.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500 font-medium">No training scheduled</p>
                    <p className="text-gray-400 text-sm mt-1">This is a rest day</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDay.events.map(event => {
                      const Icon = event.icon
                      return (
                        <div 
                          key={event.id}
                          className={`border-2 rounded-xl p-4 ${getEventColor(event.color)}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="bg-white/80 p-2 rounded-lg">
                              <Icon size={20} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-lg mb-1">{event.title}</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Clock size={14} />
                                  <span className="font-semibold">{event.time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin size={14} />
                                  <span>{event.location}</span>
                                </div>
                                <p className="mt-2 text-sm opacity-90">
                                  {event.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Calendar
