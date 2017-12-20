const mongoose = require("mongoose");
const backup = require("./helpers/mongoBackup");
const cron = require("node-cron");
const tar = require("tar");
const ip = require("ip");
const S3 = require("./helpers/uploadToS3");

require("dotenv").config({ path: "variables.env" });
process.env.ROOT = __dirname;

mongoose.connect(process.env.DATABASE, { useMongoClient: true });
mongoose.Promise = global.Promise;
mongoose.connection.on("error", err => {
  console.error(`🚫 → ${err.message}`);
});


// Daily backups at 4am
cron.schedule("0 4 * * *", () => {
  console.log("Backing up files");
  if (!fs.existsSync("./backup")) {
    fs.mkdirSync("./backup")
  }
  const timestamp = new Date().getTime()
  backup.mongoBackup("mongodb/backup");
  tar.c({ file: `./backups/${timestamp}.tgz` },
    ["./public/images/vehicles", "./mongodb/backup"]
  ).then(_ => {
    S3.upload(
      `./backups/${timestamp}.tgz`,
      process.env.S3_BACKUP_BUCKET_NAME
    );
  })
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
