// .env.testing is optional now: it only gives JWT_SECRET (MONGO_URI is not used)
require("dotenv").config({
  path: ".env.testing",
  override: true,
  quiet: true,
});

process.env.JWT_SECRET ||= "test-secret";

const os = require("os");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

/*
  Every test file gets its own MongoDB in memory (no Atlas, no internet).
  It starts empty and is deleted after the file finishes.
  The first run downloads the MongoDB binary once (it is cached after that).
*/
let mongod;

const connectTestDB = async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri("testingDataBase");

  // Safety: tests may only use the local in-memory server
  if (!uri.startsWith("mongodb://127.0.0.1:")) {
    await mongod.stop();
    throw new Error(`Tests must use the in-memory database, got: ${uri}`);
  }

  await mongoose.connect(uri, {
    // MongoDB driver 7 loads "os" with a dynamic import(), which Jest blocks.
    // Then the handshake has no driver info and the server refuses it.
    // Giving "os" here avoids that import.
    runtimeAdapters: { os },
  });

  // Build unique indexes now (e.g. confirmation.code), before the tests run
  await Promise.all(
    Object.values(mongoose.connection.models).map((model) => model.init()),
  );
};

const disconnectTestDB = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};

module.exports = { connectTestDB, disconnectTestDB };
