export type FieldErrors = Record<string, string>;

const gmailPattern = /^[a-z0-9._%+-]+@gmail\.com$/i;
const phonePattern = /^(?:\+84|0)(3|5|7|8|9)\d{8}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

export const validateRegistration = (values: {
  address: string;
  confirmPassword: string;
  email: string;
  fullName: string;
  password: string;
  phone: string;
}) => {
  const errors: FieldErrors = {};

  if (values.fullName.trim().length < 2) {
    errors.fullName = "Enter at least 2 characters.";
  }
  if (!gmailPattern.test(values.email.trim())) {
    errors.email = "Use a valid @gmail.com address.";
  }
  if (!phonePattern.test(values.phone.replace(/[\s().-]/g, ""))) {
    errors.phone = "Use a valid Vietnamese mobile number.";
  }
  if (!passwordPattern.test(values.password)) {
    errors.password =
      "Use 8+ characters with uppercase, lowercase and a number.";
  }
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }
  if (values.address.trim().length < 5) {
    errors.address = "Address must contain at least 5 characters.";
  }

  return errors;
};

export const validateLoginIdentifier = (value: string) => {
  const identifier = value.trim();

  if (identifier.includes("@")) {
    return gmailPattern.test(identifier)
      ? ""
      : "Enter a valid @gmail.com address.";
  }

  return phonePattern.test(identifier.replace(/[\s().-]/g, ""))
    ? ""
    : "Enter a valid Gmail or Vietnamese phone number.";
};

export const validateOtp = (value: string) =>
  /^\d{6}$/.test(value) ? "" : "OTP must contain exactly 6 digits.";

export const validateNewPassword = (
  password: string,
  confirmPassword: string
) => {
  const errors: FieldErrors = {};

  if (!passwordPattern.test(password)) {
    errors.password =
      "Use 8+ characters with uppercase, lowercase and a number.";
  }
  if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
};
