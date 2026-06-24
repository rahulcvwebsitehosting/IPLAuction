const mongoose = require("mongoose");

const url =
  process.env.NODE_ENV !== "production"
    ? process.env.DEV_MONGO_URL
    : process.env.PROD_MONGO_URL;

if (!process.env.DEV_MONGO_URL && !process.env.PROD_MONGO_URL) {
  console.warn(
    "Warning: Neither DEV_MONGO_URL nor PROD_MONGO_URL is set. The database will not be connected."
  );
}

let db;
if (url) {
  db = mongoose
    .connect(url, {
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Connected to the mongodb database");
    })
    .catch((error) => {
      console.log(error.name);
      console.log(error);
    });
} else {
  db = Promise.resolve();
}

module.exports = db;
