// Notification service for BCC App
// Sends browser notifications for new reviews, fitness tests, fixtures, and announcements

let previousCounts = {
  reviews: 0,
  fitnessTests: 0,
  fixtures: 0,
  announcements: 0
}

let isInitialized = false

export const initializeNotifications = (data) => {
  if (!isInitialized) {
    previousCounts = {
      reviews: data.reviews?.length || 0,
      fitnessTests: data.fitnessTests?.length || 0,
      fixtures: data.fixtures?.length || 0,
      announcements: data.announcements?.length || 0
    }
    isInitialized = true
  }
}

const sendNotification = (title, body) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/bcc-logo.png',
      badge: '/bcc-logo.png',
      vibrate: [200, 100, 200],
      tag: Date.now().toString()
    })
    
    setTimeout(() => notification.close(), 5000)
    
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }
}

export const checkForNewReviews = (reviews, userRole, currentPlayerId, players) => {
  if (!isInitialized || !reviews) return
  
  const currentCount = reviews.length
  if (currentCount > previousCounts.reviews) {
    const newCount = currentCount - previousCounts.reviews
    const latest = reviews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
    
    if (userRole === 'player' && latest?.playerId === currentPlayerId) {
      sendNotification('New Review', 'You have a new review from your coach')
    } else if (userRole === 'coach') {
      const playerName = players.find(p => p.id === latest?.playerId)?.firstName || 'a player'
      sendNotification('New Review Added', `Review added for ${playerName}`)
    }
  }
  previousCounts.reviews = currentCount
}

export const checkForNewFitnessTests = (fitnessTests, userRole, currentPlayerId, players) => {
  if (!isInitialized || !fitnessTests) return
  
  const currentCount = fitnessTests.length
  if (currentCount > previousCounts.fitnessTests) {
    const newCount = currentCount - previousCounts.fitnessTests
    const latest = fitnessTests.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    
    if (userRole === 'player' && latest?.playerId === currentPlayerId) {
      sendNotification('New Fitness Test', 'Your latest fitness test results are available')
    } else if (userRole === 'coach') {
      const playerName = players.find(p => p.id === latest?.playerId)?.firstName || 'a player'
      sendNotification('New Fitness Test', `Test results added for ${playerName}`)
    }
  }
  previousCounts.fitnessTests = currentCount
}

export const checkForNewFixtures = (fixtures, userRole) => {
  if (!isInitialized || !fixtures) return
  
  const currentCount = fixtures.length
  if (currentCount > previousCounts.fixtures) {
    const latest = fixtures.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    sendNotification('New Fixture', `${latest?.opponent} - ${new Date(latest?.date).toLocaleDateString()}`)
  }
  previousCounts.fixtures = currentCount
}

export const checkForNewAnnouncements = (announcements, userRole) => {
  if (!isInitialized || !announcements) return
  
  const currentCount = announcements.length
  if (currentCount > previousCounts.announcements) {
    const latest = announcements[0]
    sendNotification('New Announcement', latest?.title || 'Check the app for details')
  }
  previousCounts.announcements = currentCount
}
