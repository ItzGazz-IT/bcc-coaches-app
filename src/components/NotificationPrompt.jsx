import { Bell, X } from "lucide-react"
import { useState, useEffect } from "react"

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const dismissed = sessionStorage.getItem('notification-prompt-dismissed')
    
    if ('Notification' in window && Notification.permission === 'default' && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleEnable = async () => {
    const permission = await Notification.requestPermission()
    setShowPrompt(false)
    
    if (permission === 'granted') {
      new Notification('Notifications Enabled! 🎉', {
        body: "You'll now receive updates about reviews, fitness tests, fixtures and announcements",
        icon: '/bcc-logo.png'
      })
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    sessionStorage.setItem('notification-prompt-dismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-primary dark:border-accent p-5 animate-slide-up">
        <div className="flex items-start gap-4">
          <div className="bg-gradient-to-br from-primary to-secondary p-3 rounded-xl flex-shrink-0">
            <Bell className="text-white" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
              Stay Updated
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Get notified about new reviews, fitness tests, fixtures and announcements
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                className="flex-1 bg-gradient-to-r from-primary to-secondary text-white px-4 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all text-sm"
              >
                Enable Notifications
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm font-semibold"
              >
                Not Now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
