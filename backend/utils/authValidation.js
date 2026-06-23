const AppError = require("./AppError");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GMAIL_PATTERN = /^[a-z0-9._%+-]+@gmail\.com$/i;
const VIETNAM_PHONE_PATTERN = /^(?:\+84|0)(3|5|7|8|9)\d{8}$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

const requireString = (value, fieldName) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(
      `${fieldName} is required`,
      400,
      "VALIDATION_ERROR",
      { field: fieldName }
    );
  }

  return value.trim();
};

const normalizeEmail = (value, { gmailOnly = true } = {}) => {
  const email = requireString(value, "email").toLowerCase();

  if (!EMAIL_PATTERN.test(email) || (gmailOnly && !GMAIL_PATTERN.test(email))) {
    throw new AppError(
      gmailOnly
        ? "A valid Gmail address is required"
        : "Email address is invalid",
      400,
      "INVALID_EMAIL",
      { field: "email" }
    );
  }

  return email;
};

const normalizePhone = (value) => {
  const phone = requireString(value, "phone").replace(/[\s().-]/g, "");

  if (!VIETNAM_PHONE_PATTERN.test(phone)) {
    throw new AppError(
      "Phone must be a valid Vietnamese mobile number",
      400,
      "INVALID_PHONE",
      { field: "phone" }
    );
  }

  return phone.startsWith("0") ? `+84${phone.slice(1)}` : phone;
};

const validatePassword = (value) => {
  const password = requireString(value, "password");

  if (!PASSWORD_PATTERN.test(password)) {
    throw new AppError(
      "Password must be 8-72 characters and include uppercase, lowercase, and a number",
      400,
      "WEAK_PASSWORD",
      { field: "password" }
    );
  }

  return password;
};

const validateFullName = (value) => {
  const fullName = requireString(value, "fullName");

  if (fullName.length < 2 || fullName.length > 80) {
    throw new AppError(
      "Full name must be between 2 and 80 characters",
      400,
      "INVALID_FULL_NAME",
      { field: "fullName" }
    );
  }

  return fullName;
};

const validateAddress = (value) => {
  const address = requireString(value, "address");

  if (address.length < 5 || address.length > 250) {
    throw new AppError(
      "Address must be between 5 and 250 characters",
      400,
      "INVALID_ADDRESS",
      { field: "address" }
    );
  }

  return address;
};

const validateOtp = (value) => {
  const otp = requireString(value, "otp");

  if (!/^\d{6}$/.test(otp)) {
    throw new AppError(
      "OTP must contain exactly 6 digits",
      400,
      "INVALID_OTP_FORMAT",
      { field: "otp" }
    );
  }

  return otp;
};

const inferIdentifier = (value) => {
  const identifier = requireString(value, "identifier");

  if (identifier.includes("@")) {
    return {
      type: "EMAIL",
      value: normalizeEmail(identifier),
    };
  }

  return {
    type: "PHONE",
    value: normalizePhone(identifier),
  };
};

module.exports = {
  inferIdentifier,
  normalizeEmail,
  normalizePhone,
  requireString,
  validateAddress,
  validateFullName,
  validateOtp,
  validatePassword,
};
