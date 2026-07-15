const mongoose = require("mongoose");
const InventoryAdjustment = require("../../../models/InventoryAdjustment");
const InventoryReceipt = require("../../../models/InventoryReceipt");
const Order = require("../../../models/Order");
const Product = require("../../../models/Product");
const Store = require("../../../models/Store");
const StoreInventory = require("../../../models/StoreInventory");
const StockTransfer = require("../../../models/StockTransfer");
const User = require("../../../models/User");
const AppError = require("../../../utils/AppError");
const { runInTransaction } = require("../../stock/services/transactionService");
const inventoryMutationService = require("../../stock/services/inventoryService");
const {
  PAYMENT_STATUSES,
  STORE_TYPES,
  USER_ROLES,
} = require("../../../constants/business");
const {
  normalizeEmail,
  normalizePhone,
  requireString,
  validateAddress,
  validateFullName,
  validatePassword,
} = require("../../../utils/authValidation");

const PRODUCT_FIELDS = "name sku brand category image price isActive";
const STAFF_ROLES = [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.SALES];
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseOptionalString = (value) =>
  typeof value === "string" ? value.trim() : "";

const parseStringArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const parseBoolean = (value, defaultValue = undefined) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return defaultValue;
};

const parseNonNegativeNumber = (value, fieldName, { required = false } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new AppError(`${fieldName} is required`, 400, "VALIDATION_ERROR", {
        field: fieldName,
      });
    }

    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new AppError(
      `${fieldName} must be a non-negative number`,
      400,
      "VALIDATION_ERROR",
      { field: fieldName }
    );
  }

  return number;
};

const ensureObjectId = (value, fieldName) => {
  const normalized = requireString(String(value || ""), fieldName);

  if (!mongoose.isValidObjectId(normalized)) {
    throw new AppError(`${fieldName} is invalid`, 400, "VALIDATION_ERROR", {
      field: fieldName,
    });
  }

  return normalized;
};

const normalizeIngredients = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const title = parseOptionalString(item?.title);

      if (!title) {
        return null;
      }

      return {
        icon: parseOptionalString(item?.icon) || "leaf-outline",
        subtitle: parseOptionalString(item?.subtitle),
        title,
      };
    })
    .filter(Boolean);
};

const populateStaff = (query) =>
  query.populate("storeId", "name type address phone isActive");

const populateTransfer = (query) =>
  query.populate([
    { path: "fromStoreId", select: "name type address phone isActive" },
    { path: "toStoreId", select: "name type address phone isActive" },
    { path: "items.productId", select: PRODUCT_FIELDS },
    { path: "createdBy", select: "fullName email phone role" },
    { path: "confirmedBy", select: "fullName email phone role" },
  ]);

const buildProductPayload = (payload, { isCreate = false } = {}) => {
  const nextPayload = {};

  if (isCreate || payload.sku !== undefined) {
    nextPayload.sku = requireString(payload.sku, "sku").toUpperCase();
  }

  if (isCreate || payload.name !== undefined) {
    nextPayload.name = requireString(payload.name, "name");
  }

  if (isCreate || payload.brand !== undefined) {
    nextPayload.brand = requireString(payload.brand, "brand");
  }

  if (isCreate || payload.category !== undefined) {
    nextPayload.category = requireString(payload.category, "category");
  }

  if (isCreate || payload.price !== undefined) {
    nextPayload.price = parseNonNegativeNumber(payload.price, "price", {
      required: true,
    });
  }

  if (payload.costPrice !== undefined) {
    nextPayload.costPrice =
      payload.costPrice === null || payload.costPrice === ""
        ? null
        : parseNonNegativeNumber(payload.costPrice, "costPrice");
  }

  if (payload.originalPrice !== undefined) {
    nextPayload.originalPrice =
      payload.originalPrice === null || payload.originalPrice === ""
        ? null
        : parseNonNegativeNumber(payload.originalPrice, "originalPrice");
  }

  if (payload.description !== undefined) {
    nextPayload.description = parseOptionalString(payload.description);
  }

  if (payload.image !== undefined) {
    nextPayload.image = parseOptionalString(payload.image);
  }

  if (payload.images !== undefined) {
    nextPayload.images = parseStringArray(payload.images);
  }

  if (payload.skinTypes !== undefined) {
    nextPayload.skinTypes = parseStringArray(payload.skinTypes);
  }

  if (payload.volume !== undefined) {
    nextPayload.volume = parseOptionalString(payload.volume);
  }

  if (payload.origin !== undefined) {
    nextPayload.origin = parseOptionalString(payload.origin);
  }

  if (payload.expiryDate !== undefined) {
    nextPayload.expiryDate = parseOptionalString(payload.expiryDate);
  }

  if (payload.ingredients !== undefined) {
    nextPayload.ingredients = normalizeIngredients(payload.ingredients);
  }

  if (payload.isActive !== undefined) {
    nextPayload.isActive = parseBoolean(payload.isActive, true);
  }

  return nextPayload;
};

