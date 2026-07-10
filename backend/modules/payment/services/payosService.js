const PayosModule = require("@payos/node");
const QRCode = require("qrcode");
const Order = require("../../../models/Order");
const AppError = require("../../../utils/AppError");
const orderService = require("../../order/services/orderService");
const inventoryService = require("../../stock/services/inventoryService");
const {
  ORDER_CHANNELS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  USER_ROLES,
} = require("../../../constants/business");

const PayOS = PayosModule.PayOS || PayosModule.default || PayosModule;
const PAYOS_PAYMENT_TTL_SECONDS = 15 * 60;

const logPayos = (message, details = {}) => {
  // console.log(`[PayOS] ${message}`, details);
};

const compactDescription = (order) =>
  `GUTA ${String(order.orderCode).slice(-6)}`.slice(0, 25);

const getConfig = () => {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  const returnUrl = process.env.PAYOS_RETURN_URL;
  const cancelUrl = process.env.PAYOS_CANCEL_URL;

  if (!clientId || !apiKey || !checksumKey || !returnUrl || !cancelUrl) {
    throw new AppError(
      "PayOS is not configured",
      503,
      "PAYOS_NOT_CONFIGURED"
    );
  }

  return {
    apiKey,
    cancelUrl,
    checksumKey,
    clientId,
    returnUrl,
  };
};

const createPayOSClient = () => {
  const config = getConfig();

  return {
    config,
    payOS: new PayOS({
      clientId: config.clientId,
      apiKey: config.apiKey,
      checksumKey: config.checksumKey,
    }),
  };
};

const generatePaymentOrderCode = () => {
  const randomSuffix = Math.floor(Math.random() * 900) + 100;
  return Number(`${Date.now()}${randomSuffix}`);
};

const assertCustomerCanPayOrder = (order, customer, options = {}) => {
  if (customer.role !== USER_ROLES.CUSTOMER) {
    throw new AppError(
      "Only customers can pay online orders",
      403,
      "FORBIDDEN"
    );
  }

  if (order.channel !== ORDER_CHANNELS.ONLINE) {
    throw new AppError(
      "Only online orders can be paid with PayOS",
      400,
      "INVALID_ORDER_CHANNEL"
    );
  }

  if (String(order.customerId) !== String(customer._id)) {
    throw new AppError("You cannot pay this order", 403, "FORBIDDEN");
  }

  if (!options.allowPaid && order.paymentStatus === PAYMENT_STATUSES.PAID) {
    throw new AppError(
      "This order has already been paid",
      409,
      "ORDER_ALREADY_PAID"
    );
  }

  if (
    !options.allowExpired &&
    (order.status === ORDER_STATUSES.CANCELLED ||
      order.paymentStatus === PAYMENT_STATUSES.FAILED)
  ) {
    throw new AppError(
      "This payment QR has expired. Please create a new order.",
      410,
      "PAYMENT_QR_EXPIRED"
    );
  }

  if (order.paymentMethod !== PAYMENT_METHODS.BANK_TRANSFER) {
    throw new AppError(
      "This order does not use bank transfer payment",
      400,
      "INVALID_PAYMENT_METHOD"
    );
  }
};

const assertManagerCanPayOfflineOrder = (order, manager, options = {}) => {
  if (manager.role !== USER_ROLES.MANAGER) {
    throw new AppError(
      "Only managers can receive POS payments",
      403,
      "FORBIDDEN"
    );
  }

  if (String(order.storeId) !== String(manager.storeId)) {
    throw new AppError("You cannot pay this order", 403, "FORBIDDEN");
  }

  if (order.channel !== ORDER_CHANNELS.OFFLINE) {
    throw new AppError(
      "Only offline orders can be paid at POS",
      400,
      "INVALID_ORDER_CHANNEL"
    );
  }

  if (!options.allowPaid && order.paymentStatus === PAYMENT_STATUSES.PAID) {
    throw new AppError(
      "This order has already been paid",
      409,
      "ORDER_ALREADY_PAID"
    );
  }

  if (
    order.status !== ORDER_STATUSES.PENDING_PAYMENT ||
    !order.inventoryReserved
  ) {
    throw new AppError(
      "This order is not ready for POS payment",
      409,
      "INVALID_ORDER_STATE"
    );
  }
};

