const userService = require("../services/customerService");

const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user._id, req.body);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
};
