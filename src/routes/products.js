const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const VALID_CATEGORIES = ["sets", "tops", "dresses", "bottoms", "accessories"];

// Public — the shop page needs this without logging in.
router.get("/", (req, res) => {
  res.json(db.listProducts());
});

router.post("/", requireAuth, (req, res) => {
  const b = req.body || {};
  const name = (b.name || "").trim();
  const price = Number(b.price);

  if (!name || !VALID_CATEGORIES.includes(b.category) || !price || price <= 0) {
    return res
      .status(400)
      .json({ error: "name, a valid category, and a positive price are required" });
  }

  const product = {
    id: "p" + Date.now(),
    name,
    category: b.category,
    price,
    oldPrice: Number(b.oldPrice) || 0,
    tag: b.tag || "",
    inStock: b.inStock === false ? false : true,
    image: (b.image || "").trim(),
    imageHover: (b.imageHover || "").trim(),
    description: (b.description || "").trim(),
    dateAdded: Date.now(),
  };

  db.insertProduct(product);
  db.addActivity(`Added new product <span>${name}</span>`);
  res.status(201).json(product);
});

router.put("/:id", requireAuth, (req, res) => {
  const existing = db.getProduct(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  const b = req.body || {};
  if (b.category && !VALID_CATEGORIES.includes(b.category)) {
    return res.status(400).json({ error: "Invalid category" });
  }

  const patch = {
    name: b.name !== undefined ? b.name.trim() : existing.name,
    category: b.category ?? existing.category,
    price: b.price !== undefined ? Number(b.price) : existing.price,
    oldPrice: b.oldPrice !== undefined ? Number(b.oldPrice) : existing.oldPrice,
    tag: b.tag ?? existing.tag,
    inStock: b.inStock === undefined ? existing.inStock : !!b.inStock,
    image: b.image !== undefined ? b.image.trim() : existing.image,
    imageHover: b.imageHover !== undefined ? b.imageHover.trim() : existing.imageHover,
    description: b.description !== undefined ? b.description.trim() : existing.description,
  };

  const updated = db.updateProduct(req.params.id, patch);
  db.addActivity(`Updated <span>${updated.name}</span>`);
  res.json(updated);
});

router.patch("/:id/stock", requireAuth, (req, res) => {
  const existing = db.getProduct(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  const updated = db.updateProduct(req.params.id, { inStock: !existing.inStock });
  db.addActivity(
    `${updated.name} marked ${updated.inStock ? "In Stock" : "Out of Stock"}`,
    updated.inStock ? "default" : "out",
  );
  res.json(updated);
});

router.delete("/:id", requireAuth, (req, res) => {
  const existing = db.getProduct(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  db.deleteProduct(req.params.id);
  db.addActivity(`Deleted <span>${existing.name}</span>`, "out");
  res.json({ ok: true });
});

router.post("/reset", requireAuth, (req, res) => {
  const products = db.resetProducts();
  db.addActivity("Product catalogue reset to defaults", "out");
  res.json(products);
});

module.exports = router;
