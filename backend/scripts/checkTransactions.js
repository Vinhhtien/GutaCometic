require("dotenv").config();

const mongoose = require("mongoose");
const connectDatabase = require("../config/db");
const { getDatabaseRuntime } = require("../config/db");

const checkTransactions = async () => {
  try {
    await connectDatabase();
    const runtime = getDatabaseRuntime();

    if (!runtime.transactionsSupported) {
      console.log(
        "MongoDB is running in standalone mode. The project can still connect and run using compatibility mode."
      );
      console.log(
        `Effective connection: ${runtime.effectiveUri || process.env.MONGODB_URI}`
      );
      return;
    }

    console.log(
      `MongoDB transactions ready. Replica set: ${runtime.replicaSetName}`
    );
  } catch (error) {
    console.error(`Transaction check failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

checkTransactions();
