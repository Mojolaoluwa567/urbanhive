const express = require("express");
const bcrypt  = require("bcryptjs");
const db      = require("../db");
const { requireUser, signCustomerToken, attachUser } = require("../middleware/userAuth");

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Signup (email + password) — no verification needed ──────────
router.post("/signup", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !EMAIL_RE.test(email))
    return res.status(400).json({ error: "Please enter a valid email address." });
  if (!password || password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  if (db.findUserByEmail(email))
    return res.status(409).json({ error: "An account with that email already exists. Please sign in." });

  const user  = db.createUser({ email, passwordHash: bcrypt.hashSync(password, 10), verified: true });
  const token = signCustomerToken(user);

  res.status(201).json({ ok: true, token, user: publicUser(user), message: "Account created!" });
});

// ── Login (email + password) ──────────────────────────────────────
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  const user = db.findUserByEmail(email);
  if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash))
    return res.status(401).json({ error: "Incorrect email or password." });

  res.json({ token: signCustomerToken(user), user: publicUser(user) });
});

// ── Magic link — request ─────────────────────────────────────────
router.post("/magic-link", async (req, res) => {
  const { email } = req.body || {};
  if (!email || !EMAIL_RE.test(email))
    return res.status(400).json({ error: "Please enter a valid email address." });

  // Auto-create account if they don't have one yet
  let user = db.findUserByEmail(email);
  if (!user) user = db.createUser({ email, verified: true });

  // No email service — return the token directly for testing
  const token = db.createMagicToken(email);
  const verifyUrl = `${process.env.SITE_URL || "http://localhost:4000"}/api/users/magic-link/verify?token=${token}`;

  console.log(`[urbanhive] Magic link for ${email}: ${verifyUrl}`);

  res.json({
    ok: true,
    message: "Magic link generated! (No email service configured — check server console for the link during testing.)",
    // Only exposed in non-production so you can test without email
    ...(process.env.NODE_ENV !== "production" && { devLink: verifyUrl }),
  });
});

// ── Magic link — verify (browser lands here from link) ───────────
router.get("/magic-link/verify", (req, res) => {
  const { token } = req.query;
  const email = db.consumeMagicToken(token);

  if (!email) {
    return res.send(`<!DOCTYPE html><html><body style="background:#0D0C0C;color:#F5F0E8;font-family:sans-serif;text-align:center;padding:80px 20px">
      <h2 style="color:#C8501A">Link Expired</h2>
      <p>This sign-in link has expired (15 min) or already been used.</p>
      <a href="/shop.html" style="color:#C8501A">Back to Shop →</a></body></html>`);
  }

  let user = db.findUserByEmail(email);
  if (!user) user = db.createUser({ email, verified: true });

  const jwt = signCustomerToken(user);
  res.redirect(`/shop.html#auth=${jwt}`);
});

// ── Get current user ─────────────────────────────────────────────
router.get("/me", attachUser, requireUser, (req, res) => {
  const user = db.getUserById(req.customer.sub);
  if (!user) return res.status(404).json({ error: "Account not found." });
  res.json(publicUser(user));
});

// ── Admin: list all users ────────────────────────────────────────
const { requireAuth } = require("../middleware/auth");
router.get("/admin/list", requireAuth, (req, res) => {
  res.json(db.listUsers().map(u => ({
    id: u.id, email: u.email, verified: u.verified,
    earlyAccess: u.earlyAccess, createdAt: u.createdAt,
  })));
});

router.patch("/admin/:id/early-access", requireAuth, (req, res) => {
  const user = db.getUserById(Number(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found." });
  const updated = db.updateUser(user.id, { earlyAccess: !user.earlyAccess });
  db.addActivity(`${user.email} early access ${updated.earlyAccess ? "granted" : "revoked"}`);
  res.json({ id: updated.id, email: updated.email, earlyAccess: updated.earlyAccess });
});

function publicUser(u) {
  return { id: u.id, email: u.email, verified: u.verified, earlyAccess: u.earlyAccess, createdAt: u.createdAt };
}

module.exports = router;
