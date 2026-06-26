const DEFAULT_PRODUCTS = [
  {
    id: "p1",
    name: "Brown Luxe",
    category: "sets",
    price: 10000,
    oldPrice: 12000,
    tag: "trending",
    inStock: true,
    image: "images/Brownwhite.png",
    imageHover: "images/browncolored.png",
    description:
      "A rich earthy brown co-ord set. Perfect for daytime elegance or evening affairs.",
  },
  {
    id: "p2",
    name: "Blue Dream",
    category: "sets",
    price: 12000,
    oldPrice: 15000,
    tag: "new",
    inStock: true,
    image: "images/Bluewhite.png",
    imageHover: "images/blue colored.png",
    description: "Cool-toned blue set with a sleek silhouette.",
  },
  {
    id: "p3",
    name: "Pink Glow",
    category: "sets",
    price: 11000,
    oldPrice: 13000,
    tag: "",
    inStock: true,
    image: "images/Pink white.png",
    imageHover: "images/pink colored.png",
    description: "Soft pink two-piece set. Feminine, fun, and absolutely on-trend.",
  },
  {
    id: "p4",
    name: "Black Crop Set",
    category: "tops",
    price: 9500,
    oldPrice: 12000,
    tag: "trending",
    inStock: true,
    image: "images/Black crop.png",
    imageHover: "",
    description: "The black crop top set that turns heads.",
  },
  {
    id: "p5",
    name: "Editorial White",
    category: "dresses",
    price: 14000,
    oldPrice: 18000,
    tag: "sale",
    inStock: false,
    image: "images/Artboard 1.png",
    imageHover: "",
    description: "Stunning editorial white piece. Currently out of stock.",
  },
  {
    id: "p6",
    name: "Luxe Portrait",
    category: "dresses",
    price: 16000,
    oldPrice: 20000,
    tag: "new",
    inStock: true,
    image: "images/Image 3.png",
    imageHover: "",
    description: "Statement dress for the woman who owns every room.",
  },
];

// Returns a fresh copy of the starter catalogue, with dateAdded values set
// relative to "now" so default sort order (newest first) looks right.
function seed() {
  const now = Date.now();
  return DEFAULT_PRODUCTS.map((p, i) => ({
    ...p,
    dateAdded: now - (DEFAULT_PRODUCTS.length - i) * 1000,
  }));
}

module.exports = { DEFAULT_PRODUCTS, seed };
