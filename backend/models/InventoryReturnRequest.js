const mongoose = require("mongoose");

const inventoryReturnRequestSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    currentAvailableStock: {
      type: Number,
      required: true,
      min: 0,
    },
    reasonType: {
      type: String,
      enum: ["DAMAGED", "DEFECTIVE", "EXPIRED", "OTHER"],
      required: true,
    },
    managerNote: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    reviewNote: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

inventoryReturnRequestSchema.index({ storeId: 1, createdAt: -1 });
inventoryReturnRequestSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model(
  "InventoryReturnRequest",
  inventoryReturnRequestSchema
);
