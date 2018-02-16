const mongoose = require("mongoose");
const mongo = require("./helpers/mongo");
const cron = require("node-cron");
const ip = require("ip");

// Load environment variables from file
require("dotenv").config({ path: "variables.env" });

// Store the project root directory as an environment variable, so it can be easily accessed in other JS files
process.env.ROOT = __dirname;

// Initiate the database connection
mongoose.connect(process.env.DATABASE, { useMongoClient: true });
mongoose.Promise = global.Promise;
mongoose.connection.on("error", err => {
  console.error(`🚫 → ${err.message}`);
});

// Load the MongoDB models
require("./models/Vehicle");
require("./models/User");

// Schedule daily backups at 4am
cron.schedule("0 4 * * *", () => {
  mongo.backup()
});

// Load the server files & set the port to 8888
const app = require("./app");
app.set("port", process.env.PORT || 8888);

// Initiate the server
const server = app.listen(app.get("port"), () => {
  console.log(`Express running → PORT ${server.address().port}`);
  if (process.env.NODE_ENV === "production") {
    console.log("⚡  Production Mode ⚡");
  } else {
    console.log("🐌  Development Mode 🐌 ");
  }
  console.log("Local address: " + ip.address());
});
