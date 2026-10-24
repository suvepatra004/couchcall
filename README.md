# 🛋️ Couchcall

Instant, no-signup video rooms for **game nights** and **movie nights**. Plain HTML/CSS/JS, one tiny serverless function, hosted free on Vercel. Video is powered by Jitsi as a Service (JaaS).

## Features
- Create a room with a fun auto-generated name, or join by code or link. No accounts, no history.
- Modes: 🎮 Game night, 🍿 Movie night, 💬 Just hang
- Built-in Jitsi: chat, polls, hand raise, virtual backgrounds, noise suppression, screen share, lobby/password (moderator menu → Security), YouTube sharing
- Extras: Lite mode, Theater mode, synced video player (URL or local file), emoji bursts

## Setup
1. In the JaaS console, note your **App ID**, **Key ID** and your **private key**.
2. Push this folder to GitHub and import it in Vercel (no build settings needed).
3. Add environment variables (see `.env.example`): `JAAS_APP_ID`, `JAAS_KID`, `JAAS_PRIVATE_KEY`.
4. Deploy. Test locally with `npx vercel dev`.

Never commit your private key. `.gitignore` already blocks `.env` and `*.pem`.

## Structure
```
index.html   landing        room.html   call page
css/style.css               js/app.js   landing logic
js/room.js   Jitsi, modes, sync, reactions
api/token.js JWT signer (Vercel function)
```

## Good to know
- **Free tier:** 25 monthly active users. No recording or live-streaming.
- **Screen share + audio:** Chrome/Edge desktop only ("share tab audio"). Netflix-style DRM services show a black screen.
- **Everyone is a moderator** (by design, for friend groups). Change `moderator` in `api/token.js` to restrict.
- Push-to-talk: hold Space while muted (Jitsi built-in, tab must be focused).
- Use only content you have the rights to watch together.
