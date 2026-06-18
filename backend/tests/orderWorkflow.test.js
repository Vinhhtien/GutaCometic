require("dotenv").config();

const assert = require("node:assert/strict");
const { after, before, describe, test } = require("node:test");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Store = require("../models/Store");
const StoreInventory = require("../models/StoreInventory");
const User = require("../models/User");
const orderService = require("../services/orderService");
const {
  FULFILLMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  USER_ROLES,
} = require("../constants/business");

describe("Transactional order workflows", () => {
  let store;
  let product;
  let customer;
  let sales;
  let manager;

  before(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const timestamp = Date.now();

    store = await Store.create({
      name: `Workflow Store ${timestamp}`,
      type: "BRANCH",
      address: "Test Address",
      phone: "0900000000",
    });
    product = await Product.create({
      sku: `WORKFLOW-${timestamp}`,
      name: "Workflow Product",
      brand: "GUTA",
      price: 150000,
      category: "Test",
    });
    await StoreInventory.create({
      storeId: store._id,
      productId: product._id,
      totalStock: 10,
      reservedStock: 0,
    });
    [customer, sales, manager] = await User.create([
      {
        fullName: "Workflow Customer",
        email: `customer-${timestamp}@example.com`,
        password: "password123",
        role: USER_ROLES.CUSTOMER,
        phone: "0900000001",
        address: "Customer Address",
      },
      {
        fullName: "Workflow Sales",
        email: `sales-${timestamp}@example.com`,
        password: "password123",
        role: USER_ROLES.SALES,
        phone: "0900000002",
        address: "Store Address",
        storeId: store._id,
      },
      {
        fullName: "Workflow Manager",
        email: `manager-${timestamp}@example.com`,
        password: "password123",
        role: USER_ROLES.MANAGER,
        phone: "0900000003",
        address: "Store Address",
        storeId: store._id,
      },
    ]);
  });

  after(async () => {
    if (store) {
      await Order.deleteMany({ storeId: store._id });
      await StoreInventory.deleteMany({ storeId: store._id });
      await User.deleteMany({
        _id: { $in: [customer?._id, sales?._id, manager?._id].filter(Boolean) },
      });
      await Product.deleteOne({ _id: product?._id });
      await Store.deleteOne({ _id: store._id });
    }
    await mongoose.disconnect();
  });

  test("online order reserves stock and cancellation releases it", async () => {
    const order = await orderService.createOnlineOrder(
      {
        storeId: store._id,
        fulfillmentType: FULFILLMENT_TYPES.STORE_PICKUP,
        paymentMethod: PAYMENT_METHODS.PAY_AT_STORE,
        items: [{ productId: product._id, quantity: 2 }],
      },
      customer
    );

    assert.equal(order.status, ORDER_STATUSES.PENDING);
    assert.equal(order.inventoryReserved, true);

    let inventory = await StoreInventory.findOne({
      storeId: store._id,
      productId: product._id,
    }).lean();
    assert.deepEqual(
      [inventory.totalStock, inventory.reservedStock, inventory.availableStock],
      [10, 2, 8]
    );

    const cancelled = await orderService.cancelOrder(
      order._id,
      customer,
      "Customer changed their mind"
    );
    assert.equal(cancelled.status, ORDER_STATUSES.CANCELLED);
    assert.equal(cancelled.inventoryReserved, false);

    inventory = await StoreInventory.findOne({
      storeId: store._id,
      productId: product._id,
    }).lean();
    assert.deepEqual(
      [inventory.totalStock, inventory.reservedStock, inventory.availableStock],
      [10, 0, 10]
    );
  });

  test("Sales approval reserves stock and Manager payment completes POS sale", async () => {
    const order = await orderService.createOfflineOrder(
      {
        storeId: store._id,
        customerName: "Walk-in Customer",
        customerPhone: "0900000999",
        items: [{ productId: product._id, quantity: 3 }],
      },
      sales
    );

    assert.equal(order.status, ORDER_STATUSES.PENDING_APPROVAL);
    assert.equal(order.inventoryReserved, false);

    const approved = await orderService.approveOfflineOrder(order._id, sales);
    assert.equal(approved.status, ORDER_STATUSES.PENDING_PAYMENT);
    assert.equal(approved.inventoryReserved, true);

    let inventory = await StoreInventory.findOne({
      storeId: store._id,
      productId: product._id,
    }).lean();
    assert.deepEqual(
      [inventory.totalStock, inventory.reservedStock, inventory.availableStock],
      [10, 3, 7]
    );

    const paid = await orderService.payOfflineOrder(
      order._id,
      PAYMENT_METHODS.CASH,
      manager
    );
    assert.equal(paid.status, ORDER_STATUSES.COMPLETED);
    assert.equal(paid.paymentStatus, PAYMENT_STATUSES.PAID);
    assert.equal(paid.inventoryReserved, false);
    assert.equal(String(paid.paidByManagerId), String(manager._id));

    inventory = await StoreInventory.findOne({
      storeId: store._id,
      productId: product._id,
    }).lean();
    assert.deepEqual(
      [inventory.totalStock, inventory.reservedStock, inventory.availableStock],
      [7, 0, 7]
    );
  });

  test("Manager completes a pickup order through the required online states", async () => {
    const order = await orderService.createOnlineOrder(
      {
        storeId: store._id,
        fulfillmentType: FULFILLMENT_TYPES.STORE_PICKUP,
        paymentMethod: PAYMENT_METHODS.PAY_AT_STORE,
        items: [{ productId: product._id, quantity: 2 }],
      },
      customer
    );

    const preparing = await orderService.updateOnlineStatus(
      order._id,
      ORDER_STATUSES.PREPARING,
      manager
    );
    assert.equal(preparing.status, ORDER_STATUSES.PREPARING);

    const ready = await orderService.updateOnlineStatus(
      order._id,
      ORDER_STATUSES.READY_FOR_PICKUP,
      manager
    );
    assert.equal(ready.status, ORDER_STATUSES.READY_FOR_PICKUP);

    const completed = await orderService.updateOnlineStatus(
      order._id,
      ORDER_STATUSES.COMPLETED,
      manager
    );
    assert.equal(completed.status, ORDER_STATUSES.COMPLETED);
    assert.equal(completed.paymentStatus, PAYMENT_STATUSES.PAID);

    const inventory = await StoreInventory.findOne({
      storeId: store._id,
      productId: product._id,
    }).lean();
    assert.deepEqual(
      [inventory.totalStock, inventory.reservedStock, inventory.availableStock],
      [5, 0, 5]
    );
  });
});
