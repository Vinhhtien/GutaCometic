require("dotenv").config();

const mongoose = require("mongoose");
const connectDatabase = require("../config/db");
const Store = require("../models/Store");
const User = require("../models/User");
const { STORE_TYPES, USER_ROLES } = require("../constants/business");

const DEMO_PASSWORD = "Letien@0110";

const demoUsers = [
  {
    fullName: "Manager Demo",
    email: "manager.guta.demo@gmail.com",
    phone: "0909000001",
    role: USER_ROLES.MANAGER,
  },
  {
    fullName: "Sales Demo",
    email: "sales.guta.demo@gmail.com",
    phone: "0909000002",
    role: USER_ROLES.SALES,
  },
  {
    fullName: "Customer Demo",
    email: "customer.guta.demo@gmail.com",
    phone: "0909000003",
    role: USER_ROLES.CUSTOMER,
  },
];

const ensureDemoStore = async () => {
  const existingStore = await Store.findOne({ isActive: true }).sort({
    createdAt: 1,
  });

  if (existingStore) {
    return existingStore;
  }

  return Store.create({
    name: "GUTA Cosmetic - Demo Store",
    type: STORE_TYPES.BRANCH,
    address: "Demo Store, Ho Chi Minh City",
    phone: "0280000000",
    isActive: true,
  });
};

const seedDemoUsers = async () => {
  await connectDatabase();

  const store = await ensureDemoStore();

  for (const demoUser of demoUsers) {
    const isStoreRole = [USER_ROLES.MANAGER, USER_ROLES.SALES].includes(
      demoUser.role
    );

    const user = await User.findOne({
      $or: [{ email: demoUser.email }, { phone: demoUser.phone }],
    }).select("+password");

    if (user) {
      user.fullName = demoUser.fullName;
      user.phone = demoUser.phone;
      user.role = demoUser.role;
      user.password = DEMO_PASSWORD;
      user.emailVerified = true;
      user.authProvider = "LOCAL";
      user.address = isStoreRole ? store.address : "Demo customer address";
      user.storeId = isStoreRole ? store._id : null;
      user.isActive = true;
      user.disabledAt = null;
      user.disabledReason = "";
      await user.save();
    } else {
      await User.create({
        ...demoUser,
        password: DEMO_PASSWORD,
        emailVerified: true,
        authProvider: "LOCAL",
        address: isStoreRole ? store.address : "Demo customer address",
        storeId: isStoreRole ? store._id : null,
        isActive: true,
      });
    }

    console.log(
      `Seeded ${demoUser.role}: ${demoUser.email} / ${DEMO_PASSWORD}`
    );
  }

  console.log(`Demo store: ${store.name}`);
};

seedDemoUsers()
  .then(async () => {
    await mongoose.disconnect();
    console.log("Demo users seed completed");
  })
  .catch(async (error) => {
    console.error("Demo users seed failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
