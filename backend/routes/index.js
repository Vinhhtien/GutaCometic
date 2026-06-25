const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/authRoutes");
const customerRoutes = require("../modules/customer/customerRoutes");
const orderRoutes = require("../modules/order/orderRoutes");
const productRoutes = require("../modules/product/productRoutes");

router.use("/auth", authRoutes);
router.use("/users", customerRoutes);
router.use("/orders", orderRoutes);
router.use("/products", productRoutes);

module.exports = router;
