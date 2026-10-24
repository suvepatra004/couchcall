import { initChat } from "./chat.js";
const $ = (s) => document.querySelector(s);

/* ---------- safety net: visible errors, loop breaker, no auto-navigation ---------- */
function overlay(title, body, extra = "") {
  const d = document.createElement("div");
  d.style.cssText =
    "position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:#15121f;color:#f4effc;padding:1rem;text-align:center;font-family:inherit";
  d.innerHTML = `<div style="max-width:440px;display:grid;gap:.8rem"><h2 style="margin:0"></h2><p style="margin:0;color:#a69cc2"></p><div style="display:flex;gap:.6rem;justify-content:center">${extra}</div></div>`;
  d.querySelector("h2").textContent = title;
  d.querySelector("p").textContent = body;
  document.body.append(d);
  return d;
}
const fatal = (t, b) => {
  overlay(t, b, '<a class="button button--secondary" href="/">Home</a>');
  throw new Error(t);
};
let errShown = false;
const report = (m) => {
  if (errShown) return;
  errShown = true;
  const b = document.createElement("div");
  b.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:99;background:#e5484d;color:#fff;padding:.5rem .8rem;font:13px/1.4 ui-monospace,Menlo,monospace";
  b.textContent = `Error: ${m} (send a screenshot of this)`;
  document.body.append(b);
};
addEventListener("error", (e) => report(e.message));
addEventListener("unhandledrejection", (e) => report(String(e.reason)));

try {
  // stop if this page reloads more than 4 times in 15 seconds
  const k = "cc-loads",
    n = Date.now(),
    a = JSON.parse(sessionStorage.getItem(k) || "[]").filter(
      (t) => n - t < 15000,
    );
  a.push(n);
  sessionStorage.setItem(k, JSON.stringify(a));
  if (a.length > 4)
    fatal(
      "Stopped a reload loop",
      "This page reloaded repeatedly, so it was paused. Wait a few seconds, then go Home and try again.",
    );
} catch (e) {
  if (e.message === "Stopped a reload loop") throw e;
}

// stop with a clear message if room.html doesn't match this script
const NEED =
  "gate gname app rn code copy layout theater lite watch chatb unread leave exit work player url pastebtn load file screen empty ytwrap vid jitsi jhead jmin jframe bubble ini cnt grip chat snd cx msgs emo eb cf ci toast".split(
    " ",
  );
const missing = NEED.filter((id) => !$("#" + id));
if (missing.length)
  fatal(
    "room.html is outdated",
    "Replace room.html with the latest version. Missing: " + missing.join(", "),
  );

const q = new URLSearchParams(location.search);
const room = (q.get("r") || "").toLowerCase(),
  mode = q.get("m") || "c";
if (!/^[a-z0-9-]{3,60}$/.test(room))
  fatal("Invalid room code", "Go Home and create or join a room.");

let api,
  me,
  myName = "",
  tile = true,
  lite = false,
  started = false,
  watchPausedByUser = false;
const box = $("#jitsi"),
  work = $("#work"),
  vid = $("#vid");
$("#rn").textContent = room;
document.title = `${room} · Couchcall`;

/* ---------- helpers ---------- */
let tt;
const toast = (t) => {
  const e = $("#toast");
  e.textContent = t;
  e.hidden = false;
  clearTimeout(tt);
  tt = setTimeout(() => (e.hidden = true), 2200);
};
const copy = (txt, ok) =>
  navigator.clipboard.writeText(txt).then(
    () => toast(ok),
    () => toast("Copy failed – select and copy manually"),
  );
