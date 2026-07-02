const wishlistService = require("../services/wishlistService");

const getWishlist = async (req, res, next) => {
  try {
    const products = await wishlistService.getWishlist(req.user._id);
    res.json({ products });
  } catch (error) {
    next(error);
  }
};

const toggleWishlist = async (req, res, next) => {
  try {
    const result = await wishlistService.toggleWishlist(
      req.user._id,
      req.body.productId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  toggleWishlist,
};
