const express = require("express");
const orderController = require("./orderController");
const protect = require("../../middlewares/authMiddleware");
const {
  authorize,
  requireAssignedStore,
} = require("../../middlewares/roleMiddleware");
const { USER_ROLES } = require("../../constants/business");

const router = express.Router();

router.use(protect);

router.get("/", orderController.getOrders);
router.post(
  "/online",
  authorize(USER_ROLES.CUSTOMER),
  orderController.createOnlineOrder
);
router.post(
  "/offline",
  authorize(USER_ROLES.SALES),
  requireAssignedStore,
  orderController.createOfflineOrder
);
router.patch(
  "/:orderId/approve",
  authorize(USER_ROLES.SALES),
  requireAssignedStore,
  orderController.approveOfflineOrder
);
router.patch(
  "/:orderId/pay",
  authorize(USER_ROLES.MANAGER),
  requireAssignedStore,
  orderController.payOfflineOrder
);
router.patch(
  "/:orderId/online-status",
  authorize(USER_ROLES.MANAGER),
  requireAssignedStore,
  orderController.updateOnlineStatus
);
router.patch("/:orderId/cancel", orderController.cancelOrder);

module.exports = router;
