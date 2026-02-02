import { useEffect } from 'react'

export function useNotifications() {
  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const sendNotification = (title, body, icon = '/bcc-logo.png') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon,
        badge: '/bcc-logo.png',
        vibrate: [200, 100, 200],
        tag: 'bcc-notification'
      })

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000)

      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    }
  }

  return { sendNotification }
}
