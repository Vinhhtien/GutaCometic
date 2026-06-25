const productService = require("../services/productService");

const getProducts = async (_req, res, next) => {
  try {
    const products = await productService.getProducts();
    res.json({ products });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
};
