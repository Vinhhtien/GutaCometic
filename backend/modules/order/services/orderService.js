const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../../../models/Order");
const Product = require("../../../models/Product");
const Review = require("../../../models/Review");
const User = require("../../../models/User");
const AppError = require("../../../utils/AppError");
const inventoryService = require("../../stock/services/inventoryService");
const { runInTransaction } = require("../../stock/services/transactionService");
const {
  DELIVERY_FEE_VND,
  FULFILLMENT_TYPES,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  USER_ROLES,
} = require("../../../constants/business");

const generateOrderCode = () => {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `GUTA-${date}-${suffix}`;
};

const MAX_ACTIVE_UNPAID_BANK_TRANSFER_ORDERS = Number(
  process.env.MAX_ACTIVE_UNPAID_BANK_TRANSFER_ORDERS || 3
);
const MAX_FAILED_BANK_TRANSFER_ORDERS_PER_DAY = Number(
  process.env.MAX_FAILED_BANK_TRANSFER_ORDERS_PER_DAY || 10
);
const PAYMENT_ABUSE_WINDOW_MS = 24 * 60 * 60 * 1000;

const assertRole = (user, allowedRoles) => {
  if (!allowedRoles.includes(user.role)) {
    throw new AppError(
      "You do not have permission to perform this order action",
      403,
      "FORBIDDEN"
    );
  }
};

const assertAssignedStore = (user, storeId) => {
  if (!user.storeId || String(user.storeId) !== String(storeId)) {
    throw new AppError(
      "You cannot process an order for another store",
      403,
      "STORE_ACCESS_DENIED"
    );
  }
};

const normalizeRequestedItems = (items) => inventoryService.normalizeItems(items);

const buildOrderItems = async (items, session) => {
  const normalizedItems = normalizeRequestedItems(items);
  const products = await Product.find({
    _id: { $in: normalizedItems.map((item) => item.productId) },
    isActive: true,
  })
    .session(session)
    .lean();
  const productsById = new Map(
    products.map((product) => [String(product._id), product])
  );

  if (products.length !== normalizedItems.length) {
    throw new AppError(
      "One or more products are unavailable",
      400,
      "PRODUCT_UNAVAILABLE"
    );
  }

  return normalizedItems.map(({ productId, quantity }) => {
    const product = productsById.get(productId);

    return {
      productId: product._id,
      sku: product.sku,
      name: product.name,
      image: product.image,
      quantity,
      unitPrice: product.price,
      lineTotal: product.price * quantity,
    };
  });
};

const appendStatus = (order, status, actorId, note = "") => {
  order.status = status;
  order.statusHistory.push({
    status,
    changedBy: actorId,
    note,
  });
};

const expireUnpaidBankTransferOrders = async (query = {}, session) => {
  const now = new Date();
  const expiredOrders = await Order.find({
    ...query,
    channel: ORDER_CHANNELS.ONLINE,
    paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
    paymentStatus: PAYMENT_STATUSES.UNPAID,
    status: ORDER_STATUSES.PENDING,
    paymentExpiresAt: { $lte: now },
  }).session(session || null);

  for (const order of expiredOrders) {
    if (order.inventoryReserved) {
      await inventoryService.releaseReservedStock(
        order.storeId,
        order.items,
        session
      );
      order.inventoryReserved = false;
    }

    order.paymentStatus = PAYMENT_STATUSES.FAILED;
    order.cancelledAt = now;
    order.cancellationReason = "PayOS payment QR expired";
    appendStatus(
      order,
      ORDER_STATUSES.CANCELLED,
      null,
      "PayOS payment QR expired before payment was received"
    );
    await order.save({ session });
  }

  return expiredOrders.length;
};

