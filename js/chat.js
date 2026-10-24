// Chat panel: name + time on every message, emoji picker, unread badge, soft "pop" sound.
const $ = (s) => document.querySelector(s);
const EMOJI =
  "😀😂🤣😍😎🥳😭😅😜🤔🙄😴🤯😱😡🥺👍👎👏🙌🙏💪🤝👀🔥💯❤️💔🎉🎮🍿🎬🏆💀👻🤡🍕🍔🍻☕🌈⭐🚀".match(
    /\p{Extended_Pictographic}(?:\uFE0F)?/gu,
  ) || [];

let ctx,
  unread = 0,
  muted = localStorage.getItem("chat-muted") === "1";

// Short synthesized pop (no audio file needed). `high` = slightly higher pitch for your own messages.
function pop(high) {
  if (muted) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume?.();
    const t = ctx.currentTime,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(high ? 880 : 720, t);
    o.frequency.exponentialRampToValueAtTime(high ? 330 : 260, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.18);
  } catch {}
}

const hhmm = (d) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function initChat({ send, myName }) {
  $("#emo").innerHTML = EMOJI.map(
    (e) => `<button class="button button--emoji" type="button">${e}</button>`,
  ).join("");
  const sync = () => {
    $("#snd").textContent = muted ? "🔕" : "🔔";
  };
  sync();

  const open = (on) => {
    $("#chat").hidden = !on;
    $("#chatb").classList.toggle("on", on);
    if (on) {
      unread = 0;
      $("#unread").hidden = true;
      $("#ci").focus();
    }
  };

  $("#chatb").onclick = () => open($("#chat").hidden);
  $("#cx").onclick = () => open(false);
  $("#snd").onclick = () => {
    muted = !muted;
    localStorage.setItem("chat-muted", muted ? "1" : "0");
    sync();
    pop(false);
  };
  $("#eb").onclick = () => {
    $("#emo").hidden = !$("#emo").hidden;
  };
  $("#emo").onclick = (e) => {
    if (e.target.tagName === "BUTTON") {
      $("#ci").value += e.target.textContent;
      $("#ci").focus();
    }
  };
  $("#cf").onsubmit = (e) => {
    e.preventDefault();
    const v = $("#ci").value.trim();
    if (!v) return;
    send(v);
    $("#ci").value = "";
  };

  function add(name, text, mine) {
    const m = document.createElement("div");
    m.className = "m" + (mine ? " me" : "");
    const meta = document.createElement("div");
    meta.className = "meta";
    const who = document.createElement("b");
    who.textContent = mine ? myName() || "You" : name;
    const when = document.createElement("time");
    when.textContent = hhmm(new Date());
    meta.append(who, when);
    const p = document.createElement("p");
    p.textContent = text;
    m.append(meta, p);
    const list = $("#msgs");
    list.querySelector(".hint")?.remove();
    list.append(m);
    list.scrollTop = list.scrollHeight;
    pop(mine);
    if (!mine && $("#chat").hidden) {
      $("#unread").textContent = ++unread;
      $("#unread").hidden = false;
    }
  }
  return { add };
}
