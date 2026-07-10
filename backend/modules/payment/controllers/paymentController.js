const payosService = require("../services/payosService");

const logPayos = (message, details = {}) => {
  // console.log(`[PayOS] ${message}`, details);
};

const createPayosPaymentLink = async (req, res, next) => {
  try {
    logPayos("create-link request", {
      orderId: req.params.orderId,
      userId: req.user?._id,
    });
    const payment = await payosService.createPayosPaymentLink(
      req.params.orderId,
      req.user
    );
    logPayos("create-link success", {
      orderId: req.params.orderId,
      hasQrImage: Boolean(payment.qrImage),
      qrImageLength: payment.qrImage?.length || 0,
      hasQrCode: Boolean(payment.qrCode),
      checkoutUrl: Boolean(payment.checkoutUrl),
    });
    res.status(201).json({ payment });
  } catch (error) {
    logPayos("create-link failed", {
      orderId: req.params.orderId,
      error: error.message,
      code: error.code,
    });
    next(error);
  }
};

const createPosPayosPaymentLink = async (req, res, next) => {
  try {
    const payment = await payosService.createPosPayosPaymentLink(
      req.params.orderId,
      req.user,
      {
        discountPercent: req.body.discountPercent,
      }
    );
    res.status(201).json({ payment });
  } catch (error) {
    next(error);
  }
};

const handlePayosWebhook = async (req, res, next) => {
  try {
    logPayos("webhook received", {
      orderCode: req.body?.data?.orderCode,
      code: req.body?.data?.code,
    });
    await payosService.handlePayosWebhook(req.body);
    logPayos("webhook processed", {
      orderCode: req.body?.data?.orderCode,
    });
    res.json({ success: true });
  } catch (error) {
    logPayos("webhook failed", {
      error: error.message,
      code: error.code,
    });
    next(error);
  }
};

const syncPayosPaymentStatus = async (req, res, next) => {
  try {
    logPayos("sync request", {
      orderId: req.params.orderId,
      userId: req.user?._id,
    });
    const result = await payosService.syncPayosPaymentStatus(
      req.params.orderId,
      req.user
    );
    logPayos("sync success", {
      orderId: req.params.orderId,
      payosStatus: result.payosStatus,
      paymentStatus: result.order.paymentStatus,
    });
    res.json(result);
  } catch (error) {
    logPayos("sync failed", {
      orderId: req.params.orderId,
      error: error.message,
      code: error.code,
    });
    next(error);
  }
};

const syncPosPayosPaymentStatus = async (req, res, next) => {
  try {
    const result = await payosService.syncPosPayosPaymentStatus(
      req.params.orderId,
      req.user
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const payosReturn = (_req, res) => {
  res.send("PayOS payment processed. You can return to GUTA Cosmetic.");
};

module.exports = {
  createPayosPaymentLink,
  createPosPayosPaymentLink,
  handlePayosWebhook,
  payosReturn,
  syncPosPayosPaymentStatus,
  syncPayosPaymentStatus,
};
