# Firebase Authentication migration

The client now signs in with Firebase Authentication and derives authorization
from verified custom claims. The public app no longer reads account collections
before login, compares Firestore passwords, or creates the first administrator.

## Safe rollout order

1. In Firebase Console, enable **Authentication > Sign-in method > Email/Password**.
2. Download a short-lived service-account key for the correct Firebase project.
   Store it outside the repository and set `GOOGLE_APPLICATION_CREDENTIALS` to
   its absolute path. Never use a `VITE_` variable for server credentials.
3. Choose the fallback login domain used for records without a real email:

   ```powershell
   $env:AUTH_EMAIL_DOMAIN='auth.your-production-domain.example'
   ```

4. Preview the migration. This performs no writes:

   ```powershell
   npm run auth:migrate
   ```

5. Review duplicate-email or invalid-password errors, then create/update the
   Firebase Auth users, matching each Auth UID to its Firestore document ID:

   ```powershell
   npm run auth:migrate -- --apply
   ```

6. Test super-admin, club-admin, coach, guardian, and player accounts. Users now
   sign in with the `authEmail` written to their profile, not their old username.
7. Only after all roles pass, remove every plaintext password:

   ```powershell
   npm run auth:migrate -- --apply --remove-passwords
   ```

8. Deploy `firestore.rules` and `storage.rules` together:

   ```powershell
   firebase deploy --only firestore:rules,storage
   ```

9. Revoke/delete the downloaded service-account key after migration.

## Claims created by the migration

- `role`: `super-admin`, `club-admin`, `coach`, `guardian`, or `player`
- `clubId`
- `teamId` for single-team accounts
- `teamIds` for staff and guardians
- `playerIds` for guardians
- `onboardingComplete` where present

## Important deployment gate

Do not deploy the hardened rules before Auth users exist, and do not remove the
legacy password fields before the new accounts are verified. Do not launch the
production app while any account document still contains a `password` field.

Creating accounts and resetting passwords after migration must happen through a
trusted Admin SDK backend or operator process. Client-side forms must never write
passwords or custom claims directly to Firestore.
