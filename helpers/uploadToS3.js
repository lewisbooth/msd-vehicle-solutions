const fs = require("fs");
const AWS = require("aws-sdk");

AWS.config.loadFromPath(__dirname + "/../variables.aws.json");
var s3 = new AWS.S3();

exports.upload = (Key, Bucket) => {
  const Body = fs.readFileSync(Key);
  const params = { Body, Bucket, Key };
  s3.upload(params, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`Successfully uploaded ${Key} to S3 bucket ${Bucket}`);
      console.log(data.Location);
    }
  });
};
