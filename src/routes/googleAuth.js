const express = require("express");
const db      = require("../db");
const { signCustomerToken } = require("../middleware/userAuth");

const router = express.Router();

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SITE_URL      = process.env.SITE_URL || "http://localhost:4000";
const REDIRECT_URI  = `${SITE_URL}/api/users/auth/google/callback`;

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

// ── Step 1: redirect browser to Google consent screen ────────────
router.get("/", (req, res) => {
  if (!CLIENT_ID) {
    return res.status(500).send(errorPage(
      "Google OAuth not configured",
      "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.",
    ));
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id",     CLIENT_ID);
  url.searchParams.set("redirect_uri",  REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope",         SCOPES);
  url.searchParams.set("access_type",   "online");
  url.searchParams.set("prompt",        "select_account");

  res.redirect(url.toString());
});

// ── Step 2: Google redirects back here with ?code= ───────────────
router.get("/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect("/shop.html?auth_error=cancelled");
  }

  try {
    // Exchange authorisation code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || "Token exchange failed");
    }

    // Fetch the user's Google profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) {
      throw new Error("Could not fetch Google profile");
    }

    const { id: googleId, email, verified_email } = profile;

    // Find or create the user, linking Google ID to any existing email+password account
    let user = db.findUserByGoogleId(googleId);

    if (!user) {
      // Check if they already have an email+password account with this address
      const existing = db.findUserByEmail(email);
      if (existing) {
        // Link Google to the existing account
        user = db.updateUser(existing.id, {
          googleId,
          verified: true,
        });
      } else {
        // Brand-new user — create account (Google verifies the email for us)
        user = db.createUser({ email, googleId, verified: !!verified_email });
      }
    }

    const jwt = signCustomerToken(user);
    // Pass token to shop via URL fragment — never hits a server log
    res.redirect(`/shop.html#auth=${jwt}`);

  } catch (err) {
    console.error("[urbanhive] Google OAuth callback error:", err.message);
    res.redirect("/shop.html?auth_error=failed");
  }
});

function errorPage(title, body) {
  return `<!DOCTYPE html><html><body style="background:#0D0C0C;color:#F5F0E8;font-family:sans-serif;text-align:center;padding:80px 20px">
    <h2 style="color:#C8501A">${title}</h2><p>${body}</p>
    <a href="/shop.html" style="color:#C8501A">Back to Shop →</a></body></html>`;
}

module.exports = router;
