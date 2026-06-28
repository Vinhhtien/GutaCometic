const storeService = require("../services/storeService");

const getStores = async (req, res, next) => {
  try {
    const stores = await storeService.getActiveStores();
    res.json({ stores });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStores,
};
