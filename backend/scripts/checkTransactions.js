require("dotenv").config();

const mongoose = require("mongoose");

const checkTransactions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });

    if (!hello.setName) {
      console.error(
        "MongoDB is running as standalone. Order workflows require a replica set."
      );
      console.error(
        "Start MongoDB with --replSet rs0, run rs.initiate(), then add ?replicaSet=rs0 to MONGODB_URI."
      );
      process.exitCode = 1;
      return;
    }

    console.log(`MongoDB transactions ready. Replica set: ${hello.setName}`);
  } catch (error) {
    console.error(`Transaction check failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

checkTransactions();
