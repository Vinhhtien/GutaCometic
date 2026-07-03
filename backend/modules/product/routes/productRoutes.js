const express = require("express");
const productController = require("../controllers/productController");
const protect = require("../../../middlewares/authMiddleware");

const router = express.Router();

router.get("/", protect, productController.getProducts);
router.get("/:id", protect, productController.getProductDetail);

module.exports = router;
