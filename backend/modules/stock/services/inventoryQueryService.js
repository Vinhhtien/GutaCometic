const Product = require("../../../models/Product");
const InventoryAdjustment = require("../../../models/InventoryAdjustment");
const InventoryReceipt = require("../../../models/InventoryReceipt");
const InventoryRequest = require("../../../models/InventoryRequest");
const Store = require("../../../models/Store");
const StoreInventory = require("../../../models/StoreInventory");
const StockTransfer = require("../../../models/StockTransfer");
const AppError = require("../../../utils/AppError");
const { USER_ROLES } = require("../../../constants/business");
const inventoryMutationService = require("./inventoryService");
const { runInTransaction } = require("./transactionService");

const LOW_STOCK_WARNING_THRESHOLD = 10;
const EXPIRY_WARNING_DAYS = 60;
const MAX_STOCK_RECEIVE_QUANTITY = 1000;
const UNIVERSAL_SKIN_TYPE = "Da thường/Mọi loại da";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildProductQuery = ({ brand, category, productIds, search, skinType } = {}) => {
  const query = { isActive: true };

  if (productIds) {
    const ids = String(productIds)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (ids.length > 0) {
      query._id = { $in: ids };
    }
  }

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
  const parsedLimit = Number.parseInt(filters.limit, 10);
  const normalizedLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : null;
  const productQuery = Product.find(buildProductQuery(filters)).sort({
    createdAt: -1,
  });

  if (normalizedLimit) {
    productQuery.limit(normalizedLimit);
  }

  const [products, stores] = await Promise.all([
    productQuery.lean(),
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

const ensureStoreCanProcessInventoryMutation = async ({
  allowOwnerOnBranch = false,
  storeId,
  user,
}) => {
  const store = await Store.findById(storeId).lean();

  if (!store) {
    throw new AppError("Store was not found", 404, "STORE_NOT_FOUND");
  }

  if (!store.isActive) {
    throw new AppError("Store is inactive", 409, "STORE_INACTIVE");
  }

  if (
    user.role === USER_ROLES.OWNER &&
    !allowOwnerOnBranch &&
    store.type !== "CENTRAL"
  ) {
    throw new AppError(
      "Owner can only update stock directly in the central warehouse",
      403,
      "OWNER_BRANCH_STOCK_MUTATION_FORBIDDEN"
    );
  }

  return store;
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
    { path: "acknowledgedBy", select: "fullName email phone role" },
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

const acknowledgeRestockRequest = async ({ requestId, user }) => {
  const request = await InventoryRequest.findById(requestId);

  if (!request) {
    throw new AppError("Restock request was not found", 404, "REQUEST_NOT_FOUND");
  }

  if (
    user.role !== USER_ROLES.OWNER &&
    String(request.storeId) !== String(user.storeId)
  ) {
    throw new AppError("You cannot acknowledge another store request", 403, "FORBIDDEN");
  }

  if (request.status !== "OPEN") {
    throw new AppError("This restock request is already closed", 409, "REQUEST_CLOSED");
  }

  request.acknowledgedBy = user._id;
  request.acknowledgedAt = new Date();
  await request.save();

  return populateInventoryRequest(request);
};

const receiveRestockRequest = async ({
  managerNote,
  receivedQuantity,
  requestId,
  user,
}) => {
  const quantity = Number.parseInt(receivedQuantity, 10);

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError("Received quantity is invalid", 400, "INVALID_RECEIVED_QUANTITY");
  }

  if (quantity > MAX_STOCK_RECEIVE_QUANTITY) {
    throw new AppError(
      `Received quantity cannot exceed ${MAX_STOCK_RECEIVE_QUANTITY}`,
      400,
      "RECEIVED_QUANTITY_LIMIT_EXCEEDED",
      {
        maxAllowedQuantity: MAX_STOCK_RECEIVE_QUANTITY,
        receivedQuantity: quantity,
      }
    );
  }

  return runInTransaction(async (session) => {
    if (user.role !== USER_ROLES.MANAGER) {
      throw new AppError(
        "Only the destination store manager can receive restock requests",
        403,
        "FORBIDDEN"
      );
    }

    const request = await InventoryRequest.findById(requestId).session(session);

    if (!request) {
      throw new AppError("Restock request was not found", 404, "REQUEST_NOT_FOUND");
    }

    if (
      user.role !== USER_ROLES.OWNER &&
      String(request.storeId) !== String(user.storeId)
    ) {
      throw new AppError("You cannot receive stock for another store", 403, "FORBIDDEN");
    }

    if (request.status !== "OPEN") {
      throw new AppError("This restock request is already closed", 409, "REQUEST_CLOSED");
    }

    if (quantity > request.requestedQuantity) {
      throw new AppError(
        "Received quantity cannot exceed the requested quantity",
        400,
        "RECEIVED_QUANTITY_EXCEEDS_REQUEST",
        {
          receivedQuantity: quantity,
          requestedQuantity: request.requestedQuantity,
        }
      );
    }

    await inventoryMutationService.receiveStock(
      request.storeId,
      [{ productId: request.productId, quantity }],
      session
    );

    await InventoryReceipt.create(
      [
        {
          storeId: request.storeId,
          productId: request.productId,
          quantity,
          source: "SALES_REQUEST",
          note:
            managerNote || `Manager received ${quantity} item(s) from Sales request`,
          referenceId: request._id,
          receivedBy: user._id,
        },
      ],
      { session }
    );

    request.status = "RESOLVED";
    request.managerNote =
      managerNote || `Manager received ${quantity} item(s) into branch stock`;
    request.handledBy = user._id;
    request.resolvedAt = new Date();
    await request.save({ session });

    return populateInventoryRequest(request);
  });
};

const receiveDirectStock = async ({
  note,
  productId,
  quantity,
  storeId,
  user,
}) => {
  const scopedStoreId = getScopedStoreId(user, storeId);
  const receivedQuantity = Number.parseInt(quantity, 10);

  if (!scopedStoreId) {
    throw new AppError("Store ID is required", 400, "STORE_ID_REQUIRED");
  }

  if (!productId) {
    throw new AppError("Product ID is required", 400, "PRODUCT_ID_REQUIRED");
  }

  if (!Number.isInteger(receivedQuantity) || receivedQuantity < 1) {
    throw new AppError("Received quantity is invalid", 400, "INVALID_RECEIVED_QUANTITY");
  }

  if (receivedQuantity > MAX_STOCK_RECEIVE_QUANTITY) {
    throw new AppError(
      `Received quantity cannot exceed ${MAX_STOCK_RECEIVE_QUANTITY}`,
      400,
      "RECEIVED_QUANTITY_LIMIT_EXCEEDED",
      {
        maxAllowedQuantity: MAX_STOCK_RECEIVE_QUANTITY,
        receivedQuantity,
      }
    );
  }

  await ensureStoreCanProcessInventoryMutation({
    storeId: scopedStoreId,
    user,
  });

  return runInTransaction(async (session) => {
    await inventoryMutationService.receiveStock(
      scopedStoreId,
      [{ productId, quantity: receivedQuantity }],
      session
    );

    await InventoryReceipt.create(
      [
        {
          storeId: scopedStoreId,
          productId,
          quantity: receivedQuantity,
          source: "DIRECT",
          note: note || "",
          receivedBy: user._id,
        },
      ],
      { session }
    );

    const inventory = await StoreInventory.findOne({
      storeId: scopedStoreId,
      productId,
    })
      .populate("storeId", "name address phone type")
      .populate("productId", "name sku brand category image price")
      .session(session);

    return {
      inventory,
      note: note || "",
      receivedQuantity,
    };
  });
};

const createInventoryAdjustment = async ({
  note,
  productId,
  quantity,
  storeId,
  type,
  user,
}) => {
  const scopedStoreId = getScopedStoreId(user, storeId);
  const adjustmentType = String(type || "").toUpperCase();

  if (!["DAMAGED", "DEFECTIVE", "LOST", "EXPIRED", "OTHER"].includes(adjustmentType)) {
    throw new AppError("Inventory adjustment type is invalid", 400, "INVALID_ADJUSTMENT_TYPE");
  }

  const normalizedQuantity = Number.parseInt(quantity, 10);

  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 1) {
    throw new AppError("Adjustment quantity is invalid", 400, "INVALID_ADJUSTMENT_QUANTITY");
  }

  if (!scopedStoreId || !productId) {
    throw new AppError("Store ID and product ID are required", 400, "INVALID_ADJUSTMENT");
  }

  await ensureStoreCanProcessInventoryMutation({
    storeId: scopedStoreId,
    user,
  });

  return runInTransaction(async (session) => {
    await inventoryMutationService.writeOffStock(
      scopedStoreId,
      [{ productId, quantity: normalizedQuantity }],
      session
    );

    const adjustment = await InventoryAdjustment.create(
      [
        {
          storeId: scopedStoreId,
          productId,
          type: adjustmentType,
          quantity: normalizedQuantity,
          note: note || "",
          createdBy: user._id,
        },
      ],
      { session }
    );

    return adjustment[0].populate([
      { path: "storeId", select: "name address phone type" },
      { path: "productId", select: "name sku brand category image price" },
      { path: "createdBy", select: "fullName email phone role" },
    ]);
  });
};

const getInventoryAdjustments = async ({ storeId, user }) => {
  const scopedStoreId = getScopedStoreId(user, storeId);
  const query = {};

  if (scopedStoreId) {
    query.storeId = scopedStoreId;
  }

  return InventoryAdjustment.find(query)
    .populate("storeId", "name address phone type")
    .populate("productId", "name sku brand category image price")
    .populate("createdBy", "fullName email phone role")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
};

const getInventoryReceipts = async ({ storeId, user }) => {
  const scopedStoreId = getScopedStoreId(user, storeId);
  const query = {};

  if (scopedStoreId) {
    query.storeId = scopedStoreId;
  }

  return InventoryReceipt.find(query)
    .populate("storeId", "name address phone type")
    .populate("productId", "name sku brand category image price")
    .populate("receivedBy", "fullName email phone role")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
};

const getIncomingTransfers = async ({ storeId, user }) => {
  const scopedStoreId = getScopedStoreId(user, storeId);

  if (!scopedStoreId) {
    throw new AppError("Store ID is required", 400, "STORE_ID_REQUIRED");
  }

  return StockTransfer.find({ toStoreId: scopedStoreId, status: "PENDING" })
    .populate("fromStoreId", "name address phone type")
    .populate("toStoreId", "name address phone type")
    .populate("items.productId", "name sku brand category image price")
    .populate("createdBy", "fullName email phone role")
    .sort({ createdAt: -1 })
    .lean();
};

const confirmIncomingTransfer = async ({ transferId, user }) =>
  runInTransaction(async (session) => {
    if (user.role !== USER_ROLES.MANAGER) {
      throw new AppError(
        "Only the destination store manager can confirm incoming transfers",
        403,
        "FORBIDDEN"
      );
    }

    const transfer = await StockTransfer.findById(transferId).session(session);

    if (!transfer) {
      throw new AppError("Stock transfer was not found", 404, "TRANSFER_NOT_FOUND");
    }

    if (
      user.role !== USER_ROLES.OWNER &&
      String(transfer.toStoreId) !== String(user.storeId)
    ) {
      throw new AppError("You cannot confirm another store transfer", 403, "FORBIDDEN");
    }

    if (transfer.status !== "PENDING") {
      throw new AppError("This stock transfer is already closed", 409, "TRANSFER_CLOSED");
    }

    await inventoryMutationService.receiveStock(
      transfer.toStoreId,
      transfer.items,
      session
    );

    await InventoryReceipt.create(
      transfer.items.map((item) => ({
        storeId: transfer.toStoreId,
        productId: item.productId,
        quantity: item.quantity,
        source: "TRANSFER",
        note: "Received from stock transfer",
        referenceId: transfer._id,
        receivedBy: user._id,
      })),
      { session }
    );

    transfer.status = "CONFIRMED";
    transfer.confirmedBy = user._id;
    await transfer.save({ session });

    return transfer.populate([
      { path: "fromStoreId", select: "name address phone type" },
      { path: "toStoreId", select: "name address phone type" },
      { path: "items.productId", select: "name sku brand category image price" },
      { path: "createdBy", select: "fullName email phone role" },
      { path: "confirmedBy", select: "fullName email phone role" },
    ]);
  });

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