const buildStorePayload = (payload, { isCreate = false } = {}) => {
  const nextPayload = {};

  if (isCreate || payload.name !== undefined) {
    nextPayload.name = requireString(payload.name, "name");
  }

  if (isCreate || payload.address !== undefined) {
    nextPayload.address = requireString(payload.address, "address");
  }

  if (isCreate || payload.phone !== undefined) {
    nextPayload.phone = requireString(payload.phone, "phone");
  }

  if (isCreate || payload.type !== undefined) {
    const type = requireString(payload.type, "type").toUpperCase();

    if (!Object.values(STORE_TYPES).includes(type)) {
      throw new AppError("Store type is invalid", 400, "VALIDATION_ERROR", {
        field: "type",
      });
    }

    nextPayload.type = type;
  }

  if (payload.isActive !== undefined) {
    nextPayload.isActive = parseBoolean(payload.isActive, true);
  }

  return nextPayload;
};

const ensureStoreExists = async (storeId) => {
  const store = await Store.findById(storeId);

  if (!store) {
    throw new AppError("Store was not found", 404, "STORE_NOT_FOUND");
  }

  return store;
};

const ensureProductExists = async (productId) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError("Product was not found", 404, "PRODUCT_NOT_FOUND");
  }

  return product;
};

const buildStaffPayload = async (payload, { isCreate = false } = {}) => {
  const nextPayload = {};

  if (isCreate || payload.fullName !== undefined) {
    nextPayload.fullName = validateFullName(payload.fullName);
  }

  if (isCreate || payload.email !== undefined) {
    nextPayload.email = normalizeEmail(payload.email);
  }

  if (isCreate || payload.phone !== undefined) {
    nextPayload.phone = normalizePhone(payload.phone);
  }

  if (isCreate || payload.address !== undefined) {
    nextPayload.address = validateAddress(payload.address);
  }

  if (payload.password !== undefined) {
    nextPayload.password = validatePassword(payload.password);
  }

  if (isCreate || payload.role !== undefined) {
    const role = requireString(payload.role, "role").toUpperCase();

    if (!STAFF_ROLES.includes(role)) {
      throw new AppError("Role is invalid", 400, "VALIDATION_ERROR", {
        field: "role",
      });
    }

    nextPayload.role = role;
  }

  if (payload.storeId !== undefined) {
    nextPayload.storeId = payload.storeId
      ? ensureObjectId(payload.storeId, "storeId")
      : null;
  }

  if (payload.isActive !== undefined) {
    nextPayload.isActive = parseBoolean(payload.isActive, true);
  }

  if (payload.disabledReason !== undefined) {
    nextPayload.disabledReason = parseOptionalString(payload.disabledReason);
  }

  if (
    nextPayload.role &&
    [USER_ROLES.MANAGER, USER_ROLES.SALES].includes(nextPayload.role)
  ) {
    if (!nextPayload.storeId) {
      throw new AppError("Store ID is required for staff", 400, "VALIDATION_ERROR", {
        field: "storeId",
      });
    }

    await ensureStoreExists(nextPayload.storeId);
  }

  if (nextPayload.storeId && !nextPayload.role) {
    await ensureStoreExists(nextPayload.storeId);
  }

  if (nextPayload.role === USER_ROLES.OWNER) {
    nextPayload.storeId = null;
  }

  return nextPayload;
};

const seedInventoryForNewProduct = async (productId, session) => {
  const stores = await Store.find({}).select("_id").session(session).lean();

  if (stores.length === 0) {
    return;
  }

  await StoreInventory.insertMany(
    stores.map((store) => ({
      storeId: store._id,
      productId,
      totalStock: 0,
      reservedStock: 0,
      availableStock: 0,
    })),
    { session }
  );
};

const seedInventoryForNewStore = async (storeId, session) => {
  const products = await Product.find({}).select("_id").session(session).lean();

  if (products.length === 0) {
    return;
  }

  await StoreInventory.insertMany(
    products.map((product) => ({
      storeId,
      productId: product._id,
      totalStock: 0,
      reservedStock: 0,
      availableStock: 0,
    })),
    { session }
  );
};