const mapPayosItem = (item) => ({
  name: item.name.slice(0, 100),
  quantity: item.quantity,
  price: item.unitPrice,
});

const createQrImage = (qrCode) =>
  qrCode
    ? QRCode.toDataURL(qrCode, {
        errorCorrectionLevel: "M",
        margin: 2,
        scale: 8,
      })
    : null;

const buildPaymentResponse = async (order) => {
  const qrPayload = order.qrCode || order.checkoutUrl;
  const qrImage = await createQrImage(qrPayload);

  return {
    checkoutUrl: order.checkoutUrl,
    expiredAt: order.paymentExpiresAt,
    paymentLinkId: order.paymentLinkId,
    qrImage,
    qrCode: qrPayload,
  };
};

const hasActivePaymentLink = (order) =>
  Boolean(order.checkoutUrl && order.paymentExpiresAt > new Date());

const getNextPaymentOrderCode = (order) =>
  hasActivePaymentLink(order) && order.paymentOrderCode
    ? order.paymentOrderCode
    : generatePaymentOrderCode();

const createPayosPaymentLink = async (orderId, customer) => {
  await orderService.expireUnpaidBankTransferOrders({ _id: orderId });

  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError("Order was not found", 404, "ORDER_NOT_FOUND");
  }

  assertCustomerCanPayOrder(order, customer, { allowPaid: true });

  if (hasActivePaymentLink(order)) {
    logPayos("reuse active payment link", {
      orderId,
      paymentOrderCode: order.paymentOrderCode,
      qrCodeLength: order.qrCode?.length || 0,
    });
    return buildPaymentResponse(order);
  }

  const { config, payOS } = createPayOSClient();
  const paymentOrderCode = getNextPaymentOrderCode(order);
  const expiredAt = Math.floor(Date.now() / 1000) + PAYOS_PAYMENT_TTL_SECONDS;

  const paymentData = {
    orderCode: paymentOrderCode,
    amount: order.totalPrice,
    description: compactDescription(order),
    items: order.items.map(mapPayosItem),
    returnUrl: config.returnUrl,
    cancelUrl: config.cancelUrl,
    expiredAt,
  };

  let paymentLink;

  try {
    logPayos("creating payment link at provider", {
      orderId,
      paymentOrderCode,
      amount: order.totalPrice,
      expiredAt,
    });
    paymentLink = await payOS.paymentRequests.create(paymentData);
  } catch (error) {
    logPayos("provider create failed", {
      orderId,
      paymentOrderCode,
      error: error.message,
    });
    throw new AppError(
      error.message || "Unable to create PayOS payment link",
      502,
      "PAYOS_CREATE_LINK_FAILED"
    );
  }

  if (!paymentLink?.checkoutUrl) {
    throw new AppError(
      "PayOS did not return a checkout URL",
      502,
      "PAYOS_CREATE_LINK_FAILED",
      paymentLink
    );
  }

  order.paymentProvider = "PAYOS";
  order.paymentOrderCode = paymentOrderCode;
  order.paymentLinkId = paymentLink.paymentLinkId || "";
  order.checkoutUrl = paymentLink.checkoutUrl;
  order.qrCode = paymentLink.qrCode || "";
  order.paymentExpiresAt = new Date(expiredAt * 1000);
  order.paymentProviderUpdatedAt = new Date();
  await order.save();

  logPayos("payment link saved", {
    orderId,
    paymentOrderCode,
    paymentLinkId: order.paymentLinkId,
    qrCodeLength: order.qrCode?.length || 0,
  });

  return buildPaymentResponse(order);
};

const completeOfflinePayosOrder = async (order, managerId = null) => {
  if (
    order.channel !== ORDER_CHANNELS.OFFLINE ||
    order.status !== ORDER_STATUSES.PENDING_PAYMENT
  ) {
    return order;
  }

  if (order.inventoryReserved) {
    await inventoryService.completeReservedSale(order.storeId, order.items);
    order.inventoryReserved = false;
  }

  order.paymentMethod = PAYMENT_METHODS.BANK_TRANSFER;
  order.paymentStatus = PAYMENT_STATUSES.PAID;
  order.paidByManagerId = managerId || order.paidByManagerId || null;
  order.paidAt = order.paidAt || new Date();
  order.completedAt = order.completedAt || new Date();
  await orderService.awardCustomerPoints(order);
  order.status = ORDER_STATUSES.COMPLETED;
  order.statusHistory.push({
    status: ORDER_STATUSES.COMPLETED,
    changedBy: managerId,
    note: "POS bank transfer payment confirmed by PayOS",
  });

  return order;
};

