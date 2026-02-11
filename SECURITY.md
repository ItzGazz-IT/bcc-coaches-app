Security & Incident Response
=============================

Summary
- This repository previously contained hardcoded coach passwords and a committed `.env` with a Firebase API key. Those files have been removed from the working tree but may still exist in git history.

Immediate actions you must take
1. Rotate exposed credentials now:
   - Change the Firebase API key and any other API credentials stored in the removed `.env`.
   - Reset coach/player passwords stored in Firestore.
2. Remove secrets from git history (optional but recommended):
   - Use `git filter-repo` or BFG to remove the files/strings from history, then force-push to remote.
   - Example using BFG:

```bash
# Install BFG and run (BE CAREFUL - this rewrites history)
bfg --delete-files InitializeCoaches.jsx
bfg --replace-text passwords.txt  # if you have a list
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

3. Contact GitHub support if you need help removing sensitive data from forks or cached scans.

Recommendations going forward
- Store secrets only in environment variables, not in source code.
- Use `firestore` security rules to restrict access, or migrate to Firebase Auth for user auth.
- Consider a backend for credential management and never store plain-text passwords in Firestore.
- Add automated secret scanning to CI.

If you'd like, I can:
- Rotate the Firebase key and update `.env.example` guidance.
- Create a small script to regenerate passwords in Firestore and notify coaches via WhatsApp.
- Prepare `git filter-repo` or BFG commands tailored to your repo and walk you through the process.
