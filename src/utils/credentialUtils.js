// Utility functions for credential generation
export const generateUsername = (firstName, lastName) => {
  // Create username: first initial.surname (lowercase)
  const initial = String(firstName || '').trim().charAt(0).toLowerCase()
  const surname = String(lastName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${initial}.${surname}`
}

export const generatePassword = (length = 12) => {
  // Generate a strong password with uppercase, lowercase, numbers, and special chars
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '@#$%'
  
  const allChars = uppercase + lowercase + numbers + special
  let password = ''
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

export const createWhatsAppMessage = (firstName, lastName, username, password, appUrl = '') => {
  return `Hi ${firstName}, welcome to UNYRA! 🏆

Your login credentials:
👤 Username: ${username}
🔐 Password: ${password}

${appUrl ? `📱 Login here: ${appUrl}` : ''}

Keep these credentials safe and change your password after first login.

Questions? Contact your coach! ⚽`
}

export const generateWhatsAppLink = (phoneNumber, message) => {
  // Remove any spaces or special chars from phone (except + for country code)
  const cleanPhone = phoneNumber.replace(/\s+/g, '')
  
  // WhatsApp API: https://wa.me/{phone_number}?text={message}
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
}
