const mongoose = require("mongoose");
const { OTP_CHANNELS, OTP_PURPOSES } = require("../constants/auth");

const pendingRegistrationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    passwordHash: { type: String, required: true },
  },
  { _id: false }
);

const otpChallengeSchema = new mongoose.Schema(
  {
    purpose: {
      type: String,
      enum: Object.values(OTP_PURPOSES),
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(OTP_CHANNELS),
      required: true,
    },
    target: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    codeHash: {
      type: String,
      required: true,
      select: false,
    },
    pendingRegistration: {
      type: pendingRegistrationSchema,
      default: null,
      select: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

otpChallengeSchema.index({ target: 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.model("OtpChallenge", otpChallengeSchema);
