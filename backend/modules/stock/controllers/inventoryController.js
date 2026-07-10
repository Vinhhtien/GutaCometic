const inventoryService = require("../services/inventoryQueryService");

const getProductInventory = async (req, res, next) => {
  try {
    const products = await inventoryService.getProductInventory({
      brand: req.query.brand,
      category: req.query.category,
      limit: req.query.limit,
      productIds: req.query.productIds,
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

const acknowledgeRestockRequest = async (req, res, next) => {
  try {
    const request = await inventoryService.acknowledgeRestockRequest({
      requestId: req.params.requestId,
      user: req.user,
    });

    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const receiveRestockRequest = async (req, res, next) => {
  try {
    const request = await inventoryService.receiveRestockRequest({
      managerNote: req.body.managerNote,
      receivedQuantity: req.body.receivedQuantity,
      requestId: req.params.requestId,
      user: req.user,
    });

    res.json({ request });
  } catch (error) {
    next(error);
  }
};

const receiveDirectStock = async (req, res, next) => {
  try {
    const receipt = await inventoryService.receiveDirectStock({
      note: req.body.note,
      productId: req.body.productId,
      quantity: req.body.quantity,
      storeId: req.body.storeId,
      user: req.user,
    });

    res.status(201).json({ receipt });
  } catch (error) {
    next(error);
  }
};

const createInventoryAdjustment = async (req, res, next) => {
  try {
    const adjustment = await inventoryService.createInventoryAdjustment({
      note: req.body.note,
      productId: req.body.productId,
      quantity: req.body.quantity,
      storeId: req.body.storeId,
      type: req.body.type,
      user: req.user,
    });

    res.status(201).json({ adjustment });
  } catch (error) {
    next(error);
  }
};

const getInventoryAdjustments = async (req, res, next) => {
  try {
    const adjustments = await inventoryService.getInventoryAdjustments({
      storeId: req.query.storeId,
      user: req.user,
    });

    res.json({ adjustments });
  } catch (error) {
    next(error);
  }
};

const getInventoryReceipts = async (req, res, next) => {
  try {
    const receipts = await inventoryService.getInventoryReceipts({
      storeId: req.query.storeId,
      user: req.user,
    });
    res.json({ receipts });
  } catch (error) {
    next(error);
  }
};

const getIncomingTransfers = async (req, res, next) => {
  try {
    const transfers = await inventoryService.getIncomingTransfers({
      storeId: req.query.storeId,
      user: req.user,
    });

    res.json({ transfers });
  } catch (error) {
    next(error);
  }
};

const confirmIncomingTransfer = async (req, res, next) => {
  try {
    const transfer = await inventoryService.confirmIncomingTransfer({
      transferId: req.params.transferId,
      user: req.user,
    });

    res.json({ transfer });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  acknowledgeRestockRequest,
  confirmIncomingTransfer,
  createInventoryAdjustment,
  createRestockRequest,
  getIncomingTransfers,
  getInventoryAdjustments,
  getInventoryReceipts,
  getInventoryAlerts,
  getProductInventory,
  getRestockRequests,
  receiveDirectStock,
  receiveRestockRequest,
  updateRestockRequestStatus,
};
