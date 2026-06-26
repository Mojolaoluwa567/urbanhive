const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const rows = db.listActivity(20);
  // Normalise to { msg, type, time } — the shape the admin dashboard JS uses.
  res.json(rows.map((r) => ({ msg: r.message, type: r.type, time: r.time })));
});

module.exports = router;
