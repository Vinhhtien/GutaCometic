const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

generateToken.createPasswordResetToken = ({ challengeId, userId }) =>
  jwt.sign(
    {
      challengeId,
      purpose: "RESET_PASSWORD",
      userId,
    },
    process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

generateToken.verifyPasswordResetToken = (token) =>
  jwt.verify(
    token,
    process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET
  );

module.exports = generateToken;
