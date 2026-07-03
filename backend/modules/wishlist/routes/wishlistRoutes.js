const express = require("express");
const wishlistController = require("../controllers/wishlistController");
const protect = require("../../../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", wishlistController.getWishlist);
router.post("/toggle", wishlistController.toggleWishlist);

module.exports = router;