const getManagedProducts = async ({
  category,
  includeInactive = true,
  search,
}) => {
  const query = {};

  if (!includeInactive) {
    query.isActive = true;
  }

  if (category) {
    query.category = category;
  }

  if (search) {
    const pattern = { $regex: escapeRegExp(search.trim()), $options: "i" };
    query.$or = [{ name: pattern }, { sku: pattern }, { brand: pattern }];
  }

  return Product.find(query).sort({ isActive: -1, createdAt: -1 }).lean();
};

const createManagedProduct = async (payload) => {
  const nextPayload = buildProductPayload(payload, { isCreate: true });

  return runInTransaction(async (session) => {
    const existingProduct = await Product.findOne({ sku: nextPayload.sku }).session(session);

    if (existingProduct) {
      throw new AppError("SKU already exists", 409, "SKU_EXISTS");
    }

    const product = await Product.create([nextPayload], { session });
    await seedInventoryForNewProduct(product[0]._id, session);
    return product[0];
  });
};

const updateManagedProduct = async (productId, payload) => {
  await ensureProductExists(productId);
  const nextPayload = buildProductPayload(payload);

  return Product.findByIdAndUpdate(productId, nextPayload, {
    new: true,
    runValidators: true,
  });
};

const getManagedStores = async ({ includeInactive = true } = {}) => {
  const query = includeInactive ? {} : { isActive: true };
  return Store.find(query).sort({ isActive: -1, name: 1 }).lean();
};

const getRevenueAnalytics = async () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [
    adjustments,
    products,
    receipts,
    paidOrders,
    stores,
    storeInventories,
    totalOrders,
  ] = await Promise.all([
    InventoryAdjustment.find({}).select("productId quantity storeId").lean(),
    Product.find({}).select("brand category costPrice name price sku").lean(),
    InventoryReceipt.find({}).select("productId quantity source storeId").lean(),
    Order.find({ paymentStatus: PAYMENT_STATUSES.PAID })
      .select("channel createdAt items paidAt storeId totalPrice updatedAt")
      .lean(),
    Store.find({}).lean(),
    StoreInventory.find({})
      .select("productId storeId totalStock")
      .lean(),
    Order.countDocuments({}),
  ]);

  const productById = new Map(products.map((product) => [String(product._id), product]));
  const missingCostProductIds = new Set();
  const storeAnalyticsMap = new Map(
    stores.map((store) => [
      String(store._id),
      {
        store,
        orderCount: 0,
        paidOrderCount: 0,
        revenue: 0,
        onlineRevenue: 0,
        offlineRevenue: 0,
        soldCost: 0,
        grossProfit: 0,
        writeOffCost: 0,
        stockInCost: 0,
        inventoryValue: 0,
        totalStockUnits: 0,
      },
    ])
  );

  const resolveCostPrice = (productId) => {
    const product = productById.get(String(productId));
    const costPrice = product?.costPrice;

    if (typeof costPrice === "number" && Number.isFinite(costPrice)) {
      return costPrice;
    }

    if (productId) {
      missingCostProductIds.add(String(productId));
    }

    return null;
  };

  const totalPaidRevenue = paidOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  let inventoryValue = 0;
  let monthlyRevenue = 0;
  let monthlySoldCost = 0;
  let soldCost = 0;
  let stockInCost = 0;
  let writeOffCost = 0;

  for (const order of paidOrders) {
    const storeAnalytics = storeAnalyticsMap.get(String(order.storeId || ""));
    const referenceDate = new Date(order.paidAt || order.updatedAt || order.createdAt);
    const orderSoldCost = order.items.reduce((sum, item) => {
      const costPrice = resolveCostPrice(item.productId);
      return costPrice === null ? sum : sum + costPrice * item.quantity;
    }, 0);

    soldCost += orderSoldCost;

    if (
      referenceDate.getMonth() === currentMonth &&
      referenceDate.getFullYear() === currentYear
    ) {
      monthlyRevenue += order.totalPrice;
      monthlySoldCost += orderSoldCost;
    }

    if (!storeAnalytics) {
      continue;
    }

    storeAnalytics.orderCount += 1;
    storeAnalytics.paidOrderCount += 1;
    storeAnalytics.revenue += order.totalPrice;
    storeAnalytics.soldCost += orderSoldCost;

    if (order.channel === "ONLINE") {
      storeAnalytics.onlineRevenue += order.totalPrice;
    } else {
      storeAnalytics.offlineRevenue += order.totalPrice;
    }
  }

  for (const receipt of receipts) {
    const costPrice = resolveCostPrice(receipt.productId);

    if (costPrice === null) {
      continue;
    }

    const receiptValue = costPrice * receipt.quantity;
    const storeAnalytics = storeAnalyticsMap.get(String(receipt.storeId || ""));

    stockInCost += receiptValue;

    if (storeAnalytics) {
      storeAnalytics.stockInCost += receiptValue;
    }
  }

  for (const adjustment of adjustments) {
    const costPrice = resolveCostPrice(adjustment.productId);

    if (costPrice === null) {
      continue;
    }

    const adjustmentValue = costPrice * adjustment.quantity;
    const storeAnalytics = storeAnalyticsMap.get(String(adjustment.storeId || ""));

    writeOffCost += adjustmentValue;

    if (storeAnalytics) {
      storeAnalytics.writeOffCost += adjustmentValue;
    }
  }

  for (const inventory of storeInventories) {
    const costPrice = resolveCostPrice(inventory.productId);
    const stockUnits = Number(inventory.totalStock || 0);
    const inventoryEntryValue = costPrice === null ? 0 : costPrice * stockUnits;
    const storeAnalytics = storeAnalyticsMap.get(String(inventory.storeId || ""));

    inventoryValue += inventoryEntryValue;

    if (storeAnalytics) {
      storeAnalytics.inventoryValue += inventoryEntryValue;
      storeAnalytics.totalStockUnits += stockUnits;
    }
  }

  const storesAnalytics = [...storeAnalyticsMap.values()]
    .map((entry) => ({
      ...entry,
      estimatedNetProfit: entry.revenue - entry.soldCost - entry.writeOffCost,
      grossProfit: entry.revenue - entry.soldCost,
    }))
    .sort((left, right) => right.revenue - left.revenue);

  return {
    stores: storesAnalytics,
    summary: {
      averageOrderValue: paidOrders.length > 0 ? totalPaidRevenue / paidOrders.length : 0,
      estimatedNetProfit: totalPaidRevenue - soldCost - writeOffCost,
      grossProfit: totalPaidRevenue - soldCost,
      inventoryValue,
      missingCostProductCount: missingCostProductIds.size,
      missingCostProducts: [...missingCostProductIds]
        .map((productId) => productById.get(productId))
        .filter(Boolean)
        .slice(0, 5)
        .map((product) => product.name),
      monthlyGrossProfit: monthlyRevenue - monthlySoldCost,
      monthlyRevenue,
      paidOrders: paidOrders.length,
      paidRevenue: totalPaidRevenue,
      soldCost,
      stockInCost,
      totalOrders,
      writeOffCost,
    },
  };
};

