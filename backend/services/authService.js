const bcrypt = require("bcryptjs");
const User = require("../models/User");
const OtpChallenge = require("../models/OtpChallenge");
const generateToken = require("../utils/generateToken");
const AppError = require("../utils/AppError");
const otpService = require("./otpService");
const googleAuthService = require("./googleAuthService");
const { runInTransaction } = require("./transactionService");
const { OTP_CHANNELS, OTP_PURPOSES } = require("../constants/auth");
const { USER_ROLES } = require("../constants/business");
const {
  inferIdentifier,
  normalizeEmail,
  normalizePhone,
  requireString,
  validateAddress,
  validateFullName,
  validateOtp,
  validatePassword,
} = require("../utils/authValidation");

const publicUserFields = "-password";

const createAuthResponse = (user) => ({
  user: user.toJSON(),
  token: generateToken(user._id),
});

const maskEmail = (email) => {
  const [name, domain] = email.split("@");
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(3, name.length - visible.length))}@${domain}`;
};

const requestRegistrationOtp = async (payload) => {
  const fullName = validateFullName(payload.fullName);
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  const password = validatePassword(payload.password);
  const address = validateAddress(payload.address);

  if (payload.confirmPassword !== undefined && payload.confirmPassword !== password) {
    throw new AppError(
      "Password confirmation does not match",
      400,
      "PASSWORD_MISMATCH",
      { field: "confirmPassword" }
    );
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { phone }],
  }).lean();

  if (existingUser) {
    throw new AppError(
      existingUser.email === email
        ? "Gmail is already registered"
        : "Phone number is already registered",
      409,
      existingUser.email === email ? "EMAIL_EXISTS" : "PHONE_EXISTS"
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await otpService.createChallenge({
    purpose: OTP_PURPOSES.REGISTER,
    channel: OTP_CHANNELS.EMAIL,
    target: email,
    pendingRegistration: {
      fullName,
      email,
      phone,
      address,
      passwordHash,
    },
  });

  return {
    challengeId: result.challenge._id,
    channel: OTP_CHANNELS.EMAIL,
    deliveryTarget: maskEmail(email),
    expiresIn: result.expiresIn,
    ...(result.developmentOtp
      ? { developmentOtp: result.developmentOtp }
      : {}),
  };
};

const verifyRegistrationOtp = async ({ challengeId, otp }) => {
  const verifiedOtp = validateOtp(otp);
  const challenge = await otpService.verifyChallenge({
    challengeId,
    purpose: OTP_PURPOSES.REGISTER,
    otp: verifiedOtp,
  });

  return runInTransaction(async (session) => {
    const currentChallenge = await OtpChallenge.findOne({
      _id: challenge._id,
      verifiedAt: { $ne: null },
      consumedAt: null,
    })
      .select("+pendingRegistration")
      .session(session);

    if (!currentChallenge?.pendingRegistration) {
      throw new AppError(
        "Registration OTP has already been used",
        409,
        "OTP_ALREADY_USED"
      );
    }

    const pending = currentChallenge.pendingRegistration;
    const duplicate = await User.findOne({
      $or: [{ email: pending.email }, { phone: pending.phone }],
    }).session(session);

    if (duplicate) {
      throw new AppError(
        "Gmail or phone number is already registered",
        409,
        "ACCOUNT_EXISTS"
      );
    }

    const user = new User({
      fullName: pending.fullName,
      email: pending.email,
      phone: pending.phone,
      address: pending.address,
      password: pending.passwordHash,
      emailVerified: true,
      role: USER_ROLES.CUSTOMER,
    });
    user.$locals.passwordAlreadyHashed = true;
    await user.save({ session });

    currentChallenge.consumedAt = new Date();
    currentChallenge.pendingRegistration = undefined;
    await currentChallenge.save({ session });

    return createAuthResponse(user);
  });
};

const login = async ({ identifier, email, password }) => {
  const rawIdentifier = identifier || email;
  const normalizedIdentifier = inferIdentifier(rawIdentifier);
  const enteredPassword = requireString(password, "password");
  const query =
    normalizedIdentifier.type === OTP_CHANNELS.EMAIL
      ? { email: normalizedIdentifier.value }
      : { phone: normalizedIdentifier.value };
  const user = await User.findOne(query).select("+password");

  if (
    !user ||
    !user.password ||
    !(await user.comparePassword(enteredPassword))
  ) {
    throw new AppError(
      "Invalid Gmail/phone or password",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  if (!user.isActive) {
    throw new AppError(
      "This account has been disabled",
      403,
      "ACCOUNT_DISABLED"
    );
  }

  if (
    user.role === USER_ROLES.CUSTOMER &&
    user.emailVerified === false
  ) {
    throw new AppError(
      "Gmail address has not been verified",
      403,
      "EMAIL_NOT_VERIFIED"
    );
  }

  return createAuthResponse(user);
};

const loginWithGoogleIdentity = async ({
  googleId,
  email,
  fullName,
  avatarUrl,
}) => {
  let user = await User.findOne({
    $or: [{ googleId }, { email }],
  });

  if (user) {
    if (!user.isActive) {
      throw new AppError(
        "This account has been disabled",
        403,
        "ACCOUNT_DISABLED"
      );
    }

    if (user.googleId && user.googleId !== googleId) {
      throw new AppError(
        "This Gmail is linked to another Google account",
        409,
        "GOOGLE_ACCOUNT_CONFLICT"
      );
    }

    user.googleId = googleId;
    user.emailVerified = true;
    user.avatarUrl = avatarUrl || user.avatarUrl;
    await user.save();
    return createAuthResponse(user);
  }

  user = await User.create({
    authProvider: "GOOGLE",
    avatarUrl,
    email,
    emailVerified: true,
    fullName,
    googleId,
    role: USER_ROLES.CUSTOMER,
  });

  return createAuthResponse(user);
};

const loginWithGoogle = async ({ idToken }) =>
  loginWithGoogleIdentity(
    await googleAuthService.verifyGoogleIdToken(idToken)
  );

const requestPasswordResetOtp = async ({ identifier }) => {
  const normalizedIdentifier = inferIdentifier(identifier);
  const query =
    normalizedIdentifier.type === OTP_CHANNELS.EMAIL
      ? { email: normalizedIdentifier.value }
      : { phone: normalizedIdentifier.value };
  const user = await User.findOne(query);

  if (!user) {
    throw new AppError(
      "No account was found for this Gmail or phone number",
      404,
      "ACCOUNT_NOT_FOUND"
    );
  }

  const result = await otpService.createChallenge({
    purpose: OTP_PURPOSES.RESET_PASSWORD,
    channel: OTP_CHANNELS.EMAIL,
    target: user.email,
    userId: user._id,
  });

  return {
    challengeId: result.challenge._id,
    channel: OTP_CHANNELS.EMAIL,
    deliveryTarget: maskEmail(user.email),
    expiresIn: result.expiresIn,
    ...(result.developmentOtp
      ? { developmentOtp: result.developmentOtp }
      : {}),
  };
};

const verifyPasswordResetOtp = async ({ challengeId, otp }) => {
  const challenge = await otpService.verifyChallenge({
    challengeId,
    purpose: OTP_PURPOSES.RESET_PASSWORD,
    otp: validateOtp(otp),
  });

  if (!challenge.userId) {
    throw new AppError(
      "Password reset challenge is invalid",
      400,
      "INVALID_RESET_CHALLENGE"
    );
  }

  return {
    resetToken: generateToken.createPasswordResetToken({
      challengeId: challenge._id,
      userId: challenge.userId,
    }),
    expiresIn: 10 * 60,
  };
};

const resetPassword = async ({ resetToken, password, confirmPassword }) => {
  const nextPassword = validatePassword(password);

  if (confirmPassword !== nextPassword) {
    throw new AppError(
      "Password confirmation does not match",
      400,
      "PASSWORD_MISMATCH",
      { field: "confirmPassword" }
    );
  }

  let payload;

  try {
    payload = generateToken.verifyPasswordResetToken(resetToken);
  } catch {
    throw new AppError(
      "Password reset session is invalid or expired",
      401,
      "INVALID_RESET_TOKEN"
    );
  }

  if (payload.purpose !== OTP_PURPOSES.RESET_PASSWORD) {
    throw new AppError(
      "Password reset session is invalid",
      401,
      "INVALID_RESET_TOKEN"
    );
  }

  return runInTransaction(async (session) => {
    const challenge = await OtpChallenge.findOne({
      _id: payload.challengeId,
      userId: payload.userId,
      purpose: OTP_PURPOSES.RESET_PASSWORD,
      verifiedAt: { $ne: null },
      consumedAt: null,
    }).session(session);

    if (!challenge) {
      throw new AppError(
        "Password reset session has already been used or expired",
        409,
        "RESET_ALREADY_USED"
      );
    }

    const user = await User.findById(payload.userId).session(session);

    if (!user) {
      throw new AppError("Account was not found", 404, "ACCOUNT_NOT_FOUND");
    }

    user.password = nextPassword;
    user.passwordChangedAt = new Date();
    user.emailVerified = true;
    await user.save({ session });

    challenge.consumedAt = new Date();
    await challenge.save({ session });

    return { message: "Password has been reset successfully" };
  });
};

const getUserById = (userId) => User.findById(userId).select(publicUserFields);

module.exports = {
  getUserById,
  login,
  loginWithGoogle,
  loginWithGoogleIdentity,
  requestPasswordResetOtp,
  requestRegistrationOtp,
  resetPassword,
  verifyPasswordResetOtp,
  verifyRegistrationOtp,
};
