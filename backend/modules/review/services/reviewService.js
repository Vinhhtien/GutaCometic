const mongoose = require("mongoose");
const Review = require("../../../models/Review");
const AppError = require("../../../utils/AppError");

const assertValidProductId = (productId) => {
  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError("Product ID is invalid", 400, "INVALID_PRODUCT_ID");
  }
};

const getReviewsByProduct = async (productId, { limit } = {}) => {
  assertValidProductId(productId);

  const query = Review.find({ productId }).sort({ createdAt: -1 }).lean();

  if (limit) {
    query.limit(limit);
  }

  return query;
};

const getRatingSummary = async (productId) => {
  assertValidProductId(productId);

  const [summary] = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        rating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  return {
    rating: summary ? Math.round(summary.rating * 10) / 10 : 0,
    reviewCount: summary ? summary.reviewCount : 0,
  };
};

module.exports = {
  getRatingSummary,
  getReviewsByProduct,
};
