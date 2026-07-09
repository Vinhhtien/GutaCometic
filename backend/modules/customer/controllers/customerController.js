const userService = require("../services/customerService");

const searchCustomers = async (req, res, next) => {
  try {
    const customers = await userService.searchCustomers(req.query.query);
    res.json({ customers });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user._id, req.body);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchCustomers,
  updateProfile,
};
