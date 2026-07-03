const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/routes/authRoutes");
const customerRoutes = require("../modules/customer/routes/customerRoutes");
const orderRoutes = require("../modules/order/routes/orderRoutes");
const paymentRoutes = require("../modules/payment/routes/paymentRoutes");
const productRoutes = require("../modules/product/routes/productRoutes");
const reviewRoutes = require("../modules/review/routes/reviewRoutes");
const storeRoutes = require("../modules/store/routes/storeRoutes");
const wishlistRoutes = require("../modules/wishlist/routes/wishlistRoutes");

router.use("/auth", authRoutes);
router.use("/users", customerRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/products", productRoutes);
router.use("/reviews", reviewRoutes);
router.use("/stores", storeRoutes);
router.use("/wishlist", wishlistRoutes);

module.exports = router;
