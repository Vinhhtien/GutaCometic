const express = require("express");
const storeController = require("../controllers/storeController");
const protect = require("../../../middlewares/authMiddleware");

const router = express.Router();

router.get("/", protect, storeController.getStores);

module.exports = router;
