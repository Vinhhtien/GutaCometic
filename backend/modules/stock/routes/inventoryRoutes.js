const express = require("express");
const inventoryController = require("../controllers/inventoryController");
const protect = require("../../../middlewares/authMiddleware");
const { authorize } = require("../../../middlewares/roleMiddleware");
const { USER_ROLES } = require("../../../constants/business");

const router = express.Router();

router.use(protect);

router.get(
  "/products",
  authorize(USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.SALES, USER_ROLES.CUSTOMER),
  inventoryController.getProductInventory
);

router.get(
  "/alerts",
  authorize(USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.SALES),
  inventoryController.getInventoryAlerts
);

router
  .route("/restock-requests")
  .get(
    authorize(USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.SALES),
    inventoryController.getRestockRequests
  )
  .post(
    authorize(USER_ROLES.SALES, USER_ROLES.MANAGER),
    inventoryController.createRestockRequest
  );

router.patch(
  "/restock-requests/:requestId",
  authorize(USER_ROLES.OWNER, USER_ROLES.MANAGER),
  inventoryController.updateRestockRequestStatus
);

router.post(
  "/restock-requests/:requestId/acknowledge",
  authorize(USER_ROLES.OWNER, USER_ROLES.MANAGER),
  inventoryController.acknowledgeRestockRequest
);

router.post(
  "/restock-requests/:requestId/receive",
  authorize(USER_ROLES.OWNER, USER_ROLES.MANAGER),
  inventoryController.receiveRestockRequest
);

router
  .route("/receipts")
  .get(
    authorize(USER_ROLES.OWNER, USER_ROLES.MANAGER),
    inventoryController.getInventoryReceipts
  )
  .post(
    authorize(USER_ROLES.OWNER, USER_ROLES.MANAGER),
    inventoryController.receiveDirectStock
  );

router
  .route("/adjustments")
  .get(
    authorize(USER_ROLES.OWNER, USER_ROLES.MANAGER),
    inventoryController.getInventoryAdjustments
  )
  .post(
    authorize(USER_ROLES.OWNER, USER_ROLES.MANAGER),
    inventoryController.createInventoryAdjustment
  );

router.get(
  "/transfers/incoming",
  authorize(USER_ROLES.OWNER, USER_ROLES.MANAGER),
  inventoryController.getIncomingTransfers
);

router.post(
  "/transfers/:transferId/confirm",
  authorize(USER_ROLES.MANAGER),
  inventoryController.confirmIncomingTransfer
);

module.exports = router;
