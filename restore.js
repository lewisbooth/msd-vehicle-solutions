const S3 = require("./helpers/S3");
const fs = require("fs");
const tar = require("tar");
const mongo = require("./helpers/mongo");


// Downloads most recent S3 backup
if (!fs.existsSync("./mongodb/temp")) {
  fs.mkdirSync("./mongodb/temp")
}
const downloadFile = S3.downloadLatest(process.env.S3_BACKUP_BUCKET_NAME, './mongodb/temp')
if (downloadFile === false) process.exit()

// // Unzip the database and restore it
// const writeStream = fs.createWriteStream("./mongodb/temp/latestBackup")
// tar.x({ file: "./mongodb/temp/latestBackup.tgz", sync: true }).createReadStream().pipe(writeStream)

// console.log(tarFile)