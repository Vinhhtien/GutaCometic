const Store = require("../../../models/Store");

const getActiveStores = () => Store.find({ isActive: true }).sort({ name: 1 }).lean();

module.exports = {
  getActiveStores,
};
