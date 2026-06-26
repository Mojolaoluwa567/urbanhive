const express = require("express");
const db      = require("../db");
const { requireAuth } = require("../middleware/auth");
const { sendContactNotification, CONTACT_TO } = require("../lib/resend");

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUIRED  = ["inquiry_type","user_type","fullname","email","phone","message"];

router.post("/", async (req, res) => {
  const b = req.body || {};
  for (const f of REQUIRED) {
    if (!b[f]?.trim()) return res.status(400).json({ error: `Missing required field: ${f}` });
  }
  if (!EMAIL_RE.test(b.email)) return res.status(400).json({ error: "Please enter a valid email address." });

  const entry = db.addContactMessage({
    inquiryType: b.inquiry_type, userType: b.user_type, fullname: b.fullname,
    email: b.email, organization: b.organization || "", phone: b.phone, message: b.message,
  });

  try {
    const result = await sendContactNotification(CONTACT_TO, entry);
    if (!result.skipped) db.markContactEmailSent(entry.id);
    return res.json({ ok: true });
  } catch (e) {
    console.error("[urbanhive] Contact email failed:", e.message);
    return res.json({ ok: true, emailWarning: "Saved but email failed — check admin Messages panel." });
  }
});

router.get("/",      requireAuth, (req, res) => res.json(db.listContactMessages(100)));
router.delete("/:id", requireAuth, (req, res) => { db.deleteContactMessage(Number(req.params.id)); res.json({ ok: true }); });

module.exports = router;
