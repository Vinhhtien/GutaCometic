const reviewService = require("../services/reviewService");
const AppError = require("../../../utils/AppError");

// ─── GET /api/reviews?productId=... ──────────────────────────────────────────

const getReviews = async (req, res, next) => {
  try {
    const { productId, limit } = req.query;

    if (!productId) {
      throw new AppError("productId query param là bắt buộc", 400, "PRODUCT_ID_REQUIRED");
    }

    const reviews = await reviewService.getReviewsByProduct(productId, {
      limit: limit ? Number(limit) : undefined,
    });

    res.json({ reviews });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/reviews/order/:orderId ─────────────────────────────────────────

const getReviewByOrder = async (req, res, next) => {
  try {
    const review = await reviewService.getReviewsByOrder(req.params.orderId);
    res.json({ review: review || null });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/reviews ────────────────────────────────────────────────────────
// Multer đã upload ảnh lên Cloudinary TRƯỚC khi controller này chạy.
// req.files chứa mảng thông tin file đã upload; mỗi phần tử có .path = URL Cloudinary.

const createReview = async (req, res, next) => {
  try {
    const { orderId, rating, comment } = req.body;

    if (!orderId || !rating || !comment) {
      throw new AppError(
        "orderId, rating và comment là bắt buộc",
        400,
        "MISSING_FIELDS"
      );
    }

    const parsedRating = Number(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw new AppError("Rating phải là số từ 1 đến 5", 400, "INVALID_RATING");
    }

    // Lấy danh sách URL ảnh từ Cloudinary (do multer-storage-cloudinary đã upload)
    const images = (req.files || []).map((file) => file.path);

    const review = await reviewService.createReview({
      orderId,
      customerId: req.user._id,
      rating: parsedRating,
      comment: comment.trim(),
      images,
    });

    res.status(201).json({ review });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/reviews/:id ─────────────────────────────────────────────────────

const updateReview = async (req, res, next) => {
  try {
    const { rating, comment, existingImages } = req.body;

    const parsedRating = rating ? Number(rating) : undefined;
    if (
      parsedRating !== undefined &&
      (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5)
    ) {
      throw new AppError("Rating phải là số từ 1 đến 5", 400, "INVALID_RATING");
    }

    // Ảnh cũ (URL Cloudinary) user muốn giữ lại
    let keptImages = [];
    if (existingImages) {
      try {
        keptImages = JSON.parse(existingImages);
      } catch {
        keptImages = [];
      }
    }

    // Ảnh mới vừa upload lên Cloudinary qua Multer
    const newImages = (req.files || []).map((file) => file.path);

    // Gộp ảnh cũ + ảnh mới (tối đa 5)
    const images =
      keptImages.length > 0 || newImages.length > 0
        ? [...keptImages, ...newImages].slice(0, 5)
        : undefined;

    const review = await reviewService.updateReview(
      req.params.id,
      req.user._id,
      { rating: parsedRating, comment: comment?.trim(), images }
    );

    res.json({ review });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/reviews/:id ─────────────────────────────────────────────────

const deleteReview = async (req, res, next) => {
  try {
    await reviewService.deleteReview(req.params.id, req.user._id);
    res.json({ message: "Đã xóa đánh giá thành công" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  deleteReview,
  getReviewByOrder,
  getReviews,
  updateReview,
};
