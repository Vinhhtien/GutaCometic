const StoreInventory = require("../../../models/StoreInventory");
const AppError = require("../../../utils/AppError");

const normalizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(
      "At least one inventory item is required",
      400,
      "ITEMS_REQUIRED"
    );
  }

  const quantities = new Map();

  for (const item of items) {
    const productId = String(item.productId || "");
    const quantity = Number(item.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError(
        "Each item requires a productId and a positive integer quantity",
        400,
        "INVALID_INVENTORY_ITEM"
      );
    }

    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  return [...quantities.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
};

const getStoreInventory = (storeId, productIds, session) =>
  StoreInventory.find({
    storeId,
    productId: { $in: productIds },
  })
    .session(session || null)
    .lean();

const assertAvailableStock = async (storeId, items, session) => {
  const normalizedItems = normalizeItems(items);
  const inventories = await getStoreInventory(
    storeId,
    normalizedItems.map((item) => item.productId),
    session
  );
  const inventoryByProduct = new Map(
    inventories.map((inventory) => [
      String(inventory.productId),
      inventory,
    ])
  );
  const shortages = normalizedItems
    .map((item) => {
      const inventory = inventoryByProduct.get(item.productId);
      const availableStock = inventory?.availableStock || 0;

      return availableStock >= item.quantity
        ? null
        : {
            productId: item.productId,
            requested: item.quantity,
            available: availableStock,
          };
    })
    .filter(Boolean);

  if (shortages.length > 0) {
    throw new AppError(
      "One or more products do not have enough available stock",
      409,
      "INSUFFICIENT_STOCK",
      shortages
    );
  }

  return normalizedItems;
};

const updateEachItem = async ({
  storeId,
  items,
  session,
  buildFilter,
  buildUpdate,
  errorCode,
  errorMessage,
}) => {
  const normalizedItems = normalizeItems(items);

  for (const item of normalizedItems) {
    const result = await StoreInventory.updateOne(
      {
        storeId,
        productId: item.productId,
        ...buildFilter(item),
      },
      buildUpdate(item),
      {
        runValidators: true,
        session,
      }
    );

    if (result.modifiedCount !== 1) {
      throw new AppError(errorMessage, 409, errorCode, {
        productId: item.productId,
        requested: item.quantity,
      });
    }
  }

  return normalizedItems;
};

const reserveStock = (storeId, items, session) =>
  updateEachItem({
    storeId,
    items,
    session,
    buildFilter: ({ quantity }) => ({
      availableStock: { $gte: quantity },
    }),
    buildUpdate: ({ quantity }) => ({
      $inc: {
        reservedStock: quantity,
        availableStock: -quantity,
      },
    }),
    errorCode: "INSUFFICIENT_STOCK",
    errorMessage: "Unable to reserve the requested stock",
  });

const releaseReservedStock = (storeId, items, session) =>
  updateEachItem({
    storeId,
    items,
    session,
    buildFilter: ({ quantity }) => ({
      reservedStock: { $gte: quantity },
    }),
    buildUpdate: ({ quantity }) => ({
      $inc: {
        reservedStock: -quantity,
        availableStock: quantity,
      },
    }),
    errorCode: "INVALID_RESERVATION",
    errorMessage: "Reserved stock is lower than the amount being released",
  });

const completeReservedSale = (storeId, items, session) =>
  updateEachItem({
    storeId,
    items,
    session,
    buildFilter: ({ quantity }) => ({
      reservedStock: { $gte: quantity },
      totalStock: { $gte: quantity },
    }),
    buildUpdate: ({ quantity }) => ({
      $inc: {
        reservedStock: -quantity,
        totalStock: -quantity,
      },
    }),
    errorCode: "INVALID_RESERVATION",
    errorMessage: "Reserved stock cannot be completed",
  });

const completeImmediateSale = (storeId, items, session) =>
  updateEachItem({
    storeId,
    items,
    session,
    buildFilter: ({ quantity }) => ({
      availableStock: { $gte: quantity },
      totalStock: { $gte: quantity },
    }),
    buildUpdate: ({ quantity }) => ({
      $inc: {
        totalStock: -quantity,
        availableStock: -quantity,
      },
    }),
    errorCode: "INSUFFICIENT_STOCK",
    errorMessage: "Unable to complete sale because stock is insufficient",
  });

const receiveStock = (storeId, items, session) =>
  updateEachItem({
    storeId,
    items,
    session,
    buildFilter: () => ({}),
    buildUpdate: ({ quantity }) => ({
      $inc: {
        totalStock: quantity,
        availableStock: quantity,
      },
    }),
    errorCode: "INVENTORY_NOT_FOUND",
    errorMessage: "Inventory record was not found for this product",
  });

module.exports = {
  assertAvailableStock,
  completeImmediateSale,
  completeReservedSale,
  normalizeItems,
  receiveStock,
  releaseReservedStock,
  reserveStock,
};
