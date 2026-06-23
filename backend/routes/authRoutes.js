const express = require("express");
const authController = require("../controllers/authController");
const protect = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register/request-otp", authController.requestRegistrationOtp);
router.post("/register/verify-otp", authController.verifyRegistrationOtp);
router.post("/login", authController.login);
router.post("/google", authController.loginWithGoogle);
router.post(
  "/password/forgot/request-otp",
  authController.requestPasswordResetOtp
);
router.post(
  "/password/forgot/verify-otp",
  authController.verifyPasswordResetOtp
);
router.post("/password/reset", authController.resetPassword);
router.get("/me", protect, authController.me);

module.exports = router;
