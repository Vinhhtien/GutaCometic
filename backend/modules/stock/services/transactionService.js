const mongoose = require("mongoose");
const { getDatabaseRuntime } = require("../../../config/db");

const isTransactionUnsupported = (error) =>
  error?.code === 20 ||
  error?.codeName === "IllegalOperation" ||
  error?.message?.includes("Transaction numbers are only allowed");

const runInTransaction = async (work) => {
  const runtime = getDatabaseRuntime();

  if (runtime.transactionsSupported === false) {
    return work(null);
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await work(session);
    });

    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return work(null);
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  runInTransaction,
};
