const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const publicUserFields = "-password";

const createAuthResponse = (user) => ({
  user: user.toJSON(),
  token: generateToken(user._id),
});

const register = async ({ fullName, email, password, phone, address }) => {
  if (!fullName || !email || !password || !phone || !address) {
    const error = new Error(
      "Full name, email, password, phone, and address are required"
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email?.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    const error = new Error("Email is already registered");
    error.statusCode = 409;
    throw error;
  }

  const user = await User.create({
    fullName,
    email: normalizedEmail,
    password,
    phone,
    address,
    role: "CUSTOMER",
  });

  return createAuthResponse(user);
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email?.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error("This account has been disabled");
    error.statusCode = 403;
    throw error;
  }

  return createAuthResponse(user);
};

const getUserById = (userId) => User.findById(userId).select(publicUserFields);

module.exports = {
  getUserById,
  login,
  register,
};