const createManagedStore = async (payload) => {
  const nextPayload = buildStorePayload(payload, { isCreate: true });

  return runInTransaction(async (session) => {
    const store = await Store.create([nextPayload], { session });
    await seedInventoryForNewStore(store[0]._id, session);
    return store[0];
  });
};

const updateManagedStore = async (storeId, payload) => {
  await ensureStoreExists(storeId);
  const nextPayload = buildStorePayload(payload);

  return Store.findByIdAndUpdate(storeId, nextPayload, {
    new: true,
    runValidators: true,
  });
};

const getManagedStaff = async ({ includeInactive = true } = {}) => {
  const query = { role: { $in: STAFF_ROLES } };

  if (!includeInactive) {
    query.isActive = true;
  }

  return populateStaff(
    User.find(query).sort({ isActive: -1, role: 1, fullName: 1 })
  ).lean();
};

const assertUniqueStaffIdentity = async ({ email, phone, userId = null }) => {
  const query = {
    $or: [{ email }, { phone }],
  };

  if (userId) {
    query._id = { $ne: userId };
  }

  const existingUser = await User.findOne(query).lean();

  if (!existingUser) {
    return;
  }

  throw new AppError(
    existingUser.email === email ? "Email already exists" : "Phone already exists",
    409,
    existingUser.email === email ? "EMAIL_EXISTS" : "PHONE_EXISTS"
  );
};

const createManagedStaff = async (payload) => {
  const nextPayload = await buildStaffPayload(payload, { isCreate: true });

  if (!nextPayload.password) {
    throw new AppError("password is required", 400, "VALIDATION_ERROR", {
      field: "password",
    });
  }

  await assertUniqueStaffIdentity({
    email: nextPayload.email,
    phone: nextPayload.phone,
  });

  return User.create({
    ...nextPayload,
    authProvider: "LOCAL",
    disabledAt: nextPayload.isActive === false ? new Date() : null,
    emailVerified: true,
  });
};

