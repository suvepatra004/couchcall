# Plan

## Done (v0.1)
- Landing, room creation and join by code or link
- JaaS token endpoint, Jitsi embed, prejoin check
- Game / Movie / Hang modes, Layout, Lite, Theater, Invite copy
- Emoji bursts synced across participants
- Synced HTML5 player (direct URL and local file)
- Dark, playful, responsive UI

## To verify on the free JaaS tier
- `sendEndpointTextMessage` delivery (reactions and player sync)
- Lobby / room password availability
- `setVideoQuality` behavior for Lite mode

## Next
- Picture-in-picture call overlay while gaming (needs research; moving the iframe would drop the call)
- HLS (.m3u8) support in the player via a small pinned CDN script
- Player: late-joiner resync button, playback-rate sync
- Optional host-only controls and per-mode toolbar presets
- Soundboard, themes, PWA install

## Out of scope
Accounts, database, history, recording, live-streaming, third-party piracy-site integration.
