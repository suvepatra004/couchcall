// Signs a short-lived JaaS JWT. The private key never leaves the server.
const crypto = require("crypto");

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const normalizeRoom = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
const normalizeName = (value) => {
  const cleaned = String(value || "Guest")
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .trim()
    .slice(0, 40);
  return cleaned || "Guest";
};

module.exports = (req, res) => {
  const {
    JAAS_APP_ID: app,
    JAAS_KID: kidEnv,
    JAAS_PRIVATE_KEY: keyEnv,
  } = process.env;

  res.setHeader("Cache-Control", "no-store");

  if (!app || !kidEnv || !keyEnv) {
    return res
      .status(500)
      .json({ error: "Server is not configured (check env vars)." });
  }

  const room = normalizeRoom(req.query.room);
  if (!/^[a-z0-9-]{3,60}$/.test(room)) {
    return res.status(400).json({ error: "Invalid room name." });
  }

  const name = normalizeName(req.query.name);
  const kid = String(kidEnv).trim().includes("/")
    ? String(kidEnv).trim()
    : `${app}/${String(kidEnv).trim()}`;
  const key = String(keyEnv).trim().replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: "RS256", typ: "JWT", kid });
  const body = b64({
    aud: "jitsi",
    iss: "chat",
    sub: app,
    room,
    iat: now,
    nbf: now - 10,
    exp: now + 7200,
    context: {
      // Everyone is a moderator: fine for friend groups, enables lobby/password/YouTube share.
      user: { id: crypto.randomUUID(), name, moderator: "true" },
      features: {
        recording: "false",
        livestreaming: "false",
        transcription: "false",
        "outbound-call": "false",
      },
    },
  });

  try {
    const sig = crypto
      .createSign("RSA-SHA256")
      .update(`${head}.${body}`)
      .sign(key, "base64url");

    return res.status(200).json({ jwt: `${head}.${body}.${sig}`, appId: app });
  } catch {
    return res
      .status(500)
      .json({ error: "Could not sign token (check JAAS_PRIVATE_KEY)." });
  }
};
