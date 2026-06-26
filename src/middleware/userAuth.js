const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// Attaches req.customer if a valid customer JWT is present.
// Does NOT block the request if absent — routes that need auth should
// check req.customer themselves, allowing public + optionally-authed routes.
function attachUser(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === "customer") req.customer = decoded;
  } catch (e) { /* expired or tampered — just skip */ }
  next();
}

// Hard gate — call after attachUser
function requireUser(req, res, next) {
  if (!req.customer) return res.status(401).json({ error: "Please log in to continue." });
  next();
}

function signCustomerToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: "customer" },
    JWT_SECRET,
    { expiresIn: "30d" },
  );
}

module.exports = { attachUser, requireUser, signCustomerToken };
