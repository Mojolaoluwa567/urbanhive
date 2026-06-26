const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.RESEND_FROM        || "UrbanHive <onboarding@resend.dev>";
const SITE_URL       = process.env.SITE_URL           || "http://localhost:4000";
const CONTACT_TO     = process.env.CONTACT_TO_EMAIL   || "youremail@example.com";

async function send({ to, subject, html, replyTo }) {
  if (!RESEND_API_KEY) {
    console.warn("[urbanhive] RESEND_API_KEY not set — email skipped:", subject);
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: Array.isArray(to) ? to : [to], subject, html, reply_to: replyTo }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

function wrap(body) {
  return `
  <!DOCTYPE html><html><body style="margin:0;padding:0;background:#0D0C0C;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(200,80,26,.2)">
      <tr><td style="padding:36px 40px 0;border-bottom:1px solid rgba(200,80,26,.15)">
        <div style="font-family:'Georgia',serif;font-size:22px;font-weight:400;letter-spacing:.25em;color:#F5F0E8;text-transform:uppercase">URBANHIVE</div>
        <div style="font-size:9px;letter-spacing:.2em;color:#C8501A;margin-top:4px;margin-bottom:28px">FASHION &amp; LIFESTYLE</div>
      </td></tr>
      <tr><td style="padding:36px 40px">${body}</td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid rgba(200,80,26,.15);font-size:9px;letter-spacing:.1em;color:#6B6560">
        © ${new Date().getFullYear()} UrbanHive &nbsp;·&nbsp; You received this because you signed up or submitted a form.
      </td></tr>
    </table>
  </td></tr></table>
  </body></html>`;
}

function btn(href, label) {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:#C8501A;color:#F5F0E8;font-size:10px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;text-decoration:none">${label}</a>`;
}

function txt(s) { return `<p style="font-size:14px;line-height:1.75;color:#D8D2C8;margin:0 0 12px">${s}</p>`; }
function head(s) { return `<h2 style="font-family:'Georgia',serif;font-size:24px;font-weight:400;color:#F5F0E8;margin:0 0 20px;letter-spacing:.05em">${s}</h2>`; }

// ── Transactional emails ────────────────────────────────────────

async function sendVerificationEmail(email, token) {
  const link = `${SITE_URL}/api/users/verify-email?token=${token}`;
  return send({
    to: email, subject: "Verify your UrbanHive email",
    html: wrap(head("Verify Your Email") +
      txt("Welcome to UrbanHive. Click below to verify your email address and activate your account.") +
      txt("This link expires in <strong style='color:#C8501A'>24 hours</strong>.") +
      btn(link, "Verify Email →") +
      `<p style="font-size:11px;color:#6B6560;margin-top:20px">Or paste this link: <span style="color:#C8501A">${link}</span></p>`),
  });
}

async function sendMagicLink(email, token) {
  const link = `${SITE_URL}/auth/magic?token=${token}`;
  return send({
    to: email, subject: "Your UrbanHive sign-in link",
    html: wrap(head("Your Sign-In Link") +
      txt("Click the button below to sign in to your UrbanHive account. No password needed.") +
      txt("This link expires in <strong style='color:#C8501A'>15 minutes</strong> and can only be used once.") +
      btn(link, "Sign In →") +
      `<p style="font-size:11px;color:#6B6560;margin-top:20px">If you didn't request this, just ignore this email.</p>`),
  });
}

async function sendOrderConfirmation(email, order) {
  const rows = order.items.map(i =>
    `<tr><td style="padding:8px 0;color:#D8D2C8;font-size:13px;border-bottom:1px solid rgba(255,255,255,.06)">${i.name}</td>
     <td style="padding:8px 0;color:#D8D2C8;font-size:13px;text-align:right;border-bottom:1px solid rgba(255,255,255,.06)">x${i.qty}</td>
     <td style="padding:8px 0;color:#C8501A;font-size:13px;text-align:right;border-bottom:1px solid rgba(255,255,255,.06)">₦${(i.price * i.qty).toLocaleString()}</td></tr>`
  ).join("");

  return send({
    to: email, subject: `UrbanHive — Order #${order.id} confirmed`,
    html: wrap(head(`Order #${order.id} Confirmed ✦`) +
      txt(`Thanks for your order! We'll reach out on WhatsApp to arrange delivery.`) +
      `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
        <tr><th style="text-align:left;font-size:9px;letter-spacing:.12em;color:#6B6560;padding-bottom:8px">ITEM</th>
            <th style="text-align:right;font-size:9px;letter-spacing:.12em;color:#6B6560;padding-bottom:8px">QTY</th>
            <th style="text-align:right;font-size:9px;letter-spacing:.12em;color:#6B6560;padding-bottom:8px">PRICE</th></tr>
        ${rows}
        <tr><td colspan="2" style="padding-top:12px;font-size:11px;letter-spacing:.1em;color:#9A9590">TOTAL</td>
            <td style="padding-top:12px;font-size:16px;font-family:Georgia,serif;color:#F5F0E8;text-align:right">₦${order.total.toLocaleString()}</td></tr>
      </table>`),
  });
}

async function sendContactNotification(to, msg) {
  const esc = s => String(s||"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  return send({
    to, subject: `New contact form — ${msg.fullname}`, replyTo: msg.email,
    html: wrap(head("New Contact Form Submission") +
      `<table style="width:100%;border-collapse:collapse">
        ${[["Inquiry",msg.inquiryType],["User type",msg.userType],["Name",msg.fullname],["Email",msg.email],["Phone",msg.phone],["Org",msg.organization||"—"]].map(([k,v])=>
          `<tr><td style="padding:6px 0;font-size:10px;letter-spacing:.1em;color:#6B6560;width:110px">${k.toUpperCase()}</td><td style="padding:6px 0;font-size:13px;color:#D8D2C8">${esc(v)}</td></tr>`).join("")}
        <tr><td colspan="2" style="padding-top:16px;font-size:13px;color:#D8D2C8;line-height:1.7">${esc(msg.message).replace(/\n/g,"<br>")}</td></tr>
      </table>`),
  });
}

module.exports = {
  sendVerificationEmail,
  sendMagicLink,
  sendOrderConfirmation,
  sendContactNotification,
  CONTACT_TO,
};
