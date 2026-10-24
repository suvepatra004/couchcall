# 🛋️ Couchcall

Instant video rooms for game nights, movie nights, and casual hangouts. Couchcall is a lightweight, no-signup web app built with plain HTML, CSS, and JavaScript, and powered by Jitsi as a Service (JaaS) behind a tiny Vercel serverless token endpoint.

## Overview

- Create a room in seconds with an auto-generated friendly name.
- Invite friends using a room code or shareable link.
- Switch between three modes: Game night, Movie night, and Just hang.
- Keep things simple: no accounts, no database, no history, and no heavy build pipeline.

## Features

- Room creation and join flow for direct code or link-based access
- Jitsi-powered video rooms with chat, hand raise, polls, lobby, screen share, and YouTube sharing
- Mode-aware layout tweaks for social hangouts, gaming, and movie watching
- Lite mode and theater mode for bandwidth-aware and focus-friendly sessions
- Synced HTML5 player for shared watching with local-file or URL playback
- Emoji bursts and simple room-state controls for shared energy

## Quick start

1. Create a JaaS project in the JaaS dashboard and copy your App ID, Key ID, and private key.
2. Copy `.env.example` to `.env` and fill in the values for `JAAS_APP_ID`, `JAAS_KID`, and `JAAS_PRIVATE_KEY`.
3. Deploy the project to Vercel. No build step is required.
4. Run the app locally with `npx vercel dev`.

Important: never commit your private key. The repository already ignores `.env` and `*.pem` files.

## Project structure

```text
.
├── api/
│   └── token.js          # Vercel serverless JWT signer
├── css/
│   └── style.css         # Shared styling for landing and room views
├── js/
│   ├── app.js            # Landing page room creation and join logic
│   └── room.js          # Jitsi room flow, toolbar actions, and sync logic
├── index.html            # Landing page
├── room.html             # Video room page
├── .env.example          # Safe environment variable template
├── .gitignore            # Ignores local env and secret files
├── README.md             # Project overview and setup docs
├── PLAN.md               # Product roadmap and milestones
├── Progress.md           # Current implementation status and checks
├── vercel.json           # Vercel config
└── LICENSE               # If added later
```

## Deployment notes

- Vercel can host the site as a static front end with a single serverless function in `api/token.js`.
- The JaaS free tier supports a limited number of active users; review the limits before production use.
- Shared local video files are not truly shared across participants; each user plays their own local copy, while playback state sync remains coordinated by the app.
- Screen sharing with audio is best on Chrome or Edge desktop browsers.

## Usage notes

- Everyone is a moderator by default so friend groups can share the room easily.
- If you want a stricter setup, change the `moderator` flag inside `api/token.js`.
- Hold the Space key while muted to use push-to-talk behavior when supported by the browser and Jitsi client.
- Use only content you have permission to stream or watch together.

## Future directions

The roadmap includes better late-joiner sync, richer host controls, optional PWA polish, and player enhancements for more media formats.

