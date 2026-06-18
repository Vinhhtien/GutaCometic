require("dotenv").config();

const mongoose = require("mongoose");
const connectDatabase = require("./config/db");
const Product = require("./models/Product");

const products = [
  {
    sku: "CLEANSER-COSRX-001",
    name: "Low pH Good Morning Gel Cleanser",
    brand: "COSRX",
    description: "A gentle daily cleanser with a skin-friendly low pH.",
    image:
      "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80",
    price: 320000,
    category: "Cleanser",
    skinTypes: ["Oily", "Combination", "Sensitive"],
  },
  {
    sku: "SERUM-ORDINARY-001",
    name: "Niacinamide 10% + Zinc 1%",
    brand: "The Ordinary",
    description: "A lightweight serum for visible shine and uneven texture.",
    image:
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80",
    price: 290000,
    category: "Serum",
    skinTypes: ["Oily", "Combination", "Acne-prone"],
  },
  {
    sku: "MOIST-CERAVE-001",
    name: "Moisturizing Cream",
    brand: "CeraVe",
    description: "A rich moisturizer with ceramides for the skin barrier.",
    image:
      "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=800&q=80",
    price: 450000,
    category: "Moisturizer",
    skinTypes: ["Dry", "Normal", "Sensitive"],
  },
  {
    sku: "SUNSCREEN-LRP-001",
    name: "Anthelios Invisible Fluid SPF 50+",
    brand: "La Roche-Posay",
    description: "Lightweight broad-spectrum daily sun protection.",
    image:
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
    price: 520000,
    category: "Sunscreen",
    skinTypes: ["All"],
  },
];

const seed = async () => {
  try {
    await connectDatabase();

    for (const product of products) {
      await Product.findOneAndUpdate(
        { sku: product.sku },
        { $set: product },
        { upsert: true, runValidators: true }
      );
    }

    console.log(`Seeded ${products.length} products`);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();
