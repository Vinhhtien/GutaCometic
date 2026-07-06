const express = require("express");
const reviewController = require("../controllers/reviewController");
const protect = require("../../../middlewares/authMiddleware");
const { upload } = require("../../../config/cloudinary");

const router = express.Router();

// Tất cả route đều cần đăng nhập
router.use(protect);

// ── Đọc đánh giá theo sản phẩm ────────────────────────────────────────────────
router.get("/", reviewController.getReviews);

// ── Đọc đánh giá theo đơn hàng ────────────────────────────────────────────────
router.get("/order/:orderId", reviewController.getReviewByOrder);

// ── Tạo đánh giá mới – upload tối đa 5 ảnh ───────────────────────────────────
// Không dùng authorize(CUSTOMER) vì quyền sở hữu đã kiểm tra trong reviewService
router.post("/", upload.array("images", 5), reviewController.createReview);

// ── Cập nhật đánh giá ─────────────────────────────────────────────────────────
router.put("/:id", upload.array("images", 5), reviewController.updateReview);

// ── Xóa đánh giá ─────────────────────────────────────────────────────────────
router.delete("/:id", reviewController.deleteReview);

module.exports = router;
