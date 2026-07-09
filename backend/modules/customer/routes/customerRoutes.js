const express = require("express");
const userController = require("../controllers/customerController");
const protect = require("../../../middlewares/authMiddleware");
const { authorize } = require("../../../middlewares/roleMiddleware");
const { USER_ROLES } = require("../../../constants/business");

const router = express.Router();

router.use(protect);

router.get(
  "/search",
  authorize(USER_ROLES.SALES, USER_ROLES.MANAGER),
  userController.searchCustomers
);
router.put("/profile", userController.updateProfile);

module.exports = router;
