# Progress log

## Current status

**Version:** v0.1

The initial app build is in place and the core room flow is working locally in concept, but it has not yet been validated against a real JaaS account and live multi-device usage.

## Completed

- Landing page and room entry flow
- JaaS JWT signing endpoint
- Jitsi room embed and prejoin experience
- Three modes: Game, Movie, and Hang
- Toolbar actions for layout, lite mode, theater mode, and invite copy
- Emoji reaction bursts
- Synchronized video playback for shared viewing
- Responsive dark UI styling

## Pending validation

- Real-room check with at least two devices
- Message delivery for reactions and player sync across participants
- Lobby and room-password behavior on the free tier
- Mobile layout and usability checks
- Stability under browser/OS variations

## Next actions

1. Add the three environment variables in Vercel.
2. Deploy the project and open the same room on two devices.
3. Verify room creation, join flow, and shared media syncing.
4. Capture any issues found during live testing and fix them before advancing the roadmap.

## Notes

The app is intentionally lightweight and does not yet include formalized backend persistence or analytics. Validation is currently the biggest remaining step before moving to extra polish and feature expansion.
