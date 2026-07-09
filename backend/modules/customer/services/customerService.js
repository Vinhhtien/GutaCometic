const User = require("../../../models/User");
const Order = require("../../../models/Order");
const AppError = require("../../../utils/AppError");
const {
  USER_ROLES,
} = require("../../../constants/business");
const {
  normalizePhone,
  validateAddress,
  validateFullName,
} = require("../../../utils/authValidation");

const searchCustomers = async (query = "") => {
  const keyword = String(query).trim();

  if (keyword.length < 2) {
    return [];
  }

  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escapedKeyword, "i");

  const registeredCustomers = await User.find({
    role: USER_ROLES.CUSTOMER,
    isActive: true,
    $or: [{ fullName: pattern }, { email: pattern }, { phone: pattern }],
  })
    .select("fullName email phone points")
    .sort({ updatedAt: -1 })
    .limit(8)
    .lean();

  const registeredPhones = new Set(
    registeredCustomers
      .map((customer) => customer.phone)
      .filter(Boolean)
      .map(String)
  );

  const guestOrders = await Order.aggregate([
    {
      $match: {
        customerId: null,
        customerPhone: { $regex: pattern },
      },
    },
    { $sort: { updatedAt: -1 } },
    {
      $group: {
        _id: "$customerPhone",
        fullName: { $first: "$customerName" },
        phone: { $first: "$customerPhone" },
        lastOrderAt: { $first: "$updatedAt" },
        orderCount: { $sum: 1 },
      },
    },
    { $limit: 8 },
  ]);

  const guestCustomers = guestOrders
    .filter((guest) => guest.phone && !registeredPhones.has(String(guest.phone)))
    .map((guest) => ({
      _id: `guest:${guest.phone}`,
      email: "",
      fullName: guest.fullName || "Khách vãng lai",
      isGuest: true,
      lastOrderAt: guest.lastOrderAt,
      orderCount: guest.orderCount,
      phone: guest.phone,
      points: 0,
    }));

  return [...registeredCustomers, ...guestCustomers].slice(0, 8);
};

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
  searchCustomers,
  updateProfile,
};
