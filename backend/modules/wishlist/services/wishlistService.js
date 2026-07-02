const mongoose = require("mongoose");
const User = require("../../../models/User");
const Product = require("../../../models/Product");
const AppError = require("../../../utils/AppError");

const toggleWishlist = async (userId, productId) => {
  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError("Product ID is invalid", 400, "INVALID_PRODUCT_ID");
  }

  const productExists = await Product.exists({
    _id: productId,
    isActive: true,
  });

  if (!productExists) {
    throw new AppError("Product was not found", 404, "PRODUCT_NOT_FOUND");
  }

  const user = await User.findById(userId).select("wishlist");
  const isLiked = !user.wishlist.some((id) => String(id) === String(productId));

  await User.updateOne(
    { _id: userId },
    isLiked
      ? { $addToSet: { wishlist: productId } }
      : { $pull: { wishlist: productId } }
  );

  return { isLiked, productId };
};

const getWishlist = async (userId) => {
  const user = await User.findById(userId)
    .select("wishlist")
    .populate({ path: "wishlist", match: { isActive: true } })
    .lean();

  return (user?.wishlist || []).filter(Boolean);
};

module.exports = {
  getWishlist,
  toggleWishlist,
};
