require("dotenv").config();

const mongoose = require("mongoose");
const connectDatabase = require("../config/db");
const Product = require("../models/Product");
const Store = require("../models/Store");
const StoreInventory = require("../models/StoreInventory");
const { STORE_TYPES } = require("../constants/business");

const DEMO_BRANCHES = [
  {
    name: "GUTA Cosmetic - Chi nhánh 2",
    phone: "0281234568",
  },
  {
    name: "GUTA Cosmetic - Chi nhánh 3",
    phone: "0281234569",
  },
];

const getBaseStore = async () => {
  const store = await Store.findOne({ isActive: true }).sort({ createdAt: 1 });

  if (!store) {
    throw new Error("No active base store found. Run product/store seed first.");
  }

  return store;
};

const seedInventoryForStore = async (storeId) => {
  const products = await Product.find({ isActive: true }).select("_id").lean();

  for (const product of products) {
    await StoreInventory.findOneAndUpdate(
      { storeId, productId: product._id },
      {
        $setOnInsert: {
          storeId,
          productId: product._id,
          totalStock: 50,
          reservedStock: 0,
          lowStockThreshold: 5,
        },
      },
      { upsert: true, runValidators: true }
    );
  }

  return products.length;
};

const seedDemoStores = async () => {
  await connectDatabase();

  const baseStore = await getBaseStore();

  for (const branch of DEMO_BRANCHES) {
    const store = await Store.findOneAndUpdate(
      { name: branch.name },
      {
        $set: {
          name: branch.name,
          type: STORE_TYPES.BRANCH,
          address: baseStore.address,
          phone: branch.phone,
          isActive: true,
        },
      },
      { new: true, runValidators: true, upsert: true }
    );

    const inventoryCount = await seedInventoryForStore(store._id);

    console.log(
      `Seeded store: ${store.name} | address: ${store.address} | inventory products: ${inventoryCount}`
    );
  }
};

seedDemoStores()
  .then(async () => {
    await mongoose.disconnect();
    console.log("Demo stores seed completed");
  })
  .catch(async (error) => {
    console.error("Demo stores seed failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
