const express = require("express");
const productController = require("./productController");
const protect = require("../../middlewares/authMiddleware");

const router = express.Router();

router.get("/", protect, productController.getProducts);

module.exports = router;
