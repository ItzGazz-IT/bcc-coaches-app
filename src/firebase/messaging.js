import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { initializeApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
let messaging = null

// Initialize messaging only in supported browsers
try {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    messaging = getMessaging(app)
  }
} catch (error) {
  console.log('Push notifications not supported:', error)
}

export async function requestNotificationPermission() {
  if (!messaging) {
    console.log('Messaging not initialized')
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    
    if (permission === 'granted') {
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      })
      
      console.log('FCM Token:', token)
      // TODO: Save token to Firestore for user
      return token
    } else {
      console.log('Notification permission denied')
      return null
    }
  } catch (error) {
    console.error('Error getting notification permission:', error)
    return null
  }
}

export function onMessageListener() {
  if (!messaging) {
    return new Promise(() => {})
  }

  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload)
      resolve(payload)
    })
  })
}

export { messaging }
