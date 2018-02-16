require("dotenv").config({ path: "variables.env" });
const mongoBackup = require("mongodb-backup");
const mongoRestore = require("mongodb-restore");
const copydir = require('copy-dir');
const tar = require("tar");
const fs = require("fs");
const rmdir = require("rmdir");
const S3 = require("./S3");

// Restore database from S3, giving user a choice of most recent backups
exports.restore = async () => {
  console.log("Restoring files")
  // Create backup folder if it doesn't already exist
  if (!fs.existsSync("mongodb")) {
    fs.mkdirSync("mongodb")
  }
  // Downloads most recent S3 backup
  const downloadFile = await S3.downloadIndex(process.env.S3_BACKUP_BUCKET_NAME, 'mongodb/temp')
  if (downloadFile === false) process.exit()
  // Extract the tarball into a temp folder
  tar.x({
    file: downloadFile,
    cwd: "mongodb/temp"
  }).then(err => {
    if (err) {
      console.log("Error extracting tarball")
      console.log(err)
      process.exit()
    }
    // Restore database if a backup was in the tarball
    if (fs.existsSync("mongodb/temp/mongodb")) {
      mongoRestore({
        drop: true,
        uri: process.env.DATABASE,
        root: "mongodb/temp/mongodb/backup/msd",
        callback: err => {
          if (err) {
            console.log("Error restoring database")
            console.log(err);
          }
          else {
            console.log("Successfully restored database")
            // Remove temp folder
            rmdir('mongodb/temp', err => {
              if (err) {
                console.log("Error deleting temp folder")
                console.log(err)
              } else {
                console.log("Cleaned up temp folder")
              }
            })
          }
        }
      });
    } else {
      console.log("No database backup found in tarball")
    }
    // Copy vehicle imagery into /public if it exists in the tarball
    if (fs.existsSync("mongodb/temp/public/images/vehicles")) {
      copydir("mongodb/temp/public/images/vehicles", "public/images/vehicles", err => {
        if (err) {
          console.log("Error copying files")
          console.log(err)
        } else {
        }
      })
    } else {
      console.log("No vehicle image backup found in tarball")
    }
  })

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
      if (err) {
        console.log(err);
        return;
      }
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
    rmdir('mongodb/backup', err => {
      if (err) {
        console.log("Error deleting temp folder")
        console.log(err)
      } else {
        console.log("Cleaned up temp folder")
      }
    })
  })
  // Restrict S3 bucket to 30 entries
  S3.cleanBucket(process.env.S3_BACKUP_BUCKET_NAME, 30)
}