const enforceBankTransferOrderLimits = async (customer, session) => {
  const now = new Date();
  const activeUnpaidCount = await Order.countDocuments({
    customerId: customer._id,
    channel: ORDER_CHANNELS.ONLINE,
    paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
    paymentStatus: PAYMENT_STATUSES.UNPAID,
    status: ORDER_STATUSES.PENDING,
    $or: [
      { paymentExpiresAt: null },
      { paymentExpiresAt: { $gt: now } },
    ],
  }).session(session || null);

  if (activeUnpaidCount >= MAX_ACTIVE_UNPAID_BANK_TRANSFER_ORDERS) {
    throw new AppError(
      "You have too many unpaid bank transfer orders. Please pay or wait for old QR codes to expire.",
      429,
      "TOO_MANY_UNPAID_BANK_TRANSFER_ORDERS",
      {
        activeUnpaidCount,
        limit: MAX_ACTIVE_UNPAID_BANK_TRANSFER_ORDERS,
      }
    );
  }

  const failedSince = new Date(now.getTime() - PAYMENT_ABUSE_WINDOW_MS);
  const failedCount = await Order.countDocuments({
    customerId: customer._id,
    channel: ORDER_CHANNELS.ONLINE,
    paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
    paymentStatus: PAYMENT_STATUSES.FAILED,
    updatedAt: { $gte: failedSince },
  }).session(session || null);

  if (failedCount >= MAX_FAILED_BANK_TRANSFER_ORDERS_PER_DAY) {
    await User.updateOne(
      { _id: customer._id },
      {
        $set: {
          isActive: false,
          disabledAt: now,
          disabledReason:
            "Automatically disabled because too many PayOS bank transfer orders expired unpaid",
        },
      },
      { session }
    );

    throw new AppError(
      "This account has been disabled because too many bank transfer orders expired unpaid.",
      403,
      "ACCOUNT_DISABLED_PAYMENT_ABUSE",
      {
        failedCount,
        limit: MAX_FAILED_BANK_TRANSFER_ORDERS_PER_DAY,
      }
    );
  }
};

const findOrderOrThrow = async (orderId, session) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new AppError("Order ID is invalid", 400, "INVALID_ORDER_ID");
  }

  const order = await Order.findById(orderId).session(session || null);

  if (!order) {
    throw new AppError("Order was not found", 404, "ORDER_NOT_FOUND");
  }

  return order;
};

const ONLINE_ORDER_PAYMENT_METHODS = [
  PAYMENT_METHODS.COD,
  PAYMENT_METHODS.BANK_TRANSFER,
];

const createOnlineOrder = async (payload, customer) => {
  assertRole(customer, [USER_ROLES.CUSTOMER]);

  if (
    ![FULFILLMENT_TYPES.DELIVERY, FULFILLMENT_TYPES.STORE_PICKUP].includes(
      payload.fulfillmentType
    )
  ) {
    throw new AppError(
      "Online orders require delivery or store pickup",
      400,
      "INVALID_FULFILLMENT_TYPE"
    );
  }

  const isDelivery = payload.fulfillmentType === FULFILLMENT_TYPES.DELIVERY;

  if (isDelivery && !payload.shippingAddress?.addressLine?.trim()) {
    throw new AppError(
      "Delivery orders require a shipping address",
      400,
      "SHIPPING_ADDRESS_REQUIRED"
    );
  }

  if (!isDelivery && !payload.storeId) {
    throw new AppError(
      "Store pickup orders require a store",
      400,
      "PICKUP_STORE_REQUIRED"
    );
  }

  const paymentMethod = payload.paymentMethod || PAYMENT_METHODS.COD;

  if (!ONLINE_ORDER_PAYMENT_METHODS.includes(paymentMethod)) {
    throw new AppError(
      "Payment method must be COD or bank transfer",
      400,
      "INVALID_PAYMENT_METHOD"
    );
  }

  const shippingFee = isDelivery ? DELIVERY_FEE_VND : 0;
  const isBankTransfer = paymentMethod === PAYMENT_METHODS.BANK_TRANSFER;

  return runInTransaction(async (session) => {
    await expireUnpaidBankTransferOrders({ customerId: customer._id }, session);

    if (isBankTransfer) {
      await enforceBankTransferOrderLimits(customer, session);
    }

    const items = await buildOrderItems(payload.items, session);
    await inventoryService.reserveStock(payload.storeId, items, session);

    const order = new Order({
      orderCode: generateOrderCode(),
      channel: ORDER_CHANNELS.ONLINE,
      fulfillmentType: payload.fulfillmentType,
      customerId: customer._id,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      shippingAddress: isDelivery ? payload.shippingAddress : null,
      storeId: payload.storeId,
      items,
      subtotal: 0,
      shippingFee,
      totalPrice: 0,
      status: ORDER_STATUSES.PENDING,
      paymentStatus: PAYMENT_STATUSES.UNPAID,
      paymentMethod,
      paymentProvider: isBankTransfer ? "PAYOS" : null,
      inventoryReserved: true,
      statusHistory: [
        {
          status: ORDER_STATUSES.PENDING,
          changedBy: customer._id,
          note: isBankTransfer
            ? "Online order created, waiting for PayOS bank transfer"
            : "Online order created, to be paid on delivery (COD)",
        },
      ],
    });

    await order.save({ session });
    return order;
  });
};

