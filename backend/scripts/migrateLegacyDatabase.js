require("dotenv").config();

const mongoose = require("mongoose");

const sourceUri =
  process.env.MONGODB_LEGACY_URI ||
  "mongodb://127.0.0.1:27017/guta_cosmetic_pos";
const targetUri = process.env.MONGODB_URI;

const migrate = async () => {
  const source = await mongoose.createConnection(sourceUri).asPromise();
  const target = await mongoose.createConnection(targetUri).asPromise();

  try {
    const collections = await source.db.listCollections().toArray();

    for (const { name } of collections) {
      if (name.startsWith("system.")) {
        continue;
      }

      const sourceCollection = source.db.collection(name);
      const targetCollection = target.db.collection(name);
      const documents = await sourceCollection.find({}).toArray();

      if (documents.length > 0) {
        await targetCollection.bulkWrite(
          documents.map((document) => ({
            replaceOne: {
              filter: { _id: document._id },
              replacement: document,
              upsert: true,
            },
          }))
        );
      }

      console.log(`Migrated ${documents.length} document(s) from ${name}`);
    }
  } finally {
    await Promise.all([source.close(), target.close()]);
  }
};

migrate().catch((error) => {
  console.error(`Database migration failed: ${error.message}`);
  process.exitCode = 1;
});
