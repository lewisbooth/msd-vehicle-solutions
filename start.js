const mongoose = require("mongoose");
const mongo = require("./helpers/mongo");
const cron = require("node-cron");
const tar = require("tar");
const ip = require("ip");
const fs = require("fs");
const S3 = require("./helpers/S3");

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
  console.log("Backing up files");
  // Create backup folder if it doesn't already exist
  if (!fs.existsSync("./backup")) {
    fs.mkdirSync("./backup")
  }
  const timestamp = new Date().getTime()
  // Dump database into local backup folder
  mongo.backup("mongodb/backup");
  // Tarball the database dump and vehicle imagery folder
  tar.c({ file: `./backups/${timestamp}.tgz` },
    ["./public/images/vehicles", "./mongodb/backup"]
  ).then(_ => {
    // Upload the tarball to S3
    S3.upload(
      process.env.S3_BACKUP_BUCKET_NAME,
      `./backups/${timestamp}.tgz`
    );
  })
  // Restrict S3 bucket to 30 entries
  S3.cleanBucket(process.env.S3_BACKUP_BUCKET_NAME, 30)
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
