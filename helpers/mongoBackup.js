require("dotenv").config({ path: "variables.env" });
const backup = require("mongodb-backup");
const hasher = require("folder-hash");
const tar = require("tar");
const fs = require("fs");
const S3 = require("./uploadToS3");

exports.mongoBackup = backupFolder => {
  let timestamp = new Date()
    .toString()
    .toLowerCase()
    .split(" ")
    .splice(0, 5)
    .join("-")
    .split(":")
    .join("-");
  backup({
    uri: process.env.DATABASE,
    root: backupFolder,
    callback: err => {
      if (err) console.log(err);
      else {
        tar
          .c(
            {
              file: `${backupFolder}-${timestamp}.tgz`
            },
            [backupFolder]
          )
          .then(_ => {
            S3.upload(
              `${backupFolder}-${timestamp}.tgz`,
              process.env.S3_BACKUP_BUCKET_NAME
            );
          });
      }
    }
  });
};
