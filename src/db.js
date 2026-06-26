const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { seed } = require("./seedDefaults");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE  = path.join(DATA_DIR, "urbanhive.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function defaultState() {
  return {
    products:        [],
    adminUsers:      [],
    users:           [],          // customer accounts
    magicTokens:     [],          // one-time login links
    emailVerifyTokens: [],        // email verification links
    wishlists:       {},          // { userId: [productId, ...] }
    orders:          [],          // customer orders
    activityLog:     [],
    contactMessages: [],
    nextIds: { activity: 1, contact: 1, user: 1, order: 1 },
  };
}

function load() {
  if (!fs.existsSync(DB_FILE)) return defaultState();
  try {
    return { ...defaultState(), ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) };
  } catch (e) {
    console.error("[urbanhive] Could not read data file, starting fresh:", e.message);
    return defaultState();
  }
}

function persist() {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

const state = load();

// ── First-run: admin account ───────────────────────────────────
if (state.adminUsers.length === 0) {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "change-this-before-first-run";
  state.adminUsers.push({ id: 1, username, passwordHash: bcrypt.hashSync(password, 10) });
  console.log(`[urbanhive] Created initial admin user "${username}".`);
}

// ── First-run: seed products ───────────────────────────────────
if (state.products.length === 0) {
  state.products = seed();
  console.log("[urbanhive] Seeded starter product catalogue.");
}

persist();

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function pruneExpiredTokens() {
  const now = Date.now();
  state.magicTokens       = state.magicTokens.filter(t => t.expiresAt > now && !t.used);
  state.emailVerifyTokens = state.emailVerifyTokens.filter(t => t.expiresAt > now && !t.used);
}

const db = {

  // ── PRODUCTS ────────────────────────────────────────────────
  listProducts() { return [...state.products].sort((a, b) => b.dateAdded - a.dateAdded); },
  getProduct(id) { return state.products.find(p => p.id === id) || null; },
  insertProduct(p) { state.products.unshift(p); persist(); return p; },
  updateProduct(id, patch) {
    const idx = state.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    state.products[idx] = { ...state.products[idx], ...patch };
    persist();
    return state.products[idx];
  },
  deleteProduct(id) {
    const before = state.products.length;
    state.products = state.products.filter(p => p.id !== id);
    persist();
    return state.products.length < before;
  },
  resetProducts() { state.products = seed(); persist(); return state.products; },

  // ── ADMIN USERS ──────────────────────────────────────────────
  findAdminByUsername(username) { return state.adminUsers.find(u => u.username === username) || null; },
  getAdminById(id)              { return state.adminUsers.find(u => u.id === id) || null; },
  updateAdminPassword(id, hash) {
    const u = state.adminUsers.find(u => u.id === id);
    if (!u) return false;
    u.passwordHash = hash; persist(); return true;
  },

  // ── CUSTOMER USERS ───────────────────────────────────────────
  createUser({ email, passwordHash = null, googleId = null, verified = false }) {
    const user = {
      id:           state.nextIds.user++,
      email:        email.toLowerCase().trim(),
      passwordHash,
      googleId,
      verified:     verified || !!googleId, // Google users are pre-verified
      earlyAccess:  false,
      createdAt:    Date.now(),
    };
    state.users.push(user);
    persist();
    return user;
  },
  findUserByEmail(email) {
    return state.users.find(u => u.email === email.toLowerCase().trim()) || null;
  },
  findUserByGoogleId(googleId) {
    return state.users.find(u => u.googleId === googleId) || null;
  },
  getUserById(id) { return state.users.find(u => u.id === id) || null; },
  updateUser(id, patch) {
    const u = state.users.find(u => u.id === id);
    if (!u) return null;
    Object.assign(u, patch);
    persist();
    return u;
  },
  listUsers() { return [...state.users].sort((a, b) => b.createdAt - a.createdAt); },

  // ── EMAIL VERIFICATION TOKENS ────────────────────────────────
  createEmailVerifyToken(email) {
    pruneExpiredTokens();
    const token = require("crypto").randomBytes(32).toString("hex");
    state.emailVerifyTokens.push({ token, email: email.toLowerCase(), expiresAt: Date.now() + 24 * 60 * 60 * 1000, used: false });
    persist();
    return token;
  },
  consumeEmailVerifyToken(token) {
    pruneExpiredTokens();
    const t = state.emailVerifyTokens.find(t => t.token === token && !t.used);
    if (!t) return null;
    t.used = true;
    persist();
    return t.email;
  },

  // ── MAGIC LINK TOKENS ────────────────────────────────────────
  createMagicToken(email) {
    pruneExpiredTokens();
    const token = require("crypto").randomBytes(32).toString("hex");
    state.magicTokens.push({ token, email: email.toLowerCase(), expiresAt: Date.now() + 15 * 60 * 1000, used: false });
    persist();
    return token;
  },
  consumeMagicToken(token) {
    pruneExpiredTokens();
    const t = state.magicTokens.find(t => t.token === token && !t.used);
    if (!t) return null;
    t.used = true;
    persist();
    return t.email;
  },

  // ── WISHLIST ─────────────────────────────────────────────────
  getWishlist(userId) { return state.wishlists[userId] || []; },
  addToWishlist(userId, productId) {
    if (!state.wishlists[userId]) state.wishlists[userId] = [];
    if (!state.wishlists[userId].includes(productId)) {
      state.wishlists[userId].push(productId);
      persist();
    }
    return state.wishlists[userId];
  },
  removeFromWishlist(userId, productId) {
    if (!state.wishlists[userId]) return [];
    state.wishlists[userId] = state.wishlists[userId].filter(id => id !== productId);
    persist();
    return state.wishlists[userId];
  },

  // ── ORDERS ───────────────────────────────────────────────────
  createOrder({ userId, items, total, customerEmail }) {
    const order = {
      id:            state.nextIds.order++,
      userId,
      customerEmail,
      items,          // [{ productId, name, price, qty }]
      total,
      status:        "pending",   // pending | confirmed | shipped | delivered
      createdAt:     Date.now(),
    };
    state.orders.unshift(order);
    persist();
    return order;
  },
  getOrder(id) { return state.orders.find(o => o.id === id) || null; },
  listOrdersByUser(userId) { return state.orders.filter(o => o.userId === userId); },
  listAllOrders(limit = 100) { return state.orders.slice(0, limit); },
  updateOrderStatus(id, status) {
    const o = state.orders.find(o => o.id === id);
    if (!o) return null;
    o.status = status;
    persist();
    return o;
  },

  // ── ACTIVITY LOG ─────────────────────────────────────────────
  addActivity(message, type = "default") {
    const entry = { id: state.nextIds.activity++, message, type, time: Date.now() };
    state.activityLog.unshift(entry);
    state.activityLog = state.activityLog.slice(0, 50);
    persist();
    return entry;
  },
  listActivity(limit = 20) { return state.activityLog.slice(0, limit); },

  // ── CONTACT MESSAGES ─────────────────────────────────────────
  addContactMessage(msg) {
    const entry = { id: state.nextIds.contact++, createdAt: Date.now(), emailSent: false, ...msg };
    state.contactMessages.unshift(entry);
    persist();
    return entry;
  },
  markContactEmailSent(id) {
    const m = state.contactMessages.find(m => m.id === id);
    if (m) { m.emailSent = true; persist(); }
  },
  listContactMessages(limit = 100) { return state.contactMessages.slice(0, limit); },
  deleteContactMessage(id) {
    state.contactMessages = state.contactMessages.filter(m => m.id !== id);
    persist();
  },
};

module.exports = db;
