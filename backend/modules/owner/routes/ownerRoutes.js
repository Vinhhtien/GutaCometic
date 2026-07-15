const express = require("express");
const ownerController = require("../controllers/ownerController");
const protect = require("../../../middlewares/authMiddleware");
const { authorize } = require("../../../middlewares/roleMiddleware");
const { USER_ROLES } = require("../../../constants/business");

const router = express.Router();

router.use(protect);
router.use(authorize(USER_ROLES.OWNER));

router.get("/analytics/revenue", ownerController.getRevenueAnalytics);

router
  .route("/products")
  .get(ownerController.getProducts)
  .post(ownerController.createProduct);

router.patch("/products/:productId", ownerController.updateProduct);

router
  .route("/stores")
  .get(ownerController.getStores)
  .post(ownerController.createStore);

router.patch("/stores/:storeId", ownerController.updateStore);

router
  .route("/staff")
  .get(ownerController.getStaff)
  .post(ownerController.createStaff);

router.patch("/staff/:userId", ownerController.updateStaff);

router
  .route("/transfers")
  .get(ownerController.getTransfers)
  .post(ownerController.createTransfer);

router.patch("/transfers/:transferId/cancel", ownerController.cancelTransfer);

module.exports = router;
