process.env.ROOT = __dirname;

const mongoose = require("mongoose");
const mongo = require("./helpers/mongo");
const cron = require("node-cron");
const sitemap = require("./helpers/sitemap");
const ip = require("ip");

// Load environment variables from file
require("dotenv").config({ path: "variables.env" });


// Initiate the database connection
mongoose.connect(process.env.DATABASE, {
  useMongoClient: true,
  autoReconnect: true,
  reconnectTries: Number.MAX_VALUE,
  reconnectInterval: 1000
}, err => {
  if (err) {
    console.error("🚫 Error connecting to MongoDB");
    console.error(err.message)
  } else {
    console.log("Connected to MongoDB")
  }
});
mongoose.Promise = global.Promise;

// Load the MongoDB models
require("./models/Vehicle");
require("./models/User");

// Schedule daily backups at 4am
cron.schedule("0 4 * * *", () => {
  mongo.backup()
});

sitemap.generate()
// Schedule daily sitemap generations at 5am
cron.schedule("0 5 * * *", () => {
  sitemap.generate()
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
