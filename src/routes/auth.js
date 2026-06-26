const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = db.findAdminByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "12h",
  });
  res.json({ token, username: user.username });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ username: req.admin.username });
});

router.put("/password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }

  const user = db.getAdminById(req.admin.sub);
  if (!user || !bcrypt.compareSync(currentPassword || "", user.passwordHash)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  db.updateAdminPassword(user.id, bcrypt.hashSync(newPassword, 10));
  db.addActivity("Password changed");

  res.json({ ok: true });
});

module.exports = router;
