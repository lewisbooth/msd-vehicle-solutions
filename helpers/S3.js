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

exports.download = (Bucket, Key) => {
  const options = { Bucket }
  s3.listObjectsV2(options, (err, data) => {
    console.log(data)
  })
  // const fileStream = s3.getObject(options).createReadStream()
};

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
  // const fileStream = s3.getObject(options).createReadStream()
};
