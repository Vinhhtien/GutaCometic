const mongoose = require("mongoose");

const inventoryRequestSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    currentAvailableStock: {
      type: Number,
      required: true,
      min: 0,
    },
    requestedQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    status: {
      type: String,
      enum: ["OPEN", "RESOLVED", "CANCELLED"],
      default: "OPEN",
    },
    managerNote: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

inventoryRequestSchema.index({ storeId: 1, status: 1, createdAt: -1 });
inventoryRequestSchema.index({ productId: 1, status: 1 });

module.exports = mongoose.model("InventoryRequest", inventoryRequestSchema);
