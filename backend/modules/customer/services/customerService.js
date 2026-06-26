const User = require("../../../models/User");
const AppError = require("../../../utils/AppError");
const {
  normalizePhone,
  validateAddress,
  validateFullName,
} = require("../../../utils/authValidation");

const updateProfile = async (userId, payload) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("Account was not found", 404, "ACCOUNT_NOT_FOUND");
  }

  if (payload.fullName !== undefined) {
    user.fullName = validateFullName(payload.fullName);
  }

  if (payload.address !== undefined) {
    user.address = validateAddress(payload.address);
  }

  if (payload.phone !== undefined) {
    const phone = normalizePhone(payload.phone);
    const existingUser = await User.findOne({
      phone,
      _id: { $ne: user._id },
    }).lean();

    if (existingUser) {
      throw new AppError(
        "Phone number is already registered",
        409,
        "PHONE_EXISTS"
      );
    }

    user.phone = phone;
  }

  await user.save();

  return user.toJSON();
};

module.exports = {
  updateProfile,
};
