const mongoose = require("mongoose");

const DEFAULT_LOCAL_MONGODB_URI =
  "mongodb://127.0.0.1:27017/guta_cosmetic_pos";

const databaseRuntime = {
  effectiveUri: null,
  replicaSetName: null,
  requestedUri: null,
  topology: "unknown",
  transactionsSupported: null,
  usedStandaloneFallback: false,
};

const stripReplicaSetParam = (mongoUri) => {
  const [base, queryString] = String(mongoUri).split("?");

  if (!queryString) {
    return mongoUri;
  }

  const filteredParams = queryString
    .split("&")
    .filter((param) => !/^replicaSet=/i.test(param));

  return filteredParams.length > 0 ? `${base}?${filteredParams.join("&")}` : base;
};

const isReplicaSetSelectionIssue = (error) =>
  error?.name === "MongooseServerSelectionError" ||
  /server selection timed out/i.test(error?.message || "") ||
  /replicasetnoprimary/i.test(error?.message || "") ||
  /replica set/i.test(error?.message || "");

const shouldPreferStandaloneUri = (mongoUri) =>
  /^(mongodb:\/\/)(127\.0\.0\.1|localhost)/i.test(String(mongoUri)) &&
  /(?:\?|&)replicaSet=/i.test(String(mongoUri));

const detectDatabaseRuntime = async () => {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });

  return {
    replicaSetName: hello.setName || null,
    topology: hello.setName ? "replicaSet" : "standalone",
    transactionsSupported: Boolean(hello.setName),
  };
};

const connectDatabase = async () => {
  const requestedUri = process.env.MONGODB_URI || DEFAULT_LOCAL_MONGODB_URI;
  const preferredUri = shouldPreferStandaloneUri(requestedUri)
    ? stripReplicaSetParam(requestedUri)
    : requestedUri;
  let effectiveUri = preferredUri;
  let usedStandaloneFallback = preferredUri !== requestedUri;

  try {
    await mongoose.connect(preferredUri);
  } catch (error) {
    const fallbackUri = stripReplicaSetParam(requestedUri);

    if (
      fallbackUri !== effectiveUri &&
      isReplicaSetSelectionIssue(error)
    ) {
      await mongoose.disconnect().catch(() => {});
      await mongoose.connect(fallbackUri);
      effectiveUri = fallbackUri;
      usedStandaloneFallback = true;
    } else {
      throw error;
    }
  }

  const runtime = await detectDatabaseRuntime();
  Object.assign(databaseRuntime, {
    effectiveUri,
    requestedUri,
    usedStandaloneFallback,
    ...runtime,
  });

  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  if (usedStandaloneFallback) {
    console.log(
      "MongoDB URI fallback enabled: connected without replicaSet for local standalone mode."
    );
  }

  if (!runtime.transactionsSupported) {
    console.log(
      "MongoDB standalone mode detected: transactional workflows will run in compatibility mode."
    );
  }
};

const getDatabaseRuntime = () => ({ ...databaseRuntime });

module.exports = connectDatabase;
module.exports.getDatabaseRuntime = getDatabaseRuntime;
module.exports.stripReplicaSetParam = stripReplicaSetParam;
