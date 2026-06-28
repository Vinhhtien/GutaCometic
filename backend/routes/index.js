const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/routes/authRoutes");
const customerRoutes = require("../modules/customer/routes/customerRoutes");
const orderRoutes = require("../modules/order/routes/orderRoutes");
const productRoutes = require("../modules/product/routes/productRoutes");
const reviewRoutes = require("../modules/review/routes/reviewRoutes");
const storeRoutes = require("../modules/store/routes/storeRoutes");

router.use("/auth", authRoutes);
router.use("/users", customerRoutes);
router.use("/orders", orderRoutes);
router.use("/products", productRoutes);
router.use("/reviews", reviewRoutes);
router.use("/stores", storeRoutes);

module.exports = router;
