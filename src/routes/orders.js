const express = require("express");
const db      = require("../db");
const { attachUser, requireUser } = require("../middleware/userAuth");
const { requireAuth } = require("../middleware/auth");
const { sendOrderConfirmation } = require("../lib/resend");

const router = express.Router();

// Customer: place order
router.post("/", attachUser, requireUser, async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || !items.length)
    return res.status(400).json({ error: "Order must contain at least one item." });

  for (const item of items) {
    if (!item.productId || !item.qty || item.qty < 1)
      return res.status(400).json({ error: "Each item needs productId and qty." });
    const p = db.getProduct(item.productId);
    if (!p) return res.status(400).json({ error: `Product ${item.productId} not found.` });
    if (!p.inStock) return res.status(400).json({ error: `${p.name} is currently out of stock.` });
    item.name  = p.name;
    item.price = p.price;
  }

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const user  = db.getUserById(req.customer.sub);
  const order = db.createOrder({ userId: user.id, items, total, customerEmail: user.email });
  db.addActivity(`New order #${order.id} — ₦${total.toLocaleString()}`, "default");

  try { await sendOrderConfirmation(user.email, order); } catch (e) {
    console.error("[urbanhive] Order confirmation email failed:", e.message);
  }

  res.status(201).json(order);
});

// Customer: view own orders
router.get("/mine", attachUser, requireUser, (req, res) => {
  res.json(db.listOrdersByUser(req.customer.sub));
});

// Admin: all orders
router.get("/admin/all", requireAuth, (req, res) => {
  res.json(db.listAllOrders(200));
});

// Admin: update order status
router.patch("/admin/:id/status", requireAuth, (req, res) => {
  const { status } = req.body || {};
  const VALID = ["pending","confirmed","shipped","delivered"];
  if (!VALID.includes(status))
    return res.status(400).json({ error: `Status must be one of: ${VALID.join(", ")}` });
  const order = db.updateOrderStatus(Number(req.params.id), status);
  if (!order) return res.status(404).json({ error: "Order not found." });
  db.addActivity(`Order #${order.id} marked <strong>${status}</strong>`);
  res.json(order);
});

module.exports = router;
