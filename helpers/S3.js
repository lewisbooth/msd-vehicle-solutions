const fs = require("fs");
const moment = require("moment");
const readline = require('readline');
const AWS = require("aws-sdk");
AWS.config.loadFromPath(__dirname + "/../variables.aws.json");
const s3 = new AWS.S3();

exports.upload = (Bucket, Key) => {
  console.log(`Uploading ${Key} to ${Bucket}`);
  const Body = fs.readFileSync(Key);
  const options = { Body, Bucket, Key };
  s3.upload(options, (err, data) => {
    if (err) {
      console.log("Error uploading to S3");
      console.log(err);
    } else {
      console.log("Upload successful");
      console.log(data.Location);
    }
  });
};

exports.download = (Bucket, Key, saveFolder) => {
  return new Promise(resolve => {
    const options = { Bucket, Key }
    const filename = Key.split("/").slice(-1).pop()
    if (!fs.existsSync(saveFolder)) {
      fs.mkdirSync(saveFolder)
    }
    const saveFileLocation = `${saveFolder}/${filename}`
    console.log(filename)
    const file = fs.createWriteStream(saveFileLocation)
    const fileStream = s3.getObject(options).createReadStream().pipe(file)
    file.on('error', () => {
      console.log("Error downloading file to " + saveFileLocation)
      resolve(false)
    })
    file.on('close', () => {
      console.log("Successfully downloaded file to " + saveFileLocation)
      resolve(saveFileLocation)
    })
  })
};

// Presents the user with a list of the latest entries
// User selects which file to download
exports.downloadIndex = (Bucket, saveFolder) => {
  console.log("Looking for entries in " + Bucket)
  return new Promise(resolve => {
    s3.listObjectsV2({ Bucket }, async (err, data) => {
      // Handle errors
      if (err) {
        console.log(err)
        return null
      } else if (data.Contents.KeyCount === 0) {
        console.log("No items found in bucket: " + Bucket)
        return null
      }
      // Sort bucket entries by date
      const files = data.Contents.sort((a, b) => {
        return a.LastModified - b.LastModified
      })
      // Console log all the entries with a selection index
      files.forEach((file, i) => {
        const time = moment(file.LastModified).fromNow()
        console.log(`[${i}] ${moment(file.LastModified)} (${time})`)
      })
      // Prompt user to select which backup they want
      const selectedFile = await userSelect(files);
      // Get the key for the user-selected file
      const Key = files[Object.keys(files)[selectedFile]].Key
      // Download the file
      const downloadBackup = await this.download(Bucket, Key, saveFolder)
      resolve(downloadBackup)
    })
  })
}

exports.cleanBucket = (Bucket, limit) => {
  console.log(`Limiting bucket ${Bucket} to ${limit} items`)
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
      s3.deleteObjects(deleteOptions, (err, data) => {
      })
    }
  })
};

function userSelect(files) {
  return new Promise(resolve => {
    const input = readline.createInterface(process.stdin, process.stdout, null)
    input.question("Select a backup entry: ", answer => {
      answer = parseInt(answer)
      if (answer >= 0 && answer <= Object.keys(files).length - 1) {
        selectedFile = answer
        resolve(selectedFile)
      } else {
        console.log("Please select a valid file")
        userSelect(files)
      }
      input.close();
      process.stdin.destroy();
    })
  })
}