const link = () => `${location.origin}/room?r=${room}&m=${mode}`;
const css = (k, v) => box.style.setProperty(k, v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- chat (see chat.js) ---------- */
const chat = initChat({
  send: (t) => api?.executeCommand("sendChatMessage", t),
  myName: () => myName,
});

/* ---------- start ---------- */
$("#gname").value = localStorage.getItem("name") || "";
$("#gate").onsubmit = (e) => {
  e.preventDefault();
  start($("#gname").value.trim());
};
const fail = (m) => {
  $("#jframe").innerHTML = `<p class="err">${m}</p>`;
};

function setAvatar(name) {
  // initial + color for the minimized bubble
  $("#ini").textContent = (name.trim()[0] || "?").toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  css("--av", `hsl(${h} 45% 36%)`);
}
const count = () => {
  $("#cnt").textContent = api ? api.getNumberOfParticipants() || "" : "";
};

async function start(name) {
  if (!name || started) return;
  started = true;
  myName = name;
  localStorage.setItem("name", name);
  setAvatar(name);
  $("#gate").hidden = true;
  $("#app").hidden = false;
  if (mode === "m") watching(true);
  let d;
  try {
    const r = await fetch(
      `/api/token?room=${room}&name=${encodeURIComponent(name)}`,
    );
    d = await r.json();
    if (!r.ok) throw d.error;
  } catch (e) {
    return fail(`Couldn't start the room: ${e}`);
  }
  const s = document.createElement("script");
  s.src = `https://8x8.vc/${d.appId}/external_api.js`;
  s.onload = () => init(d);
  s.onerror = () =>
    fail("Could not load the video service. Check your connection.");
  document.head.append(s);
}

function init(d) {
  api = new JitsiMeetExternalAPI("8x8.vc", {
    roomName: `${d.appId}/${room}`,
    jwt: d.jwt,
    parentNode: $("#jframe"),
    width: "100%",
    height: "100%",
    configOverwrite: {
      prejoinConfig: { enabled: true },
      disableDeepLinking: true,
      enableWelcomePage: false,
      enableClosePage: false,
      subject: room,
      disabledSounds: ["INCOMING_MSG_SOUND"], // we play our own pop instead
      toolbarButtons: ["microphone", "camera"],
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      MOBILE_APP_PROMO: false,
    },
  });
  api.addListener("readyToClose", () => {
    // never navigate automatically
    try {
      api.dispose();
    } catch {}
    api = null;
    const o = overlay(
      "You left the room",
      "Rejoin the same room or start a new one.",
      '<button class="button button--primary" id="rj">Rejoin</button><a class="button button--secondary" href="/">Home</a>',
    );
    o.querySelector("#rj").onclick = () => location.reload();
  });
  api.addListener("tileViewChanged", (e) => (tile = e.enabled));
  api.addListener("videoConferenceJoined", (e) => {
    me = e.id;
    count();
    if (mode === "g") api.executeCommand("setVideoQuality", 360);
  });
  api.addListener("participantJoined", () => {
    count();
    if (cur) syncState("load");
  });
  api.addListener("participantLeft", count);
  api.addListener("endpointTextMessageReceived", (e) => {
    try {
      recv(JSON.parse(e.data.eventData.text));
    } catch {}
  });
  api.addListener("incomingMessage", (e) =>
    chat.add(e.nick || "Friend", e.message, false),
  );
  api.addListener("outgoingMessage", (e) => chat.add(myName, e.message, true));
}

/* messaging between participants (no extra server) */
function send(m) {
  if (!api) return;
  const t = JSON.stringify(m);
  api
    .getParticipantsInfo()
    .filter((p) => p.participantId !== me)
    .forEach((p) =>
      api.executeCommand("sendEndpointTextMessage", p.participantId, t),
    );
}

/* ---------- toolbar ---------- */
$("#code").onclick = () => copy(room, "✅ Room code copied");
$("#copy").onclick = () => copy(link(), "✅ Invite link copied");
$("#layout").onclick = () => api?.executeCommand("toggleTileView");
$("#lite").onclick = (e) => {
  lite = !lite;
  e.currentTarget.classList.toggle("on", lite);
  api?.executeCommand("setVideoQuality", lite ? 180 : 720);
  toast(
    lite
      ? "Low data on – video quality reduced to save internet"
      : "Low data off – normal video quality",
  );
};
$("#leave").onclick = () =>
  api ? api.executeCommand("hangup") : (location.href = "/");
const theater = (on) => {
  const wasTheater = document.body.classList.contains("theater");
  document.body.classList.toggle("theater", on);
  $("#exit").hidden = !on;
  if (wasTheater && !on) watching(false);
};
const watching = (on, fromRemote = false) => {
  if (fromRemote && watchPausedByUser) return;
  const wasWatching = document.body.classList.contains("watching");
  if (!fromRemote) watchPausedByUser = !on;
  document.body.classList.toggle("watching", on);
  $("#watch").classList.toggle("on", on);
  if (wasWatching && !on) pauseLocalMedia();
};
$("#theater").onclick = () => {
  watching(true);
  theater(true);
};
$("#exit").onclick = () => theater(false);
$("#watch").onclick = () =>
  watching(!document.body.classList.contains("watching"));
$("#jlayout").onclick = () => api?.executeCommand("toggleTileView");
$("#jleave").onclick = () =>
  api ? api.executeCommand("hangup") : (location.href = "/");
addEventListener("keydown", (e) => {
  if (e.key === "Escape") theater(false);
});

/* reactions */
function burst(em) {
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.className = "fx";
    s.textContent = em;
    s.style.left = Math.random() * 95 + "vw";
    s.style.animationDelay = Math.random() * 0.6 + "s";
    document.body.append(s);
    setTimeout(() => s.remove(), 3000);
  }
}
document.querySelectorAll(".fxb").forEach(
  (b) =>
    (b.onclick = () => {
      burst(b.dataset.e);
      send({ t: "fx", e: b.dataset.e });
    }),
);

