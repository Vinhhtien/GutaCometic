const nodemailer = require("nodemailer");
const AppError = require("../../utils/AppError");
const { OTP_CHANNELS, OTP_PURPOSES } = require("../../constants/auth");

let emailTransporter;

const requireEnvironment = (names, channel) => {
  const missing = names.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new AppError(
      `${channel} OTP delivery is not configured`,
      503,
      "OTP_PROVIDER_NOT_CONFIGURED",
      { missing }
    );
  }
};

const getEmailTransporter = () => {
  requireEnvironment(["SMTP_HOST", "SMTP_USER", "SMTP_PASS"], "Email");

  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || "true") === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return emailTransporter;
};

const getPurposeText = (purpose) =>
  purpose === OTP_PURPOSES.REGISTER
    ? "xac thuc dang ky"
    : "dat lai mat khau";

const sendEmailOtp = async ({ target, otp, purpose }) => {
  const purposeText = getPurposeText(purpose);

  await getEmailTransporter().sendMail({
    from: process.env.OTP_EMAIL_FROM || process.env.SMTP_USER,
    to: target,
    subject: "Ma OTP GUTA Cosmetic",
    text: `Ma OTP de ${purposeText} tai GUTA Cosmetic la ${otp}. Ma co hieu luc trong 5 phut. Khong chia se ma nay voi bat ky ai.`,
    html: [
      "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#18352c\">",
      "<h2>GUTA Cosmetic</h2>",
      `<p>Ma OTP de ${purposeText} cua ban:</p>`,
      `<p style="font-size:30px;font-weight:700;letter-spacing:6px">${otp}</p>`,
      "<p>Ma co hieu luc trong 5 phut. Khong chia se ma nay voi bat ky ai.</p>",
      "</div>",
    ].join(""),
  });
};

const deliverOtp = async ({ channel, target, otp, purpose }) => {
  if (process.env.OTP_MODE === "development") {
    return;
  }

  try {
    if (channel === OTP_CHANNELS.EMAIL) {
      await sendEmailOtp({ target, otp, purpose });
      return;
    }

    throw new Error(`Unsupported OTP channel: ${channel}`);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error(`Unable to deliver ${channel} OTP:`, error.message);
    throw new AppError(
      `Unable to send OTP via ${channel.toLowerCase()}`,
      502,
      "OTP_DELIVERY_FAILED"
    );
  }
};

module.exports = {
  deliverOtp,
};
