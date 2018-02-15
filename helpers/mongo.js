require("dotenv").config({ path: "variables.env" });
const mongoBackup = require("mongodb-backup");
const mongoRestore = require("mongodb-restore");
const hasher = require("folder-hash");
const tar = require("tar");
const fs = require("fs");
const S3 = require("./S3");

exports.restore = async () => {
  // Downloads most recent S3 backup
  const downloadFile = await S3.downloadIndex(process.env.S3_BACKUP_BUCKET_NAME, './mongodb/temp')
  console.log(downloadFile)
  if (downloadFile === false) process.exit()


  // mongoRestore({
  //   uri: process.env.DATABASE,
  //   root: "mongodb/backup",
  //   callback: err => {
  //     console.log("Error restoring database")
  //     if (err) console.log(err);
  //     else {
  //       console.log("Successfully restored database")
  //     }
  //   }
  // });
};

exports.backup = () => {
  console.log("Backing up files");
  // Create backup folder if it doesn't already exist
  if (!fs.existsSync("mongodb")) {
    fs.mkdirSync("mongodb")
  }
  // Format timestamp to weekday-month-date-year-hour-min-sec
  // E.g thu-feb-15-2018-10-11-01 
  const timestamp = new Date()
    .toString()
    .toLowerCase()
    .split(" ")
    .splice(0, 5)
    .join("-")
    .split(":")
    .join("-");
  // Dump database into local backup folder
  mongoBackup({
    uri: process.env.DATABASE,
    root: "mongodb/backup",
    callback: err => {
      if (err) console.log(err);
      else {
        console.log("Successfully backed up database to mongodb/backup")
      }
    }
  });
  // Tarball the database dump and vehicle imagery folder
  tar.c({ file: `mongodb/${timestamp}.tgz` },
    ["./public/images/vehicles", "./mongodb/backup"]
  ).then(_ => {
    // Upload the tarball to S3
    S3.upload(
      process.env.S3_BACKUP_BUCKET_NAME,
      `mongodb/${timestamp}.tgz`
    );
  })
  // Restrict S3 bucket to 30 entries
  S3.cleanBucket(process.env.S3_BACKUP_BUCKET_NAME, 30)
}