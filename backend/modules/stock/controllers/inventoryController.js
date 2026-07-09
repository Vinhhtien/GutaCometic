const inventoryService = require("../services/inventoryQueryService");

const getProductInventory = async (req, res, next) => {
  try {
    const products = await inventoryService.getProductInventory({
      brand: req.query.brand,
      category: req.query.category,
      search: req.query.search,
      skinType: req.query.skinType,
    });

    res.json({ products });
  } catch (error) {
    next(error);
  }
};

const getInventoryAlerts = async (req, res, next) => {
  try {
    const alerts = await inventoryService.getInventoryAlerts({
      storeId: req.query.storeId,
      user: req.user,
    });

    res.json({ alerts });
  } catch (error) {
    next(error);
  }
};

const createRestockRequest = async (req, res, next) => {
  try {
    const request = await inventoryService.createRestockRequest({
      productId: req.body.productId,
      reason: req.body.reason,
      requestedQuantity: req.body.requestedQuantity,
      storeId: req.body.storeId,
      user: req.user,
    });

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
};

const getRestockRequests = async (req, res, next) => {
  try {
    const requests = await inventoryService.getRestockRequests({
      status: req.query.status,
      storeId: req.query.storeId,
      user: req.user,
    });

    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

const updateRestockRequestStatus = async (req, res, next) => {
  try {
    const request = await inventoryService.updateRestockRequestStatus({
      managerNote: req.body.managerNote,
      requestId: req.params.requestId,
      status: req.body.status,
      user: req.user,
    });

    res.json({ request });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRestockRequest,
  getInventoryAlerts,
  getProductInventory,
  getRestockRequests,
  updateRestockRequestStatus,
};