const createOfflineOrder = async (payload, salesUser) => {
  assertRole(salesUser, [USER_ROLES.SALES]);
  assertAssignedStore(salesUser, payload.storeId);

  return runInTransaction(async (session) => {
    const items = await buildOrderItems(payload.items, session);
    await inventoryService.assertAvailableStock(payload.storeId, items, session);

    const order = new Order({
      orderCode: generateOrderCode(),
      channel: ORDER_CHANNELS.OFFLINE,
      fulfillmentType: FULFILLMENT_TYPES.IN_STORE,
      customerId: payload.customerId || null,
      customerName: payload.customerName || "",
      customerPhone: payload.customerPhone || "",
      storeId: payload.storeId,
      items,
      subtotal: 0,
      totalPrice: 0,
      status: ORDER_STATUSES.PENDING_APPROVAL,
      paymentStatus: PAYMENT_STATUSES.UNPAID,
      paymentMethod: null,
      createdBySalesId: salesUser._id,
      statusHistory: [
        {
          status: ORDER_STATUSES.PENDING_APPROVAL,
          changedBy: salesUser._id,
          note: "Offline order created by Sales",
        },
      ],
    });

    await order.save({ session });
    return order;
  });
};

const approveOfflineOrder = (orderId, salesUser) => {
  assertRole(salesUser, [USER_ROLES.SALES]);

  return runInTransaction(async (session) => {
    const order = await findOrderOrThrow(orderId, session);
    assertAssignedStore(salesUser, order.storeId);

    if (
      order.channel !== ORDER_CHANNELS.OFFLINE ||
      order.status !== ORDER_STATUSES.PENDING_APPROVAL
    ) {
      throw new AppError(
        "Only pending offline orders can be approved",
        409,
        "INVALID_ORDER_STATE"
      );
    }

    await inventoryService.reserveStock(order.storeId, order.items, session);
    order.inventoryReserved = true;
    order.approvedBySalesId = salesUser._id;
    appendStatus(
      order,
      ORDER_STATUSES.PENDING_PAYMENT,
      salesUser._id,
      "Sales approved order and sent it to Manager"
    );
    await order.save({ session });
    return order;
  });
};

