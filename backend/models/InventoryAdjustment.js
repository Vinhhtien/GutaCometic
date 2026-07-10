const mongoose = require("mongoose");

const inventoryAdjustmentSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["DAMAGED", "DEFECTIVE", "LOST", "EXPIRED", "OTHER"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

inventoryAdjustmentSchema.index({ storeId: 1, createdAt: -1 });
inventoryAdjustmentSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryAdjustment", inventoryAdjustmentSchema);
