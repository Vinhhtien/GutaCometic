const reviewService = require("../services/reviewService");
const AppError = require("../../../utils/AppError");

const getReviews = async (req, res, next) => {
  try {
    const { productId, limit } = req.query;

    if (!productId) {
      throw new AppError("productId query param is required", 400, "PRODUCT_ID_REQUIRED");
    }

    const reviews = await reviewService.getReviewsByProduct(productId, {
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ reviews });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReviews,
};
