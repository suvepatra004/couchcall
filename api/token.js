// Signs a short-lived JaaS JWT. The private key never leaves the server.
const crypto = require("crypto");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

module.exports = (req, res) => {
  const {
    JAAS_APP_ID: app,
    JAAS_KID: kidEnv,
    JAAS_PRIVATE_KEY: keyEnv,
  } = process.env;
  res.setHeader("Cache-Control", "no-store");
  if (!app || !kidEnv || !keyEnv)
    return res
      .status(500)
      .json({ error: "Server is not configured (check env vars)." });

  const room = String(req.query.room || "").toLowerCase();
  if (!/^[a-z0-9-]{3,60}$/.test(room))
    return res.status(400).json({ error: "Invalid room name." });
  const name =
    String(req.query.name || "Guest")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, 40) || "Guest";

  const kid = kidEnv.includes("/") ? kidEnv : `${app}/${kidEnv}`;
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
      .sign(keyEnv.replace(/\\n/g, "\n"), "base64url");
    res.status(200).json({ jwt: `${head}.${body}.${sig}`, appId: app });
  } catch {
    res
      .status(500)
      .json({ error: "Could not sign token (check JAAS_PRIVATE_KEY)." });
  }
};
