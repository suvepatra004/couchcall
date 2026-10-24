const $ = (s) => document.querySelector(s);
const q = new URLSearchParams(location.search);
const room = (q.get("r") || "").toLowerCase(),
  mode = q.get("m") || "c";
if (!/^[a-z0-9-]{3,60}$/.test(room)) location.replace("/");
let api,
  me,
  tile = true,
  lite = false,
  mute = false,
  curUrl = "";
const vid = $("#vid");
$("#rn").textContent = room;
document.title = `${room} · Couchcall`;

/* ---------- start ---------- */
$("#gname").value = localStorage.getItem("name") || "";
$("#gate").onsubmit = (e) => {
  e.preventDefault();
  start($("#gname").value.trim());
};
if ($("#gname").value) start($("#gname").value);

const fail = (m) => {
  $("#jitsi").innerHTML = `<p class="err">${m}</p>`;
};

async function start(name) {
  if (!name) return;
  localStorage.setItem("name", name);
  $("#gate").hidden = true;
  $("#app").hidden = false;
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
    parentNode: $("#jitsi"),
    width: "100%",
    height: "100%",
    configOverwrite: {
      prejoinConfig: { enabled: true },
      disableDeepLinking: true,
      enableWelcomePage: false,
      enableClosePage: false,
      subject: room,
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
    if (mode === "m") {
      $("#watch").classList.add("on");
      $("#player").hidden = false;
      if (tile) api.executeCommand("toggleTileView");
    }
  });
  api.addListener("participantJoined", () => {
    if (curUrl) syncState("load");
  });
  api.addListener("endpointTextMessageReceived", (e) => {
    try {
      recv(JSON.parse(e.data.eventData.text));
    } catch {}
  });
}

/* ---------- messaging over Jitsi (no extra server) ---------- */
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
const flash = (t) => {
  const b = $("#copy"),
    o = b.textContent;
  b.textContent = t;
  setTimeout(() => (b.textContent = o), 1500);
};
$("#copy").onclick = () =>
  navigator.clipboard
    .writeText(`${location.origin}/room?r=${room}&m=${mode}`)
    .then(
      () => flash("✅ Copied"),
      () => flash("Copy failed"),
    );
$("#layout").onclick = () => api?.executeCommand("toggleTileView");
$("#lite").onclick = (e) => {
  lite = !lite;
  e.currentTarget.classList.toggle("on", lite);
  api?.executeCommand("setVideoQuality", lite ? 180 : 720);
};
$("#leave").onclick = () =>
  api ? api.executeCommand("hangup") : (location.href = "/");
$("#watch").onclick = (e) => {
  const p = $("#player");
  p.hidden = !p.hidden;
  e.currentTarget.classList.toggle("on", !p.hidden);
};
const theater = (on) => {
  document.body.classList.toggle("theater", on);
  $("#exit").hidden = !on;
  if (on && tile) api?.executeCommand("toggleTileView");
};
$("#theater").onclick = () => theater(true);
$("#exit").onclick = () => theater(false);

/* ---------- reactions ---------- */
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

/* ---------- synced player ---------- */
const syncState = (t) =>
  send({ t, url: curUrl, time: vid.currentTime, playing: !vid.paused });
const apply = (fn) => {
  mute = true;
  fn();
  setTimeout(() => (mute = false), 400);
};
$("#load").onclick = () => {
  const u = $("#url").value.trim();
  if (!/^https?:\/\//i.test(u)) return;
  curUrl = u;
  vid.src = u;
  syncState("load");
};
$("#file").onchange = (e) => {
  const f = e.target.files[0];
  if (f) {
    curUrl = "";
    vid.src = URL.createObjectURL(f);
  }
};
vid.onplay = () => !mute && send({ t: "play", time: vid.currentTime });
vid.onpause = () => !mute && send({ t: "pause", time: vid.currentTime });
vid.onseeked = () => !mute && send({ t: "seek", time: vid.currentTime });

function recv(m) {
  if (m.t === "fx") return burst(m.e);
  $("#player").hidden = false;
  $("#watch").classList.add("on");
  apply(() => {
    if (m.t === "load" && m.url && m.url !== curUrl) {
      curUrl = m.url;
      vid.src = m.url;
      $("#url").value = m.url;
    }
    if (m.time != null && Math.abs(vid.currentTime - m.time) > 1)
      vid.currentTime = m.time;
    if (m.t === "pause" || (m.t === "load" && !m.playing)) vid.pause();
    if (m.t === "play" || (m.t === "load" && m.playing))
      vid.play().catch(() => {});
  });
}