const payOfflineOrder = (orderId, paymentMethod, manager) => {
  assertRole(manager, [USER_ROLES.MANAGER]);

  if (
    ![
      PAYMENT_METHODS.CASH,
      PAYMENT_METHODS.CARD,
      PAYMENT_METHODS.BANK_TRANSFER,
    ].includes(paymentMethod)
  ) {
    throw new AppError(
      "POS payment method is invalid",
      400,
      "INVALID_PAYMENT_METHOD"
    );
  }

  return runInTransaction(async (session) => {
    const order = await findOrderOrThrow(orderId, session);
    assertAssignedStore(manager, order.storeId);

    if (
      order.channel !== ORDER_CHANNELS.OFFLINE ||
      order.status !== ORDER_STATUSES.PENDING_PAYMENT ||
      !order.inventoryReserved
    ) {
      throw new AppError(
        "This order is not ready for POS payment",
        409,
        "INVALID_ORDER_STATE"
      );
    }

    await inventoryService.completeReservedSale(
      order.storeId,
      order.items,
      session
    );
    order.inventoryReserved = false;
    order.paymentMethod = paymentMethod;
    order.paymentStatus = PAYMENT_STATUSES.PAID;
    order.paidByManagerId = manager._id;
    order.paidAt = new Date();
    order.completedAt = new Date();
    appendStatus(
      order,
      ORDER_STATUSES.COMPLETED,
      manager._id,
      "POS payment completed by Manager"
    );
    await order.save({ session });
    return order;
  });
};

const updateOnlineStatus = (orderId, nextStatus, manager) => {
  assertRole(manager, [USER_ROLES.MANAGER]);

  return runInTransaction(async (session) => {
    const order = await findOrderOrThrow(orderId, session);
    assertAssignedStore(manager, order.storeId);
    const allowedTransitions = {
      [ORDER_STATUSES.PENDING]: [ORDER_STATUSES.PREPARING],
      [ORDER_STATUSES.PREPARING]:
        order.fulfillmentType === FULFILLMENT_TYPES.DELIVERY
          ? [ORDER_STATUSES.COMPLETED]
          : [ORDER_STATUSES.READY_FOR_PICKUP],
      [ORDER_STATUSES.READY_FOR_PICKUP]: [ORDER_STATUSES.COMPLETED],
    };

    if (
      order.channel !== ORDER_CHANNELS.ONLINE ||
      !allowedTransitions[order.status]?.includes(nextStatus)
    ) {
      throw new AppError(
        `Cannot move order from ${order.status} to ${nextStatus}`,
        409,
        "INVALID_ORDER_TRANSITION"
      );
    }

    if (nextStatus === ORDER_STATUSES.COMPLETED) {
      if (!order.inventoryReserved) {
        throw new AppError(
          "Order inventory is not reserved",
          409,
          "INVALID_RESERVATION"
        );
      }

      await inventoryService.completeReservedSale(
        order.storeId,
        order.items,
        session
      );
      order.inventoryReserved = false;
      order.completedAt = new Date();

      if (
        order.paymentStatus === PAYMENT_STATUSES.UNPAID &&
        [PAYMENT_METHODS.COD, PAYMENT_METHODS.PAY_AT_STORE].includes(
          order.paymentMethod
        )
      ) {
        order.paymentStatus = PAYMENT_STATUSES.PAID;
        order.paidByManagerId = manager._id;
        order.paidAt = new Date();
      }

      if (order.paymentStatus !== PAYMENT_STATUSES.PAID) {
        throw new AppError(
          "Online payment must be confirmed before completing this order",
          409,
          "PAYMENT_REQUIRED"
        );
      }
    }

    appendStatus(order, nextStatus, manager._id);
    await order.save({ session });
    return order;
  });
};

