# Project plan

## Status overview

| Area | Status | Notes |
| --- | --- | --- |
| Landing and room flow | Complete | Room creation, join-by-code, and direct link handling work as expected. |
| JaaS authentication | Complete | Short-lived JWT flow is implemented in the Vercel token endpoint. |
| Core room experience | Complete | Jitsi embed, three modes, and toolbar actions are in place. |
| Shared media controls | Complete | Synced video player and emoji reactions are available. |
| Live validation | In progress | Needs verification against a real JaaS account and multiple devices. |

## Completed milestones

### v0.1
- Landing page for room creation and join flow
- Room page with pre-join name entry and Jitsi embed
- JaaS JWT signer in `api/token.js`
- Game, movie, and hang modes
- Invite link, tile view, lite mode, and theater mode actions
- Shared emoji bursts across participants
- Synced HTML5 player for direct URLs and local file playback
- Responsive dark UI with playful styling

## Validation checklist

Before calling the app stable, verify the following on the free JaaS tier:

- `sendEndpointTextMessage` delivery works consistently for reactions and player sync
- Lobby and room-password controls behave as expected
- `setVideoQuality` changes are stable for Lite mode
- App flow works on at least two devices in the same room
- Mobile layout remains usable and accessible

## Planned improvements

1. Picture-in-picture overlay behavior for gaming sessions without breaking the active call
2. HLS (`.m3u8`) support using a small pinned CDN script or safe media loader
3. Late-joiner resync controls and playback-rate sync
4. Optional host-only controls and mode-specific toolbar presets
5. Soundboard, theme variants, and a lightweight installable PWA experience

## Explicit non-goals

- User accounts
- Persistent database or chat history
- Recording or live streaming
- Third-party piracy or unauthorized media integrations
- Backend user management or analytics infrastructure

## Success criteria

The app is considered ready for broader use when the room flow is stable, cross-device behavior is confirmed, and the JaaS integration remains operational within the free-tier constraints.
