const mongoose = require("mongoose");
const mongo = require("./helpers/mongo");
const cron = require("node-cron");
const tar = require("tar");
const ip = require("ip");
const fs = require("fs");
const S3 = require("./helpers/S3");

require("dotenv").config({ path: "variables.env" });
process.env.ROOT = __dirname;

mongoose.connect(process.env.DATABASE, { useMongoClient: true });
mongoose.Promise = global.Promise;
mongoose.connection.on("error", err => {
  console.error(`🚫 → ${err.message}`);
});


// Daily backups at 4am
// Dumps the database into ./mongodb/backup, creates a tarball including the mongo backup and the ./public folder, then uploads the tarball to S3. Cleans items in the bucket to store the latest 30 entries.
cron.schedule("0 4 * * *", () => {
  console.log("Backing up files");
  if (!fs.existsSync("./backup")) {
    fs.mkdirSync("./backup")
  }
  const timestamp = new Date().getTime()
  mongo.backup("mongodb/backup");
  tar.c({ file: `./backups/${timestamp}.tgz` },
    ["./public/images/vehicles", "./mongodb/backup"]
  ).then(_ => {
    S3.upload(
      process.env.S3_BACKUP_BUCKET_NAME,
      `./backups/${timestamp}.tgz`
    );
  })
  S3.cleanBucket(process.env.S3_BACKUP_BUCKET_NAME, 30)
});

require("./models/Vehicle");
require("./models/User");

const app = require("./app");

app.set("port", process.env.PORT || 8888);
const server = app.listen(app.get("port"), () => {
  console.log(`Express running → PORT ${server.address().port}`);
  if (process.env.NODE_ENV === "production") {
    console.log("⚡  Production Mode ⚡");
  } else {
    console.log("🐌  Development Mode 🐌 ");
  }
  console.log("Local address: " + ip.address());
});
