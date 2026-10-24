const $ = (s) => document.querySelector(s);
const A = [
  "purple",
  "sneaky",
  "cosmic",
  "jolly",
  "turbo",
  "fuzzy",
  "lucky",
  "neon",
  "sleepy",
  "brave",
  "zesty",
  "mellow",
];
const N = [
  "llama",
  "panda",
  "otter",
  "falcon",
  "waffle",
  "ninja",
  "koala",
  "comet",
  "gecko",
  "yeti",
  "taco",
  "robot",
];
const pick = (a) => a[(Math.random() * a.length) | 0];
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
const toast = (t) => {
  const e = $("#toast");
  e.textContent = t;
  e.hidden = false;
  setTimeout(() => (e.hidden = true), 2500);
};

$("#name").value = localStorage.getItem("name") || "";
if (new URLSearchParams(location.search).has("left"))
  toast("You left the room. Start another?");

function go(room, mode) {
  const name = $("#name").value.trim();
  if (!name) {
    $("#name").focus();
    return toast("Pick a name first");
  }
  localStorage.setItem("name", name);
  location.href = `/room?r=${room}&m=${mode}`;
}
const mode = () => document.querySelector("[name=m]:checked").value;

$("#create").onclick = () =>
  go(`${pick(A)}-${pick(N)}-${(10 + Math.random() * 90) | 0}`, mode());
$("#join").onsubmit = (e) => {
  e.preventDefault();
  const v = $("#code").value.trim();
  let room = "",
    m = mode();
  try {
    const u = new URL(v);
    room = u.searchParams.get("r") || "";
    m = u.searchParams.get("m") || m;
  } catch {
    room = slug(v);
  }
  room = slug(room);
  room.length >= 3 ? go(room, m) : toast("Enter a valid room code or link");
};