const createPosPayosPaymentLink = async (orderId, manager, options = {}) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError("Order was not found", 404, "ORDER_NOT_FOUND");
  }

  assertManagerCanPayOfflineOrder(order, manager, { allowPaid: true });

  if (hasActivePaymentLink(order)) {
    return buildPaymentResponse(order);
  }

  const discountPercent = Math.max(
    0,
    Math.min(100, Number(options.discountPercent || 0))
  );
  const maxDiscountAmount = order.subtotal + order.shippingFee;
  order.discountAmount = Math.min(
    maxDiscountAmount,
    Math.floor((maxDiscountAmount * discountPercent) / 100)
  );
  order.pointsUsed = 0;
  const payableAmount = Math.max(
    0,
    order.subtotal + order.shippingFee - order.discountAmount
  );

  const { config, payOS } = createPayOSClient();
  const paymentOrderCode = getNextPaymentOrderCode(order);
  const expiredAt = Math.floor(Date.now() / 1000) + PAYOS_PAYMENT_TTL_SECONDS;

  const paymentData = {
    orderCode: paymentOrderCode,
    amount: payableAmount,
    description: compactDescription(order),
    items: [
      {
        name: `POS ${String(order.orderCode).slice(-12)}`.slice(0, 100),
        quantity: 1,
        price: payableAmount,
      },
    ],
    returnUrl: config.returnUrl,
    cancelUrl: config.cancelUrl,
    expiredAt,
  };

  let paymentLink;

  try {
    paymentLink = await payOS.paymentRequests.create(paymentData);
  } catch (error) {
    throw new AppError(
      error.message || "Unable to create PayOS payment link",
      502,
      "PAYOS_CREATE_LINK_FAILED"
    );
  }

  if (!paymentLink?.checkoutUrl) {
    throw new AppError(
      "PayOS did not return a checkout URL",
      502,
      "PAYOS_CREATE_LINK_FAILED",
      paymentLink
    );
  }

  order.paymentMethod = PAYMENT_METHODS.BANK_TRANSFER;
  order.paymentProvider = "PAYOS";
  order.paymentOrderCode = paymentOrderCode;
  order.paymentLinkId = paymentLink.paymentLinkId || "";
  order.checkoutUrl = paymentLink.checkoutUrl;
  order.qrCode = paymentLink.qrCode || "";
  order.paymentExpiresAt = new Date(expiredAt * 1000);
  order.paymentProviderUpdatedAt = new Date();
  await order.save();

  return buildPaymentResponse(order);
};

const handlePayosWebhook = async (body) => {
  let data;

  try {
    const { payOS } = createPayOSClient();
    data = payOS.webhooks.verify(body);
  } catch (error) {
    throw new AppError(
      error.message || "PayOS webhook signature is invalid",
      400,
      "PAYOS_INVALID_WEBHOOK"
    );
  }

  const order = await Order.findOne({ paymentOrderCode: data.orderCode });

  if (!order) {
    throw new AppError("Order was not found", 404, "ORDER_NOT_FOUND");
  }

  order.paymentProvider = "PAYOS";
  order.paymentProviderUpdatedAt = new Date();
  order.paymentReference = data.reference || order.paymentReference;

  if (data.code === "00") {
    if (order.channel === ORDER_CHANNELS.OFFLINE) {
      await completeOfflinePayosOrder(order);
    } else if (order.status === ORDER_STATUSES.CANCELLED) {
      if (!order.inventoryReserved) {
        await inventoryService.reserveStock(order.storeId, order.items);
        order.inventoryReserved = true;
      }

      order.status = ORDER_STATUSES.PENDING;
      order.cancelledAt = null;
      order.cancellationReason = "";
      order.statusHistory.push({
        status: ORDER_STATUSES.PENDING,
        changedBy: null,
        note: "PayOS confirmed payment after the order was marked expired",
      });
    }

    if (order.channel !== ORDER_CHANNELS.OFFLINE) {
      order.paymentStatus = PAYMENT_STATUSES.PAID;
      order.paidAt = order.paidAt || new Date();
    }
  } else if (order.paymentStatus !== PAYMENT_STATUSES.PAID) {
    order.paymentStatus = PAYMENT_STATUSES.FAILED;
  }

  await order.save();

  return order;
};

