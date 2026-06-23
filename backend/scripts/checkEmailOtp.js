require("dotenv").config();

const nodemailer = require("nodemailer");

const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"];

const main = async () => {
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing email configuration: ${missing.join(", ")}`);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.verify();
  await transporter.sendMail({
    from: process.env.OTP_EMAIL_FROM || process.env.SMTP_USER,
    to: process.env.SMTP_USER,
    subject: "GUTA Cosmetic - Email OTP configuration",
    text: "Gmail SMTP has been configured successfully for GUTA Cosmetic OTP.",
  });

  console.log("Gmail SMTP is ready. A configuration email was sent.");
};

main().catch((error) => {
  console.error(`Gmail SMTP check failed: ${error.message}`);
  process.exitCode = 1;
});
