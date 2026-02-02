import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, GripVertical } from "lucide-react"
import { BarChart3, TrendingUp, Star, Heart, CalendarDays, Bell, LineChart } from "lucide-react"

export default function NavSettings() {
  const navigate = useNavigate()
  
  // Available navigation items (Home and Fixtures are fixed)
  const availableItems = [
    { id: "stats", label: "Stats", icon: BarChart3, path: "/player-stats" },
    { id: "fitness", label: "Fitness", icon: TrendingUp, path: "/fitness" },
    { id: "reviews", label: "My Reviews", icon: Star, path: "/reviews" },
    { id: "availability", label: "Availability", icon: Heart, path: "/injuries" },
    { id: "calendar", label: "Calendar", icon: CalendarDays, path: "/calendar" },
    { id: "announcements", label: "Announcements", icon: Bell, path: "/announcements" },
    { id: "charts", label: "My Progress", icon: LineChart, path: "/performance-charts" }
  ]

  // Load saved preferences or use defaults
  const [selectedMain, setSelectedMain] = useState(() => {
    const saved = localStorage.getItem("playerNavMain")
    return saved ? JSON.parse(saved) : ["stats", "fitness"]
  })

  const [selectedMore, setSelectedMore] = useState(() => {
    const saved = localStorage.getItem("playerNavMore")
    return saved ? JSON.parse(saved) : ["reviews", "availability", "calendar", "announcements", "charts"]
  })

  const handleToggle = (itemId) => {
    if (selectedMain.includes(itemId)) {
      // Move from main to more
      setSelectedMain(selectedMain.filter(id => id !== itemId))
      setSelectedMore([...selectedMore, itemId])
    } else if (selectedMore.includes(itemId)) {
      // Move from more to main (max 2 in main)
      if (selectedMain.length < 2) {
        setSelectedMore(selectedMore.filter(id => id !== itemId))
        setSelectedMain([...selectedMain, itemId])
      }
    }
  }

  const handleSave = () => {
    localStorage.setItem("playerNavMain", JSON.stringify(selectedMain))
    localStorage.setItem("playerNavMore", JSON.stringify(selectedMore))
    navigate("/dashboard")
  }

  const getItem = (id) => availableItems.find(item => item.id === id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Customize Navigation</h1>
              <p className="text-sm text-gray-500">Home and Fixtures are always shown</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Main Navigation Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Main Navigation</h2>
              <p className="text-sm text-gray-500">Choose up to 2 items for quick access</p>
            </div>
            <span className="text-sm font-semibold text-primary">{selectedMain.length}/2</span>
          </div>

          <div className="space-y-2">
            {selectedMain.map((itemId) => {
              const item = getItem(itemId)
              if (!item) return null
              const Icon = item.icon
              return (
                <div
                  key={itemId}
                  className="flex items-center gap-3 p-3 bg-primary/5 border-2 border-primary/20 rounded-xl"
                >
                  <GripVertical size={20} className="text-gray-400" />
                  <Icon size={20} className="text-primary" />
                  <span className="flex-1 font-medium text-gray-800">{item.label}</span>
                  <button
                    onClick={() => handleToggle(itemId)}
                    className="px-3 py-1.5 text-sm font-medium text-primary bg-white border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    Move to More
                  </button>
                </div>
              )
            })}
          </div>

          {selectedMain.length < 2 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                You can add {2 - selectedMain.length} more {selectedMain.length === 1 ? 'item' : 'items'} to the main navigation
              </p>
            </div>
          )}
        </div>

        {/* More Menu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800">More Menu</h2>
            <p className="text-sm text-gray-500">Additional pages in the More menu</p>
          </div>

          <div className="space-y-2">
            {selectedMore.map((itemId) => {
              const item = getItem(itemId)
              if (!item) return null
              const Icon = item.icon
              return (
                <div
                  key={itemId}
                  className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl"
                >
                  <Icon size={20} className="text-gray-600" />
                  <span className="flex-1 font-medium text-gray-700">{item.label}</span>
                  <button
                    onClick={() => handleToggle(itemId)}
                    disabled={selectedMain.length >= 2}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      selectedMain.length >= 2
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                        : 'text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {selectedMain.length >= 2 ? 'Main Full' : 'Move to Main'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
        >
          Save Navigation Settings
        </button>
      </div>
    </div>
  )
}