/* ---------- floating call: drag, resize, minimize to avatar bubble ---------- */
function gesture(handle, onMove, onTap) {
  handle.addEventListener("pointerdown", (e) => {
    const b = e.target.closest("button");
    if (b && b !== handle) return; // ignore inner buttons
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add("drag");
    const sx = e.clientX,
      sy = e.clientY,
      r = box.getBoundingClientRect(),
      s = work.getBoundingClientRect();
    let moved = false;
    const move = (ev) => {
      const dx = ev.clientX - sx,
        dy = ev.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      onMove(dx, dy, r, s);
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      document.body.classList.remove("drag");
      if (!moved) onTap?.();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up, { once: true });
    handle.addEventListener("pointercancel", up, { once: true });
  });
}
const dragTo = (dx, dy, r, s) => {
  css(
    "--fl",
    clamp(r.left - s.left + dx, 0, Math.max(0, s.width - r.width)) + "px",
  );
  css(
    "--ft",
    clamp(r.top - s.top + dy, 0, Math.max(0, s.height - r.height)) + "px",
  );
  css("--fr", "auto");
  css("--fb", "auto");
};
gesture($("#jhead"), dragTo);
gesture($("#bubble"), dragTo, () => box.classList.remove("min"));
gesture($("#grip"), (dx, dy, r, s) => {
  css("--fw", clamp(r.width + dx, 220, s.width - (r.left - s.left)) + "px");
  css("--fh", clamp(r.height + dy, 150, s.height - (r.top - s.top)) + "px");
});
$("#jmin").onclick = () => box.classList.add("min");
addEventListener("resize", () => {
  // keep the call inside the video area
  if (!box.style.getPropertyValue("--fl")) return;
  const r = box.getBoundingClientRect(),
    s = work.getBoundingClientRect();
  css("--fl", clamp(r.left - s.left, 0, Math.max(0, s.width - r.width)) + "px");
  css("--ft", clamp(r.top - s.top, 0, Math.max(0, s.height - r.height)) + "px");
});

/* ---------- synced player: YouTube (IFrame API) or direct video ---------- */
let yt,
  cur = null,
  mute = false,
  lastT = 0;
const ytId = (u) => {
  try {
    const x = new URL(u);
    if (x.hostname === "youtu.be") return x.pathname.slice(1, 12);
    if (/(^|\.)youtube\.com$/.test(x.hostname))
      return (
        x.searchParams.get("v") ||
        (x.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/) || [])[1] ||
        null
      );
  } catch {}
  return null;
};
const P = {
  // unified controls for whichever player is active
  time: () => (cur?.k === "yt" ? yt?.getCurrentTime?.() || 0 : vid.currentTime),
  seek: (t) => (cur?.k === "yt" ? yt?.seekTo(t, true) : (vid.currentTime = t)),
  play: () => (cur?.k === "yt" ? yt?.playVideo() : vid.play().catch(() => {})),
  pause: () => (cur?.k === "yt" ? yt?.pauseVideo() : vid.pause()),
  playing: () => (cur?.k === "yt" ? yt?.getPlayerState?.() === 1 : !vid.paused),
};
function pauseLocalMedia() {
  if (cur) quiet(() => P.pause());
}
const show = (k) => {
  $("#empty").hidden = !!k;
  $("#ytwrap").hidden = k !== "yt";
  vid.hidden = k !== "url";
  if (k !== "yt") yt?.pauseVideo?.();
  if (k !== "url") vid.pause();
};
const quiet = (fn) => {
  mute = true;
  fn();
  setTimeout(() => (mute = false), 1000);
};
const syncState = (t) =>
  cur && send({ t, k: cur.k, v: cur.v, time: P.time(), playing: P.playing() });

