require("dotenv").config({ path: "variables.env" });
const backup = require("mongodb-backup");
const restore = require("mongodb-restore");
const hasher = require("folder-hash");
const tar = require("tar");
const fs = require("fs");

exports.backup = backupFolder => {
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
        console.log("Successfully backed up database")
      }
    }
  });
};

exports.restore = restoreFolder => {
  restore({
    uri: process.env.DATABASE,
    root: restoreFolder,
    callback: err => {
      if (err) console.log(err);
      else {
        console.log("Successfully restored database")
      }
    }
  });
};
