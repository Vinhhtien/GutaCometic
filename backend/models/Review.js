const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    // ── Liên kết ────────────────────────────────────────────────────────────────
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ── Nội dung đánh giá ────────────────────────────────────────────────────────
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },

    // ── Hình ảnh – mảng URL tuyệt đối từ Cloudinary ──────────────────────────────
    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ orderId: 1 }, { unique: true }); // mỗi đơn chỉ 1 đánh giá

module.exports = mongoose.model("Review", reviewSchema);
