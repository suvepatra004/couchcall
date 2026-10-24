const $ = (s) => document.querySelector(s);
const q = new URLSearchParams(location.search);
const room = (q.get("r") || "").toLowerCase(),
  mode = q.get("m") || "c";
if (!/^[a-z0-9-]{3,60}$/.test(room)) location.replace("/");
let api,
  me,
  myName = "",
  tile = true,
  lite = false,
  unread = 0;
$("#rn").textContent = room;
document.title = `${room} · Couchcall`;

/* ---------- helpers ---------- */
let tt;
const toast = (t) => {
  const e = $("#toast");
  e.textContent = t;
  e.hidden = false;
  clearTimeout(tt);
  tt = setTimeout(() => (e.hidden = true), 1800);
};
const copy = (txt, ok) =>
  navigator.clipboard.writeText(txt).then(
    () => toast(ok),
    () => toast("Copy failed – select and copy manually"),
  );
const link = () => `${location.origin}/room?r=${room}&m=${mode}`;

/* ---------- start ---------- */
$("#gname").value = localStorage.getItem("name") || "";
$("#gate").onsubmit = (e) => {
  e.preventDefault();
  start($("#gname").value.trim());
};
if ($("#gname").value) start($("#gname").value);
const fail = (m) => {
  $("#jframe").innerHTML = `<p class="err">${m}</p>`;
};

async function start(name) {
  if (!name) return;
  myName = name;
  localStorage.setItem("name", name);
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
      // our own chat + player replace Jitsi's chat / shared-video buttons
      toolbarButtons: [
        "microphone",
        "camera",
        "desktop",
        "fullscreen",
        "hangup",
        "raisehand",
        "participants-pane",
        "tileview",
        "select-background",
        "settings",
        "shortcuts",
        "security",
        "noisesuppression",
      ],
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      MOBILE_APP_PROMO: false,
    },
  });
  api.addListener("readyToClose", () => (location.href = "/?left=1"));
  api.addListener("tileViewChanged", (e) => (tile = e.enabled));
  api.addListener("videoConferenceJoined", (e) => {
    me = e.id;
    if (mode === "g") api.executeCommand("setVideoQuality", 360);
  });
  api.addListener("participantJoined", () => {
    if (cur) syncState("load");
  });
  api.addListener("endpointTextMessageReceived", (e) => {
    try {
      recv(JSON.parse(e.data.eventData.text));
    } catch {}
  });
  api.addListener("incomingMessage", (e) =>
    addMsg(e.nick || "Friend", e.message, false),
  );
  api.addListener("outgoingMessage", (e) => addMsg("You", e.message, true));
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
};
$("#leave").onclick = () =>
  api ? api.executeCommand("hangup") : (location.href = "/");
const theater = (on) => {
  document.body.classList.toggle("theater", on);
  $("#exit").hidden = !on;
};
$("#theater").onclick = () => {
  watching(true);
  theater(true);
};
$("#exit").onclick = () => theater(false);
const watching = (on) => {
  document.body.classList.toggle("watching", on);
  $("#watch").classList.toggle("on", on);
};
$("#watch").onclick = () =>
  watching(!document.body.classList.contains("watching"));

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

/* ---------- floating, draggable, resizable faces window ---------- */
const box = $("#jitsi"),
  stage = $("#stage");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function gesture(handle, onMove) {
  handle.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add("drag");
    const sx = e.clientX,
      sy = e.clientY,
      r = box.getBoundingClientRect(),
      s = stage.getBoundingClientRect();
    const move = (ev) => onMove(ev.clientX - sx, ev.clientY - sy, r, s);
    const up = () => {
      handle.removeEventListener("pointermove", move);
      document.body.classList.remove("drag");
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up, { once: true });
    handle.addEventListener("pointercancel", up, { once: true });
  });
}
const css = (k, v) => box.style.setProperty(k, v);
gesture($("#jhead"), (dx, dy, r, s) => {
  css("--fl", clamp(r.left - s.left + dx, 0, s.width - r.width) + "px");
  css("--ft", clamp(r.top - s.top + dy, 0, s.height - r.height) + "px");
  css("--fr", "auto");
  css("--fb", "auto");
});
gesture($("#grip"), (dx, dy, r, s) => {
  css("--fw", clamp(r.width + dx, 220, s.width - (r.left - s.left)) + "px");
  css("--fh", clamp(r.height + dy, 150, s.height - (r.top - s.top)) + "px");
});
$("#jmin").onclick = () => {
  box.classList.toggle("min");
  $("#jmin").textContent = box.classList.contains("min") ? "+" : "–";
};

/* ---------- chat ---------- */
const EMOJI =
  "😀😂🤣😍😎🥳😭😅😜🤔🙄😴🤯😱😡🥺👍👎👏🙌🙏💪🤝👀🔥💯❤️💔🎉🎮🍿🎬🏆💀👻🤡🍕🍔🍻☕🌈⭐🚀".match(
    /\p{Extended_Pictographic}(?:\uFE0F)?/gu,
  );
$("#emo").innerHTML = EMOJI.map(
  (e) => `<button type="button">${e}</button>`,
).join("");
$("#emo").onclick = (e) => {
  if (e.target.tagName === "BUTTON") {
    $("#ci").value += e.target.textContent;
    $("#ci").focus();
  }
};
$("#eb").onclick = () => ($("#emo").hidden = !$("#emo").hidden);
const chatOpen = (on) => {
  $("#chat").hidden = !on;
  $("#chatb").classList.toggle("on", on);
  if (on) {
    unread = 0;
    $("#unread").hidden = true;
    $("#ci").focus();
  }
};
$("#chatb").onclick = () => chatOpen($("#chat").hidden);
$("#cx").onclick = () => chatOpen(false);
$("#cf").onsubmit = (e) => {
  e.preventDefault();
  const v = $("#ci").value.trim();
  if (!v || !api) return;
  api.executeCommand("sendChatMessage", v);
  $("#ci").value = "";
};
function addMsg(who, text, mine) {
  const m = document.createElement("div");
  m.className = "m" + (mine ? " me" : "");
  if (!mine) {
    const b = document.createElement("b");
    b.textContent = who;
    m.append(b);
  }
  m.append(document.createTextNode(text));
  const list = $("#msgs");
  list.querySelector(".hint")?.remove();
  list.append(m);
  list.scrollTop = list.scrollHeight;
  if (!mine && $("#chat").hidden) {
    $("#unread").textContent = ++unread;
    $("#unread").hidden = false;
  }
}

/* ---------- synced player: YouTube (IFrame API) or direct video ---------- */
const vid = $("#vid");
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
          if (e.data === 1) send({ t: "play", time: P.time() });
          if (e.data === 2) send({ t: "pause", time: P.time() });
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
vid.onplay = () => !mute && send({ t: "play", time: vid.currentTime });
vid.onpause = () => !mute && send({ t: "pause", time: vid.currentTime });
vid.onseeked = () => !mute && send({ t: "seek", time: vid.currentTime });

function recv(m) {
  if (m.t === "fx") return burst(m.e);
  watching(true);
  quiet(() => {
    if (m.t === "load") loadMedia(m.k, m.v, m.time, m.playing);
    if (m.time != null && cur && Math.abs(P.time() - m.time) > 1.5)
      P.seek(m.time);
    if (m.t === "pause" || (m.t === "load" && !m.playing)) P.pause();
    if (m.t === "play" || (m.t === "load" && m.playing)) P.play();
  });
}
