const Product = require("../../../models/Product");
const InventoryRequest = require("../../../models/InventoryRequest");
const Store = require("../../../models/Store");
const StoreInventory = require("../../../models/StoreInventory");
const AppError = require("../../../utils/AppError");
const { USER_ROLES } = require("../../../constants/business");

const LOW_STOCK_WARNING_THRESHOLD = 10;
const EXPIRY_WARNING_DAYS = 60;
const UNIVERSAL_SKIN_TYPE = "Da thường/Mọi loại da";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildProductQuery = ({ brand, category, search, skinType } = {}) => {
  const query = { isActive: true };

  if (search) {
    const pattern = { $regex: escapeRegExp(search), $options: "i" };
    query.$or = [{ name: pattern }, { sku: pattern }, { brand: pattern }];
  }

  if (brand) {
    query.brand = brand;
  }

  if (skinType) {
    query.skinTypes = { $in: [skinType, UNIVERSAL_SKIN_TYPE] };
  }

  if (category) {
    query.category = category;
  }

  return query;
};

const getProductInventory = async (filters = {}) => {
  const [products, stores] = await Promise.all([
    Product.find(buildProductQuery(filters)).sort({ createdAt: -1 }).lean(),
    Store.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);

  if (products.length === 0) {
    return [];
  }

  const inventories = await StoreInventory.find({
    productId: { $in: products.map((product) => product._id) },
    storeId: { $in: stores.map((store) => store._id) },
  }).lean();

  const inventoryByProductStore = new Map(
    inventories.map((inventory) => [
      `${inventory.productId}:${inventory.storeId}`,
      inventory,
    ])
  );

  return products.map((product) => ({
    product,
    inventories: stores.map((store) => {
      const inventory = inventoryByProductStore.get(
        `${product._id}:${store._id}`
      );

      return {
        store: {
          _id: store._id,
          name: store.name,
          address: store.address,
          phone: store.phone,
          type: store.type,
        },
        totalStock: inventory?.totalStock || 0,
        reservedStock: inventory?.reservedStock || 0,
        availableStock: inventory?.availableStock || 0,
        expiryDate: inventory?.expiryDate || null,
        lowStockThreshold: inventory?.lowStockThreshold || 5,
      };
    }),
  }));
};

const getScopedStoreId = (user, requestedStoreId) => {
  if (user.role === USER_ROLES.OWNER) {
    return requestedStoreId || null;
  }

  return String(user.storeId);
};

const getInventoryAlerts = async ({ storeId, user }) => {
  const scopedStoreId = getScopedStoreId(user, storeId);
  const expiresBefore = new Date(
    Date.now() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000
  );
  const query = {};

  if (scopedStoreId) {
    query.storeId = scopedStoreId;
  }

  const inventories = await StoreInventory.find(query)
    .populate("storeId", "name address phone type")
    .populate("productId", "name sku brand category image price")
    .sort({ availableStock: 1, expiryDate: 1 })
    .lean();

  return inventories.flatMap((inventory) => {
    const alerts = [];
    const threshold = Math.max(
      Number(inventory.lowStockThreshold || 0),
      LOW_STOCK_WARNING_THRESHOLD
    );

    if (inventory.availableStock < threshold) {
      alerts.push({
        type: "LOW_STOCK",
        severity: inventory.availableStock <= 0 ? "CRITICAL" : "WARNING",
        message:
          inventory.availableStock <= 0
            ? "Sản phẩm đã hết hàng tại chi nhánh"
            : `Sản phẩm còn dưới ${threshold} sản phẩm khả dụng`,
        inventoryId: inventory._id,
        store: inventory.storeId,
        product: inventory.productId,
        totalStock: inventory.totalStock,
        reservedStock: inventory.reservedStock,
        availableStock: inventory.availableStock,
        lowStockThreshold: threshold,
        expiryDate: inventory.expiryDate,
      });
    }

    if (inventory.expiryDate && inventory.expiryDate <= expiresBefore) {
      const isExpired = inventory.expiryDate.getTime() < Date.now();

      alerts.push({
        type: isExpired ? "EXPIRED" : "EXPIRING_SOON",
        severity: isExpired ? "CRITICAL" : "WARNING",
        message: isExpired
          ? "Sản phẩm đã quá hạn sử dụng"
          : `Sản phẩm sắp hết hạn trong ${EXPIRY_WARNING_DAYS} ngày`,
        inventoryId: inventory._id,
        store: inventory.storeId,
        product: inventory.productId,
        totalStock: inventory.totalStock,
        reservedStock: inventory.reservedStock,
        availableStock: inventory.availableStock,
        lowStockThreshold: threshold,
        expiryDate: inventory.expiryDate,
      });
    }

    return alerts;
  });
};

const populateInventoryRequest = (request) =>
  request.populate([
    { path: "storeId", select: "name address phone type" },
    { path: "productId", select: "name sku brand category image price" },
    { path: "requestedBy", select: "fullName email phone role" },
    { path: "handledBy", select: "fullName email phone role" },
  ]);

const createRestockRequest = async ({
  productId,
  reason,
  requestedQuantity,
  storeId,
  user,
}) => {
  const scopedStoreId = getScopedStoreId(user, storeId);

  if (!scopedStoreId) {
    throw new AppError("Store ID is required", 400, "STORE_ID_REQUIRED");
  }

  if (!productId) {
    throw new AppError("Product ID is required", 400, "PRODUCT_ID_REQUIRED");
  }

  const quantity = Number(requestedQuantity);

  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new AppError(
      "Requested quantity must be greater than zero",
      400,
      "INVALID_REQUESTED_QUANTITY"
    );
  }

  const inventory = await StoreInventory.findOne({
    productId,
    storeId: scopedStoreId,
  }).lean();

  if (!inventory) {
    throw new AppError("Inventory item was not found", 404, "INVENTORY_NOT_FOUND");
  }

  const existingOpenRequest = await InventoryRequest.findOne({
    productId,
    storeId: scopedStoreId,
    status: "OPEN",
  });

  if (existingOpenRequest) {
    existingOpenRequest.requestedQuantity = Math.max(
      existingOpenRequest.requestedQuantity,
      quantity
    );
    existingOpenRequest.reason = reason || existingOpenRequest.reason;
    existingOpenRequest.currentAvailableStock = inventory.availableStock;
    await existingOpenRequest.save();

    return populateInventoryRequest(existingOpenRequest);
  }

  const request = await InventoryRequest.create({
    storeId: scopedStoreId,
    productId,
    requestedBy: user._id,
    currentAvailableStock: inventory.availableStock,
    requestedQuantity: quantity,
    reason: reason || "Sales đề xuất bổ sung hàng cho sản phẩm này",
  });

  return populateInventoryRequest(request);
};

