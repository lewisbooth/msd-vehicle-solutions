const fs = require("fs");
const AWS = require("aws-sdk");

AWS.config.loadFromPath(__dirname + "/../variables.aws.json");
var s3 = new AWS.S3();

exports.upload = (Bucket, Key) => {
  const Body = fs.readFileSync(Key);
  const options = { Body, Bucket, Key };
  s3.upload(options, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`Successfully uploaded ${Key} to S3 bucket ${Bucket}`);
      console.log(data.Location);
    }
  });
};

exports.downloadLatest = (Bucket, saveFolder) => {
  s3.listObjectsV2({ Bucket }, (err, data) => {
    if (data.Contents.KeyCount === 0) {
      console.log("No items found in bucket: " + Bucket)
      return null;
    }
    const Key = data.Contents[data.KeyCount - 1].Key
    console.log("Downloading " + Key)
    const options = { Bucket, Key }
    if (!fs.existsSync(saveFolder)) {
      fs.mkdirSync(saveFolder)
    }
    const writeStream = fs.createWriteStream(`${saveFolder}/latestBackup.tgz`)
    const fileStream = s3.getObject(options, (err => {
      if (err) {
        console.log("Error downloading file")
        console.log(err)
        return false
      }
    })).createReadStream().pipe(writeStream)
    console.log("Successfully downloaded file")
    return true
  })
}

exports.cleanBucket = (Bucket, limit) => {
  const options = { Bucket }
  s3.listObjectsV2(options, (err, data) => {
    if (err) {
      console.log("🚫 Error retrieving bucket information")
      console.log(err)
      return;
    }
    if (data.KeyCount > limit) {
      const outdatedItems = data.Contents
        .slice(0, data.KeyCount - limit)
        .map(item => {
          return { Key: item.Key }
        })
      const deleteOptions = {
        Bucket,
        Delete: { Objects: outdatedItems }
      }
      console.log(outdatedItems)
      s3.deleteObjects(deleteOptions, (err, data) => {
      })
    }
  })
};
