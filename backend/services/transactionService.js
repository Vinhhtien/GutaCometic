const mongoose = require("mongoose");
const AppError = require("../utils/AppError");

const isTransactionUnsupported = (error) =>
  error?.code === 20 ||
  error?.codeName === "IllegalOperation" ||
  error?.message?.includes("Transaction numbers are only allowed");

const runInTransaction = async (work) => {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await work(session);
    });

    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      throw new AppError(
        "MongoDB transactions require a replica set. Configure MongoDB as a single-node replica set before using order workflows.",
        503,
        "TRANSACTIONS_UNAVAILABLE"
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  runInTransaction,
};