const getRestockRequests = async ({ status = "OPEN", storeId, user }) => {
  const scopedStoreId = getScopedStoreId(user, storeId);
  const query = {};

  if (scopedStoreId) {
    query.storeId = scopedStoreId;
  }

  if (status && status !== "ALL") {
    query.status = status;
  }

  return InventoryRequest.find(query)
    .populate("storeId", "name address phone type")
    .populate("productId", "name sku brand category image price")
    .populate("requestedBy", "fullName email phone role")
    .populate("handledBy", "fullName email phone role")
    .sort({ status: 1, createdAt: -1 })
    .lean();
};

const updateRestockRequestStatus = async ({
  managerNote,
  requestId,
  status,
  user,
}) => {
  if (!["RESOLVED", "CANCELLED"].includes(status)) {
    throw new AppError("Invalid request status", 400, "INVALID_REQUEST_STATUS");
  }

  const request = await InventoryRequest.findById(requestId);

  if (!request) {
    throw new AppError("Restock request was not found", 404, "REQUEST_NOT_FOUND");
  }

  if (
    user.role !== USER_ROLES.OWNER &&
    String(request.storeId) !== String(user.storeId)
  ) {
    throw new AppError("You cannot update another store request", 403, "FORBIDDEN");
  }

  request.status = status;
  request.managerNote = managerNote || "";
  request.handledBy = user._id;
  request.resolvedAt = new Date();

  await request.save();

  return populateInventoryRequest(request);
};

module.exports = {
  createRestockRequest,
  getInventoryAlerts,
  getProductInventory,
  getRestockRequests,
  updateRestockRequestStatus,
};
