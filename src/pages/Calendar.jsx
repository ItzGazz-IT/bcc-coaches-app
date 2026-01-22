import { useState } from "react"
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from "lucide-react"

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())

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

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: startingDayOfWeek }, (_, i) => i)

  return (
    <div className="flex-1 p-8 bg-bg">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Training Calendar</h1>
          <p className="text-gray-600">Tuesday, Wednesday & Thursday at 18:30</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={previousMonth}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-secondary hover:text-white transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-secondary hover:text-white transition-all"
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
            <div className="grid grid-cols-7 gap-2">
              {emptyDays.map(day => (
                <div key={`empty-${day}`} className="aspect-square"></div>
              ))}
              
              {days.map(day => {
                const dayOfWeek = getDayOfWeek(day)
                const hasPractice = isPracticeDay(dayOfWeek)
                const today = isToday(day)

                return (
                  <div
                    key={day}
                    className={`aspect-square p-2 rounded-xl border-2 transition-all ${
                      today
                        ? "border-secondary bg-secondary text-white font-bold"
                        : hasPractice
                        ? "border-accent bg-accent/10 hover:bg-accent/20"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <span className={`text-sm font-semibold ${today ? "text-white" : "text-gray-700"}`}>
                        {day}
                      </span>
                      {hasPractice && (
                        <div className="mt-auto">
                          <div className={`text-xs font-semibold ${today ? "text-white" : "text-secondary"}`}>
                            18:30
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Practice Info */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-secondary to-accent rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays size={24} />
                <h3 className="text-xl font-bold">Practice Schedule</h3>
              </div>
              
              <div className="space-y-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={18} />
                    <p className="font-semibold">Start Time</p>
                  </div>
                  <p className="text-2xl font-bold">18:30</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="font-semibold mb-2">Training Days</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      <span>Tuesday</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      <span>Wednesday</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                      <span>Thursday</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="font-bold text-primary mb-3">Legend</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 border-2 border-secondary bg-secondary rounded"></div>
                  <span className="text-gray-600">Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 border-2 border-accent bg-accent/10 rounded"></div>
                  <span className="text-gray-600">Practice Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 border-2 border-gray-100 rounded"></div>
                  <span className="text-gray-600">Regular Day</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Calendar
