/**
 * Migration: Thêm trường isReviewed = false cho tất cả đơn hàng cũ
 * Chạy: node scripts/migrateIsReviewed.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDatabase = require("../config/db");

async function migrate() {
  await connectDatabase();
  console.log("✅ Đã kết nối MongoDB");

  const result = await mongoose.connection
    .collection("orders")
    .updateMany(
      { isReviewed: { $exists: false } }, // Chỉ update đơn hàng chưa có trường này
      { $set: { isReviewed: false } }
    );

  console.log(`✅ Đã cập nhật ${result.modifiedCount} đơn hàng cũ → isReviewed: false`);
  await mongoose.disconnect();
  console.log("🔌 Đã ngắt kết nối MongoDB");
}

migrate().catch((err) => {
  console.error("❌ Lỗi migration:", err.message);
  process.exit(1);
});
