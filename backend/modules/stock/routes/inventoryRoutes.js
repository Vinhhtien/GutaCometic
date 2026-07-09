const express = require("express");
const inventoryController = require("../controllers/inventoryController");
const protect = require("../../../middlewares/authMiddleware");
const { authorize } = require("../../../middlewares/roleMiddleware");
const { USER_ROLES } = require("../../../constants/business");

const router = express.Router();

router.use(protect);

router.get(
  "/products",
  authorize(USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.SALES),
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

module.exports = router;
