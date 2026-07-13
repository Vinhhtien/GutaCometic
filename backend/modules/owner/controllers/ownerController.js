const ownerService = require("../services/ownerService");

const getProducts = async (req, res, next) => {
  try {
    const products = await ownerService.getManagedProducts({
      category: req.query.category,
      includeInactive: req.query.includeInactive === "true",
      search: req.query.search,
    });

    res.json({ products });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const product = await ownerService.createManagedProduct(req.body);
    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await ownerService.updateManagedProduct(
      req.params.productId,
      req.body
    );
    res.json({ product });
  } catch (error) {
    next(error);
  }
};

const getStores = async (req, res, next) => {
  try {
    const stores = await ownerService.getManagedStores({
      includeInactive: req.query.includeInactive === "true",
    });
    res.json({ stores });
  } catch (error) {
    next(error);
  }
};

const createStore = async (req, res, next) => {
  try {
    const store = await ownerService.createManagedStore(req.body);
    res.status(201).json({ store });
  } catch (error) {
    next(error);
  }
};

const updateStore = async (req, res, next) => {
  try {
    const store = await ownerService.updateManagedStore(req.params.storeId, req.body);
    res.json({ store });
  } catch (error) {
    next(error);
  }
};

const getStaff = async (req, res, next) => {
  try {
    const staff = await ownerService.getManagedStaff({
      includeInactive: req.query.includeInactive === "true",
    });
    res.json({ staff });
  } catch (error) {
    next(error);
  }
};

const createStaff = async (req, res, next) => {
  try {
    const staff = await ownerService.createManagedStaff(req.body);
    res.status(201).json({ staff });
  } catch (error) {
    next(error);
  }
};

const updateStaff = async (req, res, next) => {
  try {
    const staff = await ownerService.updateManagedStaff(
      req.user,
      req.params.userId,
      req.body
    );
    res.json({ staff });
  } catch (error) {
    next(error);
  }
};

const getTransfers = async (req, res, next) => {
  try {
    const transfers = await ownerService.getStockTransfers({
      status: req.query.status,
      storeId: req.query.storeId,
    });
    res.json({ transfers });
  } catch (error) {
    next(error);
  }
};

const createTransfer = async (req, res, next) => {
  try {
    const transfer = await ownerService.createStockTransfer(req.body, req.user);
    res.status(201).json({ transfer });
  } catch (error) {
    next(error);
  }
};

const cancelTransfer = async (req, res, next) => {
  try {
    const transfer = await ownerService.cancelStockTransfer(req.params.transferId);
    res.json({ transfer });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  cancelTransfer,
  createProduct,
  createStaff,
  createStore,
  createTransfer,
  getProducts,
  getStaff,
  getStores,
  getTransfers,
  updateProduct,
  updateStaff,
  updateStore,
};
