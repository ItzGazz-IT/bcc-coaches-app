Developer Guide - src
======================

This folder contains the React app source.

Key files
- `src/App.jsx` - routing and app layout
- `src/contexts/AppContext.jsx` - global state, Firestore listeners, CRUD helpers
- `src/pages/*` - UI screens (Login, Players, Fixtures, CredentialsManager, CoachesManager, etc.)
- `src/utils/credentialUtils.js` - helper functions for generating usernames/passwords and WhatsApp messages
- `src/components/*` - UI components used across pages

Security notes
- Credentials for players and coaches are currently stored in Firestore as plaintext. Consider moving to Firebase Auth or encrypting passwords server-side.
- `CredentialsManager.jsx` is restricted to `super-admin` by code, but credentials are still accessible in Firestore; protect Firestore rules accordingly.

Local debugging
- To run the app locally use `npm run dev` and open the provided URL.
- Firestore config is read from environment variables via `src/firebase/config.js` which uses `import.meta.env.VITE_*`.
