const express = require("express");
const userController = require("./customerController");
const protect = require("../../middlewares/authMiddleware");

const router = express.Router();

router.use(protect);

router.put("/profile", userController.updateProfile);

module.exports = router;
