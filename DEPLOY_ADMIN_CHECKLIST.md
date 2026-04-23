# Admin Deployment Checklist

This checklist tracks what is implemented in-app and what still needs environment-level setup.

## Implemented in app

- Deploy Readiness page with blocked and warning states for upcoming fixtures.
- Home fixture readiness checks:
  - Home day plan exists.
  - Squad selected.
  - Selected players submitted availability confirmation.
- Away fixture readiness checks:
  - Away game record exists.
  - Team lineup has selected players.
  - Selected players submitted availability.
  - Selected players submitted transport response (offer or request), except when unavailable.
- Away lineup confirm gate:
  - Blocks lineup confirmation when selected players are missing availability or transport response.
- Player confirmation flow from coach selection:
  - Home: selected players can submit availability.
  - Away: selected players can submit availability and transport offer/request.
- Team separation by kickoff mapping:
  - Reserve Team = 13:45
  - First Team = 15:30

## Runbook checks before production deploy

- Run production build:
  - npm run build
- Run readiness audit script:
  - node scripts/admin-readiness-audit.cjs
- Verify Deploy Readiness page has no blocked fixtures.

## Required outside this repository (still needed)

- Firestore security rules hardening:
  - Enforce role-based writes for coach and super-admin admin actions.
  - Restrict player writes to own confirmations and own transport responses.
- Audit logging policy:
  - Ensure critical admin actions are recorded and retained.
- Secrets and credential hygiene:
  - Rotate service account key.
  - Confirm no credential files are deployed to client hosting.
- Backup and recovery:
  - Configure scheduled Firestore export and test restore process.
- Monitoring and alerting:
  - Add alerts for write failures, denied access spikes, and import failures.

## Suggested go-live gate

- No blocked items in Deploy Readiness.
- All high-priority fixtures have lineup confirmed.
- Manual smoke test completed for coach and player flows.
