// Give the service worker access to Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js')

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "AIzaSyDQp4vZQM6QrSkf7lLCJc8pQxqoMAYXjUE",
  authDomain: "bccseniors-ea7b6.firebaseapp.com",
  projectId: "bccseniors-ea7b6",
  storageBucket: "bccseniors-ea7b6.firebasestorage.app",
  messagingSenderId: "1031632291031",
  appId: "1:1031632291031:web:0b9c92a8dbbf12d3a66b76"
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload)
  
  const notificationTitle = payload.notification?.title || 'BCC Team Update'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update',
    icon: '/bcc-logo.png',
    badge: '/bcc-logo.png',
    vibrate: [200, 100, 200],
    tag: 'bcc-notification',
    requireInteraction: false
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received.')
  event.notification.close()

  event.waitUntil(
    clients.openWindow('https://itzgazz-it.github.io/bcc-coaches-app/')
  )
})
