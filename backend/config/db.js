const mongoose = require("mongoose");

const DEFAULT_LOCAL_MONGODB_URI = "mongodb://127.0.0.1:27017/guta_cosmetic_pos";

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || DEFAULT_LOCAL_MONGODB_URI;

  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
};

module.exports = connectDatabase;