const applyPaymentLinkStatus = async (order, paymentLink, actorId = null) => {
  order.paymentProvider = "PAYOS";
  order.paymentProviderUpdatedAt = new Date();

  const latestTransaction = paymentLink.transactions?.[0];

  if (latestTransaction?.reference) {
    order.paymentReference = latestTransaction.reference;
  }

  if (paymentLink.status === "PAID") {
    if (order.channel === ORDER_CHANNELS.OFFLINE) {
      await completeOfflinePayosOrder(order, actorId);
    } else if (order.status === ORDER_STATUSES.CANCELLED) {
      if (!order.inventoryReserved) {
        await inventoryService.reserveStock(order.storeId, order.items);
        order.inventoryReserved = true;
      }

      order.status = ORDER_STATUSES.PENDING;
      order.cancelledAt = null;
      order.cancellationReason = "";
      order.statusHistory.push({
        status: ORDER_STATUSES.PENDING,
        changedBy: null,
        note: "PayOS confirmed payment after the order was marked expired",
      });
    }

    if (order.channel !== ORDER_CHANNELS.OFFLINE) {
      order.paymentStatus = PAYMENT_STATUSES.PAID;
      order.paidAt = order.paidAt || new Date();
    }
  } else if (
    (["CANCELLED", "EXPIRED", "FAILED"].includes(paymentLink.status) ||
      (order.paymentExpiresAt && order.paymentExpiresAt <= new Date())) &&
    order.paymentStatus !== PAYMENT_STATUSES.PAID
  ) {
    await orderService.expireUnpaidBankTransferOrders({ _id: order._id });
    return Order.findById(order._id);
  }

  await order.save();

  return order;
};

const syncPayosPaymentStatus = async (orderId, customer) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError("Order was not found", 404, "ORDER_NOT_FOUND");
  }

  assertCustomerCanPayOrder(order, customer, { allowExpired: true });

  if (!order.paymentOrderCode) {
    throw new AppError(
      "This order does not have a PayOS payment request",
      400,
      "PAYOS_PAYMENT_NOT_CREATED"
    );
  }

  const { payOS } = createPayOSClient();
  const paymentLink = await payOS.paymentRequests.get(order.paymentOrderCode);
  logPayos("provider sync result", {
    orderId,
    paymentOrderCode: order.paymentOrderCode,
    status: paymentLink.status,
    amountPaid: paymentLink.amountPaid,
    amountRemaining: paymentLink.amountRemaining,
  });
  const updatedOrder = await applyPaymentLinkStatus(order, paymentLink);

  return {
    order: updatedOrder,
    payosStatus: paymentLink.status,
  };
};

const syncPosPayosPaymentStatus = async (orderId, manager) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new AppError("Order was not found", 404, "ORDER_NOT_FOUND");
  }

  assertManagerCanPayOfflineOrder(order, manager, { allowPaid: true });

  if (!order.paymentOrderCode) {
    throw new AppError(
      "This order does not have a PayOS payment request",
      400,
      "PAYOS_PAYMENT_NOT_CREATED"
    );
  }

  const { payOS } = createPayOSClient();
  const paymentLink = await payOS.paymentRequests.get(order.paymentOrderCode);
  const updatedOrder = await applyPaymentLinkStatus(
    order,
    paymentLink,
    manager._id
  );

  return {
    order: updatedOrder,
    payosStatus: paymentLink.status,
  };
};

module.exports = {
  createPayosPaymentLink,
  createPosPayosPaymentLink,
  handlePayosWebhook,
  syncPosPayosPaymentStatus,
  syncPayosPaymentStatus,
};