function loadYT(id, time = 0, playing = true) {
  show("yt");
  const go = () => {
    if (yt?.loadVideoById)
      return quiet(() => {
        yt.loadVideoById({ videoId: id, startSeconds: time });
        if (!playing) setTimeout(() => yt.pauseVideo(), 600);
      });
    yt = new YT.Player("yt", {
      width: "100%",
      height: "100%",
      videoId: id,
      playerVars: {
        playsinline: 1,
        rel: 0,
        start: Math.floor(time),
        autoplay: playing ? 1 : 0,
      },
      events: {
        onStateChange: (e) => {
          if (mute) return;
          if (e.data === 1) {
            watchPausedByUser = false;
            send({ t: "play", time: P.time() });
          }
          if (e.data === 2 && !watchPausedByUser)
            send({ t: "pause", time: P.time() });
        },
        onError: () => toast("This video can't be embedded. Try another link."),
      },
    });
  };
  if (window.YT?.Player) return go();
  window.onYouTubeIframeAPIReady = go;
  if (!$("#ytapi")) {
    const s = document.createElement("script");
    s.id = "ytapi";
    s.src = "https://www.youtube.com/iframe_api";
    document.head.append(s);
  }
}
function loadMedia(k, v, time, playing) {
  if (cur && cur.k === k && cur.v === v) return;
  cur = { k, v };
  if (k === "yt") loadYT(v, time, playing);
  else {
    show("url");
    vid.src = v;
    vid.currentTime = time || 0;
    if (playing) P.play();
  }
}
setInterval(() => {
  // YouTube has no "seeked" event, so detect jumps
  if (cur?.k !== "yt" || !yt?.getCurrentTime) return;
  const t = P.time();
  if (!mute && Math.abs(t - lastT - (P.playing() ? 1 : 0)) > 1.5)
    send({ t: "seek", time: t });
  lastT = t;
}, 1000);

$("#load").onclick = () => {
  const u = $("#url").value.trim();
  if (!/^https?:\/\//i.test(u))
    return toast("Paste a full link starting with https://");
  const id = ytId(u);
  cur = null;
  loadMedia(id ? "yt" : "url", id || u, 0, true);
  syncState("load");
};
$("#url").onkeydown = (e) => e.key === "Enter" && $("#load").click();
$("#file").onchange = (e) => {
  const f = e.target.files[0];
  if (f) {
    cur = { k: "file", v: f.name };
    show("url");
    vid.src = URL.createObjectURL(f);
    toast("Local file loaded – friends open the same file");
  }
};
vid.onplay = () => {
  if (!mute) {
    watchPausedByUser = false;
    send({ t: "play", time: vid.currentTime });
  }
};
vid.onpause = () =>
  !mute &&
  !watchPausedByUser &&
  send({ t: "pause", time: vid.currentTime });
vid.onseeked = () => !mute && send({ t: "seek", time: vid.currentTime });
vid.onerror = () => {
  if (vid.getAttribute("src"))
    toast(
      "Can't play this link. Use a YouTube link or a direct .mp4 / .webm link.",
    );
};

/* paste helpers */
const urlIn = $("#url");
$("#pastebtn").onclick = async () => {
  try {
    urlIn.value = (await navigator.clipboard.readText()).trim();
    urlIn.focus();
  } catch {
    urlIn.focus();
    toast("Allow clipboard access, or press Ctrl/Cmd+V in the box");
  }
};
document.addEventListener("paste", (e) => {
  // Ctrl/Cmd+V works even when focus is elsewhere on the page
  if (
    /^(INPUT|TEXTAREA)$/.test(e.target.tagName) ||
    !document.body.classList.contains("watching")
  )
    return;
  const s = e.clipboardData?.getData("text")?.trim();
  if (s) {
    urlIn.value = s;
    urlIn.focus();
    e.preventDefault();
  }
});
urlIn.addEventListener("pointerdown", () => setTimeout(() => urlIn.focus(), 0));

function recv(m) {
  if (m.t === "fx") return burst(m.e);
  if (watchPausedByUser) return;
  watching(true, true);
  quiet(() => {
    if (m.t === "load") loadMedia(m.k, m.v, m.time, m.playing);
    if (m.time != null && cur && Math.abs(P.time() - m.time) > 1.5)
      P.seek(m.time);
    if (m.t === "pause" || (m.t === "load" && !m.playing)) P.pause();
    if (m.t === "play" || (m.t === "load" && m.playing)) P.play();
  });
}

/* start last, after everything above is defined */
if ($("#gname").value) start($("#gname").value);
