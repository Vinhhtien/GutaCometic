const crypto = require("crypto");
const OtpChallenge = require("../../../models/OtpChallenge");
const AppError = require("../../../utils/AppError");
const { deliverOtp } = require("./otpDeliveryService");
const {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_REQUESTS_PER_HOUR,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
} = require("../../../constants/auth");

const getOtpSecret = () =>
  process.env.OTP_SECRET || process.env.JWT_SECRET || "development-otp-secret";

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const hashOtp = (challengeId, otp) =>
  crypto
    .createHmac("sha256", getOtpSecret())
    .update(`${challengeId}:${otp}`)
    .digest("hex");

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const assertRequestAllowed = async (target, purpose) => {
  const latest = await OtpChallenge.findOne({ target, purpose }).sort({
    createdAt: -1,
  });
  const now = Date.now();

  if (
    latest &&
    now - latest.createdAt.getTime() <
      OTP_RESEND_COOLDOWN_SECONDS * 1000
  ) {
    throw new AppError(
      `Please wait ${OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting another OTP`,
      429,
      "OTP_RESEND_COOLDOWN"
    );
  }

  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const recentCount = await OtpChallenge.countDocuments({
    target,
    purpose,
    createdAt: { $gte: oneHourAgo },
  });

  if (recentCount >= OTP_MAX_REQUESTS_PER_HOUR) {
    throw new AppError(
      "Too many OTP requests. Try again later.",
      429,
      "OTP_RATE_LIMITED"
    );
  }
};

const createChallenge = async ({
  purpose,
  channel,
  target,
  userId = null,
  pendingRegistration = null,
}) => {
  await assertRequestAllowed(target, purpose);

  const challenge = new OtpChallenge({
    purpose,
    channel,
    target,
    userId,
    codeHash: "pending",
    pendingRegistration,
    expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
  });
  const otp = generateOtp();

  challenge.codeHash = hashOtp(challenge._id, otp);
  await challenge.save();

  try {
    await deliverOtp({ channel, target, otp, purpose });
  } catch (error) {
    await OtpChallenge.deleteOne({ _id: challenge._id });
    throw error;
  }

  return {
    challenge,
    developmentOtp:
      process.env.OTP_MODE === "development" ? otp : undefined,
    expiresIn: OTP_TTL_SECONDS,
  };
};

const verifyChallenge = async ({ challengeId, purpose, otp }) => {
  const challenge = await OtpChallenge.findOne({
    _id: challengeId,
    purpose,
  }).select("+codeHash +pendingRegistration");

  if (!challenge) {
    throw new AppError("OTP challenge was not found", 404, "OTP_NOT_FOUND");
  }

  if (challenge.consumedAt) {
    throw new AppError("OTP has already been used", 409, "OTP_ALREADY_USED");
  }

  if (challenge.verifiedAt) {
    return challenge;
  }

  if (challenge.expiresAt.getTime() <= Date.now()) {
    throw new AppError("OTP has expired", 410, "OTP_EXPIRED");
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError(
      "Too many incorrect OTP attempts",
      429,
      "OTP_ATTEMPTS_EXCEEDED"
    );
  }

  const isValid = safeCompare(
    challenge.codeHash,
    hashOtp(challenge._id, otp)
  );

  if (!isValid) {
    challenge.attempts += 1;
    await challenge.save();
    throw new AppError("OTP is incorrect", 400, "OTP_INCORRECT", {
      attemptsRemaining: OTP_MAX_ATTEMPTS - challenge.attempts,
    });
  }

  challenge.verifiedAt = new Date();
  await challenge.save();
  return challenge;
};

module.exports = {
  createChallenge,
  verifyChallenge,
};
