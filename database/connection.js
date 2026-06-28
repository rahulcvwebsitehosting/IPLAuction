const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

async function connect() {
  let uri;

  if (process.env.NODE_ENV === "production") {
    uri = process.env.PROD_MONGO_URL;
  } else if (process.env.DEV_MONGO_URL) {
    uri = process.env.DEV_MONGO_URL;
  }

  if (!uri) {
    console.log("No MongoDB URL found. Starting a fake in-memory MongoDB...");
    const mongo = await MongoMemoryServer.create();
    uri = mongo.getInstanceUri();
    console.log("Fake MongoDB started at", uri);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

connect().catch((err) => {
  console.error("MongoDB connection failed:", err.message);
  process.exit(1);
});
