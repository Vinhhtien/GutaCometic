const express = require("express");
const paymentController = require("../controllers/paymentController");
const protect = require("../../../middlewares/authMiddleware");
const { authorize } = require("../../../middlewares/roleMiddleware");
const { USER_ROLES } = require("../../../constants/business");

const router = express.Router();

router.post("/payos/webhook", paymentController.handlePayosWebhook);
router.get("/payos/return", paymentController.payosReturn);
router.get("/payos/cancel", paymentController.payosReturn);

router.use(protect);

router.post(
  "/payos/orders/:orderId/create-link",
  authorize(USER_ROLES.CUSTOMER),
  paymentController.createPayosPaymentLink
);
router.get(
  "/payos/orders/:orderId/link",
  authorize(USER_ROLES.CUSTOMER),
  paymentController.createPayosPaymentLink
);
router.post(
  "/payos/orders/:orderId/sync",
  authorize(USER_ROLES.CUSTOMER),
  paymentController.syncPayosPaymentStatus
);

module.exports = router;
