#!/bin/bash
# Manual password reset guide using Firebase Console
# 
# If you can't run regenerate-passwords.js (no service account), do this manually:
#
# 1. Go to Firebase Console: https://console.firebase.google.com
# 2. Select your project (bcc-app)
# 3. Go to Firestore Database
# 4. Navigate to "coaches" collection
# 5. For EACH coach document:
#    - Click Edit
#    - Change "password" field to a new strong password
#    - Add or update "passwordChangedAt" field to today's date (e.g., "2026-02-11")
#    - Click Update
# 6. Repeat for "players" collection
# 7. Manually send WhatsApp messages with new passwords to each user
#
# STRONG PASSWORD SUGGESTION (use a different one for each user):
# Format: [Uppercase][lowercase][number][special][@#$%] + random chars
#
# Examples:
# - Gareth: Tr0p#HxKmLp2Qw
# - Coach Name: Po9n&VkMpRsT8x
# - Player Name: Ws3y%JqLmNvX4r
#
# Or use this online generator with complexity="high":
# https://www.lastpass.com/password-generator/

echo "Manual Password Reset Instructions"
echo "===================================="
echo ""
echo "If regenerate-passwords.js is not available or fails, follow these steps:"
echo ""
echo "1. Open Firebase Console: https://console.firebase.google.com"
echo "2. Select your project"
echo "3. Go to Firestore Database → coaches collection"
echo "4. Edit each document and update the 'password' field"
echo "5. Repeat for players collection"
echo "6. Send new credentials via WhatsApp to each user"
echo ""
echo "Keep the passwords secure until users receive them."
echo ""
