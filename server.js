require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const helmet   = require("helmet");
const rateLimit = require("express-rate-limit");
const path     = require("path");

const authRoutes     = require("./src/routes/auth");
const productRoutes  = require("./src/routes/products");
const contactRoutes  = require("./src/routes/contact");
const activityRoutes = require("./src/routes/activity");
const userRoutes     = require("./src/routes/users");
const googleAuth     = require("./src/routes/googleAuth");
const wishlistRoutes = require("./src/routes/wishlist");
const orderRoutes    = require("./src/routes/orders");

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

const origin = process.env.FRONTEND_ORIGIN || "*";
app.use(cors({ origin: origin === "*" ? true : origin.split(",").map(s => s.trim()) }));
app.use(express.json({ limit: "1mb" }));

const authLimiter    = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 });

// Admin API
app.use("/api/auth",     authLimiter, authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/contact",  contactLimiter, contactRoutes);
app.use("/api/activity", activityRoutes);

// Customer API
app.use("/api/users/auth/google", googleAuth);
app.use("/api/users",    authLimiter, userRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders",   orderRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Magic-link redirect page — /auth/magic?token=xxx
app.get("/auth/magic", (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect("/shop.html");
  res.redirect(`/api/users/magic-link/verify?token=${token}`);
});

// Serve existing static site
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" });
  res.status(404).send("Not found");
});

app.listen(PORT, () => console.log(`UrbanHive running at http://localhost:${PORT}`));
