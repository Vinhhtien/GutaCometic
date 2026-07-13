require("dotenv").config();

const mongoose = require("mongoose");
const connectDatabase = require("../config/db");
const User = require("../models/User");

const main = async () => {
  await connectDatabase();
  const result = await User.syncIndexes();
  console.log(`User indexes synchronized. Dropped: ${result.join(", ") || "none"}`);
};

main()
  .catch((error) => {
    console.error(`Unable to synchronize user indexes: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
