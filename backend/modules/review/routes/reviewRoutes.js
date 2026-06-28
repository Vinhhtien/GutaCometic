const express = require("express");
const reviewController = require("../controllers/reviewController");
const protect = require("../../../middlewares/authMiddleware");

const router = express.Router();

router.get("/", protect, reviewController.getReviews);

module.exports = router;
