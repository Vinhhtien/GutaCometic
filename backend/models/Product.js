const mongoose = require("mongoose");

const ingredientSchema = new mongoose.Schema(
  {
    icon: {
      type: String,
      default: "leaf-outline",
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    skinTypes: {
      type: [String],
      default: [],
    },
    volume: {
      type: String,
      default: "",
      trim: true,
    },
    origin: {
      type: String,
      default: "",
      trim: true,
    },
    expiryDate: {
      type: String,
      default: "",
      trim: true,
    },
    ingredients: {
      type: [ingredientSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
