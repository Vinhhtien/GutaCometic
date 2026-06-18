const mongoose = require("mongoose");

const transferItemSchema = new mongoose.Schema(
  {
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
  },
  { _id: false }
);

const stockTransferSchema = new mongoose.Schema(
  {
    fromStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    toStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    items: {
      type: [transferItemSchema],
      required: true,
      validate: [(items) => items.length > 0, "Transfer must contain items"],
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED"],
      default: "PENDING",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

stockTransferSchema.pre("validate", function validateStores(next) {
  if (this.fromStoreId?.equals(this.toStoreId)) {
    this.invalidate("toStoreId", "Destination store must be different");
  }
  next();
});

module.exports = mongoose.model("StockTransfer", stockTransferSchema);
