const orderService = require("../services/orderService");

const createOnlineOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOnlineOrder(req.body, req.user);
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
};

const createOfflineOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOfflineOrder(req.body, req.user);
    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
};

const approveOfflineOrder = async (req, res, next) => {
  try {
    const order = await orderService.approveOfflineOrder(
      req.params.orderId,
      req.user
    );
    res.json({ order });
  } catch (error) {
    next(error);
  }
};

const payOfflineOrder = async (req, res, next) => {
  try {
    const order = await orderService.payOfflineOrder(
      req.params.orderId,
      req.body.paymentMethod,
      req.user
    );
    res.json({ order });
  } catch (error) {
    next(error);
  }
};

const updateOnlineStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOnlineStatus(
      req.params.orderId,
      req.body.status,
      req.user
    );
    res.json({ order });
  } catch (error) {
    next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const order = await orderService.cancelOrder(
      req.params.orderId,
      req.user,
      req.body.reason
    );
    res.json({ order });
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getOrdersForUser(req.user, req.query);
    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderForUser(
      req.params.orderId,
      req.user
    );
    res.json({ order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  approveOfflineOrder,
  cancelOrder,
  createOfflineOrder,
  createOnlineOrder,
  getOrderById,
  getOrders,
  payOfflineOrder,
  updateOnlineStatus,
};
