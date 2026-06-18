const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const mongoose = require("mongoose");

const replicaPort = Number(process.env.MONGODB_REPLICA_PORT || 27018);
const replicaSetName = process.env.MONGODB_REPLICA_SET || "rs0";
const host = `127.0.0.1:${replicaPort}`;
const directUri = `mongodb://${host}/admin?directConnection=true`;
const replicaUri = `mongodb://${host}/admin?replicaSet=${replicaSetName}`;
const dataPath = path.join(__dirname, "..", ".mongodb-rs-data");
const logPath = path.join(dataPath, "mongod.log");

const wait = (duration) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration);
  });

const findMongod = () => {
  if (process.env.MONGOD_PATH && fs.existsSync(process.env.MONGOD_PATH)) {
    return process.env.MONGOD_PATH;
  }

  const serverRoot = "C:\\Program Files\\MongoDB\\Server";

  if (process.platform === "win32" && fs.existsSync(serverRoot)) {
    const versions = fs
      .readdirSync(serverRoot)
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));

    for (const version of versions) {
      const candidate = path.join(serverRoot, version, "bin", "mongod.exe");
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return "mongod";
};

const connect = async (uri, timeout = 2000) => {
  const connection = await mongoose
    .createConnection(uri, {
      serverSelectionTimeoutMS: timeout,
    })
    .asPromise();
  return connection;
};

const isRunning = async () => {
  try {
    const connection = await connect(directUri);
    await connection.close();
    return true;
  } catch {
    return false;
  }
};

const startMongod = () => {
  fs.mkdirSync(dataPath, { recursive: true });

  const child = spawn(
    findMongod(),
    [
      "--dbpath",
      dataPath,
      "--port",
      String(replicaPort),
      "--bind_ip",
      "127.0.0.1",
      "--replSet",
      replicaSetName,
      "--logpath",
      logPath,
      "--logappend",
    ],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }
  );

  child.unref();
};

const waitForMongo = async () => {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    if (await isRunning()) {
      return;
    }
    await wait(1000);
  }

  throw new Error(`MongoDB did not start. Check ${logPath}`);
};

const initiateReplicaSet = async () => {
  const connection = await connect(directUri, 5000);

  try {
    const hello = await connection.db.admin().command({ hello: 1 });

    if (!hello.setName) {
      await connection.db.admin().command({
        replSetInitiate: {
          _id: replicaSetName,
          members: [{ _id: 0, host }],
        },
      });
    }
  } catch (error) {
    if (
      error.codeName !== "AlreadyInitialized" &&
      !error.message.includes("already initialized")
    ) {
      throw error;
    }
  } finally {
    await connection.close();
  }
};

const waitForPrimary = async () => {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const connection = await connect(replicaUri, 3000);
      const hello = await connection.db.admin().command({ hello: 1 });
      await connection.close();

      if (hello.isWritablePrimary) {
        return;
      }
    } catch {
      // Replica set election is still in progress.
    }

    await wait(1000);
  }

  throw new Error("MongoDB replica set did not elect a primary");
};

const main = async () => {
  if (!(await isRunning())) {
    console.log(`Starting project MongoDB replica set on port ${replicaPort}...`);
    startMongod();
    await waitForMongo();
  }

  await initiateReplicaSet();
  await waitForPrimary();
  console.log(`MongoDB replica set ${replicaSetName} is ready on port ${replicaPort}.`);
};

main().catch((error) => {
  console.error(`Unable to start project MongoDB: ${error.message}`);
  process.exitCode = 1;
});