const updateManagedStaff = async (actor, userId, payload) => {
  const staff = await User.findById(userId).select("+password");

  if (!staff || !STAFF_ROLES.includes(staff.role)) {
    throw new AppError("Staff account was not found", 404, "STAFF_NOT_FOUND");
  }

  if (
    String(staff._id) === String(actor._id) &&
    parseBoolean(payload.isActive) === false
  ) {
    throw new AppError(
      "You cannot disable your own account",
      409,
      "SELF_DISABLE_FORBIDDEN"
    );
  }

  const nextPayload = await buildStaffPayload(payload);

  if (
    String(staff._id) === String(actor._id) &&
    nextPayload.role &&
    nextPayload.role !== USER_ROLES.OWNER
  ) {
    throw new AppError(
      "You cannot remove owner access from your own account",
      409,
      "SELF_ROLE_CHANGE_FORBIDDEN"
    );
  }

  const nextEmail = nextPayload.email || staff.email;
  const nextPhone = nextPayload.phone || staff.phone;

  if (nextEmail !== staff.email || nextPhone !== staff.phone) {
    await assertUniqueStaffIdentity({
      email: nextEmail,
      phone: nextPhone,
      userId: staff._id,
    });
  }

  Object.assign(staff, nextPayload);

  if (nextPayload.isActive === false) {
    staff.disabledAt = new Date();
    staff.disabledReason = nextPayload.disabledReason || "Disabled by owner";
  }

  if (nextPayload.isActive === true) {
    staff.disabledAt = null;
    staff.disabledReason = "";
  }

  await staff.save();
  return populateStaff(User.findById(staff._id)).lean();
};

const getStockTransfers = async ({ status = "ALL", storeId } = {}) => {
  const query = {};

  if (status && status !== "ALL") {
    query.status = status;
  }

  if (storeId) {
    const normalizedStoreId = ensureObjectId(storeId, "storeId");
    query.$or = [{ fromStoreId: normalizedStoreId }, { toStoreId: normalizedStoreId }];
  }

  return populateTransfer(
    StockTransfer.find(query).sort({ createdAt: -1 })
  ).lean();
};

const createStockTransfer = async (payload, owner) => {
  const fromStoreId = ensureObjectId(payload.fromStoreId, "fromStoreId");
  const toStoreId = ensureObjectId(payload.toStoreId, "toStoreId");

  if (fromStoreId === toStoreId) {
    throw new AppError(
      "Destination store must be different from source store",
      400,
      "VALIDATION_ERROR",
      { field: "toStoreId" }
    );
  }

  const [fromStore, toStore] = await Promise.all([
    ensureStoreExists(fromStoreId),
    ensureStoreExists(toStoreId),
  ]);

  if (!fromStore.isActive || !toStore.isActive) {
    throw new AppError(
      "Stock transfers require both source and destination stores to be active",
      409,
      "STORE_INACTIVE"
    );
  }

  if (fromStore.type !== STORE_TYPES.CENTRAL) {
    throw new AppError(
      "Stock transfers must start from the central warehouse",
      400,
      "INVALID_TRANSFER_SOURCE"
    );
  }

  if (toStore.type !== STORE_TYPES.BRANCH) {
    throw new AppError(
      "Stock transfers can only be sent to a branch store",
      400,
      "INVALID_TRANSFER_DESTINATION"
    );
  }

  const items = inventoryMutationService.normalizeItems(payload.items);

  return runInTransaction(async (session) => {
    await inventoryMutationService.writeOffStock(fromStoreId, items, session);

    const transfer = await StockTransfer.create(
      [
        {
          createdBy: owner._id,
          fromStoreId,
          items,
          toStoreId,
        },
      ],
      { session }
    );

    return populateTransfer(StockTransfer.findById(transfer[0]._id)).session(session);
  });
};

const cancelStockTransfer = async (transferId) =>
  runInTransaction(async (session) => {
    const transfer = await StockTransfer.findById(transferId).session(session);

    if (!transfer) {
      throw new AppError("Stock transfer was not found", 404, "TRANSFER_NOT_FOUND");
    }

    if (transfer.status !== "PENDING") {
      throw new AppError(
        "Only pending transfers can be cancelled",
        409,
        "TRANSFER_CLOSED"
      );
    }

    await inventoryMutationService.receiveStock(
      transfer.fromStoreId,
      transfer.items,
      session
    );

    transfer.status = "CANCELLED";
    await transfer.save({ session });

    return populateTransfer(StockTransfer.findById(transfer._id)).session(session);
  });

module.exports = {
  cancelStockTransfer,
  createManagedProduct,
  createManagedStaff,
  createManagedStore,
  createStockTransfer,
  getManagedProducts,
  getRevenueAnalytics,
  getManagedStaff,
  getManagedStores,
  getStockTransfers,
  updateManagedProduct,
  updateManagedStaff,
  updateManagedStore,
};
