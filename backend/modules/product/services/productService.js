const mongoose = require("mongoose");
const Product = require("../../../models/Product");
const AppError = require("../../../utils/AppError");

const UNIVERSAL_SKIN_TYPE = "Da thường/Mọi loại da";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getProducts = ({ search, skinType, category } = {}) => {
  const query = { isActive: true };

  if (search) {
    query.name = { $regex: escapeRegExp(search), $options: "i" };
  }

  if (skinType) {
    query.skinTypes = { $in: [skinType, UNIVERSAL_SKIN_TYPE] };
  }

  if (category) {
    query.category = category;
  }

  return Product.find(query).sort({ createdAt: -1 }).lean();
};

const getProductById = async (productId) => {
  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError("Product ID is invalid", 400, "INVALID_PRODUCT_ID");
  }

  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  }).lean();

  if (!product) {
    throw new AppError("Product was not found", 404, "PRODUCT_NOT_FOUND");
  }

  return product;
};

module.exports = {
  getProductById,
  getProducts,
};
