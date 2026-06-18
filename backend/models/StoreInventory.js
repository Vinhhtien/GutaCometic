const mongoose = require("mongoose");

const storeInventorySchema = new mongoose.Schema(
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
    totalStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reservedStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    availableStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
  },
  { timestamps: true }
);

storeInventorySchema.index({ storeId: 1, productId: 1 }, { unique: true });
storeInventorySchema.index({ storeId: 1, availableStock: 1 });
storeInventorySchema.index({ expiryDate: 1 });

storeInventorySchema.pre("validate", function calculateAvailableStock(next) {
  this.availableStock = this.totalStock - this.reservedStock;

  if (this.availableStock < 0) {
    this.invalidate(
      "reservedStock",
      "Reserved stock cannot exceed total stock"
    );
  }

  next();
});

module.exports = mongoose.model("StoreInventory", storeInventorySchema);
