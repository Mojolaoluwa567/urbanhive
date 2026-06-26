const express = require("express");
const db      = require("../db");
const { attachUser, requireUser } = require("../middleware/userAuth");

const router = express.Router();
router.use(attachUser, requireUser);

router.get("/", (req, res) => {
  const ids  = db.getWishlist(req.customer.sub);
  const items = ids.map(id => db.getProduct(id)).filter(Boolean);
  res.json(items);
});

router.post("/:productId", (req, res) => {
  const product = db.getProduct(req.params.productId);
  if (!product) return res.status(404).json({ error: "Product not found." });
  const ids = db.addToWishlist(req.customer.sub, req.params.productId);
  res.json({ wishlistIds: ids });
});

router.delete("/:productId", (req, res) => {
  const ids = db.removeFromWishlist(req.customer.sub, req.params.productId);
  res.json({ wishlistIds: ids });
});

module.exports = router;