const cancelOrder = (orderId, actor, reason = "") =>
  runInTransaction(async (session) => {
    const order = await findOrderOrThrow(orderId, session);

    if (actor.role === USER_ROLES.CUSTOMER) {
      if (
        order.channel !== ORDER_CHANNELS.ONLINE ||
        String(order.customerId) !== String(actor._id)
      ) {
        throw new AppError(
          "You cannot cancel this order",
          403,
          "FORBIDDEN"
        );
      }

      if (order.status !== ORDER_STATUSES.PENDING) {
        throw new AppError(
          "Customers can only cancel pending orders",
          409,
          "INVALID_ORDER_STATE"
        );
      }
    } else if ([USER_ROLES.MANAGER, USER_ROLES.SALES].includes(actor.role)) {
      assertAssignedStore(actor, order.storeId);
    } else {
      assertRole(actor, [USER_ROLES.OWNER]);
    }

    if (
      [ORDER_STATUSES.COMPLETED, ORDER_STATUSES.CANCELLED].includes(order.status)
    ) {
      throw new AppError(
        "Completed or cancelled orders cannot be cancelled",
        409,
        "INVALID_ORDER_STATE"
      );
    }

    if (order.inventoryReserved) {
      await inventoryService.releaseReservedStock(
        order.storeId,
        order.items,
        session
      );
      order.inventoryReserved = false;
    }

    order.cancelledBy = actor._id;
    order.cancelledAt = new Date();
    order.cancellationReason = reason;
    appendStatus(order, ORDER_STATUSES.CANCELLED, actor._id, reason);
    await order.save({ session });
    return order;
  });

const NEEDS_REVIEW_FILTER = "NEEDS_REVIEW";

const getOrdersNeedingReview = async (query) => {
  return Order.find({
    ...query,
    status: ORDER_STATUSES.COMPLETED,
    isReviewed: false,
  })
    .populate("storeId", "name address phone")
    .sort({ createdAt: -1 })
    .lean();
};

const getOrdersForUser = async (user, filters = {}) => {
  const query = {};

  if (user.role === USER_ROLES.CUSTOMER) {
    await expireUnpaidBankTransferOrders({ customerId: user._id });
    query.customerId = user._id;
  } else if ([USER_ROLES.MANAGER, USER_ROLES.SALES].includes(user.role)) {
    if (!user.storeId) {
      throw new AppError(
        "This staff account is not assigned to a store",
        403,
        "STORE_ASSIGNMENT_REQUIRED"
      );
    }
    query.storeId = user.storeId;
  }

  if (filters.channel) {
    query.channel = filters.channel;
  }

  if (filters.status === NEEDS_REVIEW_FILTER) {
    return getOrdersNeedingReview(query);
  }

  if (filters.status) {
    const statusList = String(filters.status)
      .split(",")
      .map((status) => status.trim())
      .filter(Boolean);
    query.status = statusList.length > 1 ? { $in: statusList } : statusList[0];
  }

  if (filters.paymentStatus) {
    const paymentStatusList = String(filters.paymentStatus)
      .split(",")
      .map((status) => status.trim())
      .filter(Boolean);
    query.paymentStatus =
      paymentStatusList.length > 1
        ? { $in: paymentStatusList }
        : paymentStatusList[0];
  }

  return Order.find(query)
    .populate("storeId", "name address phone")
    .sort({ createdAt: -1 })
    .lean();
};

const getOrderForUser = async (orderId, user) => {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new AppError("Order ID is invalid", 400, "INVALID_ORDER_ID");
  }

  await expireUnpaidBankTransferOrders({ _id: orderId });

  const order = await Order.findById(orderId)
    .populate("storeId", "name address phone")
    .lean();

  if (!order) {
    throw new AppError("Order was not found", 404, "ORDER_NOT_FOUND");
  }

  if (
    user.role === USER_ROLES.CUSTOMER &&
    String(order.customerId) !== String(user._id)
  ) {
    throw new AppError("You cannot view this order", 403, "FORBIDDEN");
  }

  if (
    [USER_ROLES.MANAGER, USER_ROLES.SALES].includes(user.role) &&
    String(order.storeId?._id) !== String(user.storeId)
  ) {
    throw new AppError("You cannot view this order", 403, "FORBIDDEN");
  }

  return order;
};

module.exports = {
  approveOfflineOrder,
  cancelOrder,
  createOfflineOrder,
  createOnlineOrder,
  expireUnpaidBankTransferOrders,
  generateOrderCode,
  getOrderForUser,
  getOrdersForUser,
  payOfflineOrder,
  updateOnlineStatus,
};
