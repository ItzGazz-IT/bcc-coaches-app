import { Bell, BellOff, X } from "lucide-react"
import { useState, useEffect } from "react"
import { requestNotificationPermission, onMessageListener } from "../firebase/messaging"

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [permission, setPermission] = useState('default')
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    // Check current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission)
      
      // Show prompt if permission not decided
      if (Notification.permission === 'default') {
        // Wait 5 seconds before showing prompt
        const timer = setTimeout(() => {
          setShowPrompt(true)
        }, 5000)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  useEffect(() => {
    // Listen for foreground messages
    if (permission === 'granted') {
      onMessageListener()
        .then((payload) => {
          setNotification({
            title: payload.notification?.title,
            body: payload.notification?.body
          })
          
          // Auto-hide after 5 seconds
          setTimeout(() => setNotification(null), 5000)
        })
        .catch((err) => console.log('Failed to receive message:', err))
    }
  }, [permission])

  const handleEnable = async () => {
    const token = await requestNotificationPermission()
    if (token) {
      setPermission('granted')
      setShowPrompt(false)
      
      // TODO: Save token to user's Firestore document
      console.log('Notification token:', token)
    } else {
      setPermission('denied')
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't ask again for this session
    sessionStorage.setItem('notification-prompt-dismissed', 'true')
  }

  if (!showPrompt && !notification) return null

  return (
    <>
      {/* Permission Prompt */}
      {showPrompt && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-slide-up">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-primary dark:border-accent p-5">
            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-br from-primary to-secondary p-3 rounded-xl flex-shrink-0">
                <Bell className="text-white" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
                  Stay Updated
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Get notified about new fixtures, announcements, and team updates
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
      )}

      {/* Foreground Notification Display */}
      {notification && (
        <div className="fixed top-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-slide-down">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg flex-shrink-0">
                <Bell className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-0.5">
                  {notification.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {notification.body}
                </p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
