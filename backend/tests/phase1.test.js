require("dotenv").config();

const assert = require("node:assert/strict");
const { after, before, describe, test } = require("node:test");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Store = require("../models/Store");
const StoreInventory = require("../models/StoreInventory");
const User = require("../models/User");
const inventoryService = require("../services/inventoryService");
const { authorize, requireAssignedStore } = require("../middlewares/roleMiddleware");
const {
  FULFILLMENT_TYPES,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  USER_ROLES,
} = require("../constants/business");

const objectId = () => new mongoose.Types.ObjectId();

describe("Phase 1 business foundation", () => {
  test("normalizes duplicate inventory items", () => {
    const productId = objectId();
    const items = inventoryService.normalizeItems([
      { productId, quantity: 2 },
      { productId, quantity: 3 },
    ]);

    assert.equal(items.length, 1);
    assert.equal(items[0].quantity, 5);
  });

  test("calculates order snapshots and totals", async () => {
    const order = new Order({
      orderCode: "GUTA-TEST-TOTAL",
      channel: ORDER_CHANNELS.OFFLINE,
      fulfillmentType: FULFILLMENT_TYPES.IN_STORE,
      storeId: objectId(),
      items: [
        {
          productId: objectId(),
          sku: "SKU-1",
          name: "Test Product",
          quantity: 2,
          unitPrice: 125000,
          lineTotal: 0,
        },
      ],
      subtotal: 0,
      discountAmount: 50000,
      totalPrice: 0,
      status: ORDER_STATUSES.PENDING_APPROVAL,
    });

    await order.validate();
    assert.equal(order.items[0].lineTotal, 250000);
    assert.equal(order.subtotal, 250000);
    assert.equal(order.totalPrice, 200000);
  });

  test("rejects online orders without a customer", async () => {
    const order = new Order({
      orderCode: "GUTA-TEST-CUSTOMER",
      channel: ORDER_CHANNELS.ONLINE,
      fulfillmentType: FULFILLMENT_TYPES.STORE_PICKUP,
      storeId: objectId(),
      items: [
        {
          productId: objectId(),
          sku: "SKU-2",
          name: "Test Product",
          quantity: 1,
          unitPrice: 100000,
          lineTotal: 100000,
        },
      ],
      subtotal: 100000,
      totalPrice: 100000,
      status: ORDER_STATUSES.PENDING,
    });

    await assert.rejects(() => order.validate(), /customer account/);
  });

  test("requires store assignment for Sales and Manager", async () => {
    const user = new User({
      fullName: "Sales Test",
      email: "sales-model-test@example.com",
      password: "password123",
      role: USER_ROLES.SALES,
      phone: "0900000000",
      address: "Test",
    });

    await assert.rejects(() => user.validate(), /require a store/);
  });

  test("RBAC rejects roles outside the allow list", () => {
    let receivedError;
    authorize(USER_ROLES.OWNER)(
      { user: { role: USER_ROLES.CUSTOMER } },
      {},
      (error) => {
        receivedError = error;
      }
    );

    assert.equal(receivedError.statusCode, 403);
    assert.equal(receivedError.code, "FORBIDDEN");
  });

  test("staff middleware rejects users without a store", () => {
    let receivedError;
    requireAssignedStore(
      { user: { role: USER_ROLES.MANAGER, storeId: null } },
      {},
      (error) => {
        receivedError = error;
      }
    );

    assert.equal(receivedError.statusCode, 403);
    assert.equal(receivedError.code, "STORE_ASSIGNMENT_REQUIRED");
  });
});

describe("Inventory service integration", () => {
  let store;
  let product;

  before(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    store = await Store.create({
      name: `Phase 1 Test Store ${Date.now()}`,
      type: "BRANCH",
      address: "Test Address",
      phone: "0900000000",
    });
    product = await Product.create({
      sku: `PHASE1-${Date.now()}`,
      name: "Phase 1 Test Product",
      brand: "GUTA",
      price: 100000,
      category: "Test",
    });
    await StoreInventory.create({
      storeId: store._id,
      productId: product._id,
      totalStock: 10,
      reservedStock: 2,
    });
  });

  after(async () => {
    if (store && product) {
      await StoreInventory.deleteMany({
        storeId: store._id,
        productId: product._id,
      });
      await Store.deleteOne({ _id: store._id });
      await Product.deleteOne({ _id: product._id });
    }
    await mongoose.disconnect();
  });

  test("reserve, release, complete and receive preserve stock formula", async () => {
    const items = [{ productId: product._id, quantity: 3 }];

    await inventoryService.reserveStock(store._id, items);
    let inventory = await StoreInventory.findOne({
      storeId: store._id,
      productId: product._id,
    }).lean();
    assert.deepEqual(
      [inventory.totalStock, inventory.reservedStock, inventory.availableStock],
      [10, 5, 5]
    );

    await inventoryService.releaseReservedStock(store._id, [
      { productId: product._id, quantity: 2 },
    ]);
    inventory = await StoreInventory.findOne({
      storeId: store._id,
      productId: product._id,
    }).lean();
    assert.deepEqual(
      [inventory.totalStock, inventory.reservedStock, inventory.availableStock],
      [10, 3, 7]
    );

    await inventoryService.completeReservedSale(store._id, [
      { productId: product._id, quantity: 2 },
    ]);
    inventory = await StoreInventory.findOne({
      storeId: store._id,
      productId: product._id,
    }).lean();
    assert.deepEqual(
      [inventory.totalStock, inventory.reservedStock, inventory.availableStock],
      [8, 1, 7]
    );

    await inventoryService.completeImmediateSale(store._id, [
      { productId: product._id, quantity: 3 },
    ]);
    await inventoryService.receiveStock(store._id, [
      { productId: product._id, quantity: 4 },
    ]);
    inventory = await StoreInventory.findOne({
      storeId: store._id,
      productId: product._id,
    }).lean();
    assert.deepEqual(
      [inventory.totalStock, inventory.reservedStock, inventory.availableStock],
      [9, 1, 8]
    );
  });

  test("rejects reservations larger than available stock", async () => {
    await assert.rejects(
      () =>
        inventoryService.reserveStock(store._id, [
          { productId: product._id, quantity: 999 },
        ]),
      (error) => error.code === "INSUFFICIENT_STOCK"
    );
  });
});
