const Product = require("../models/Product");

const getProducts = () =>
  Product.find({ isActive: true }).sort({ createdAt: -1 }).lean();

module.exports = {
  getProducts,
};
