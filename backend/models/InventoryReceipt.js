const mongoose = require("mongoose");

const inventoryReceiptSchema = new mongoose.Schema(
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
    source: {
      type: String,
      enum: ["DIRECT", "SALES_REQUEST", "TRANSFER", "RETURN_REJECTED"],
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

inventoryReceiptSchema.index({ storeId: 1, createdAt: -1 });
inventoryReceiptSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryReceipt", inventoryReceiptSchema);
