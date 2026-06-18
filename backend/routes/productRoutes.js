const express = require("express");
const productController = require("../controllers/productController");
const protect = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", protect, productController.getProducts);

module.exports = router;
