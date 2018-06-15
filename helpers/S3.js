const fs = require("fs");
const moment = require("moment");
const readline = require('readline');
const AWS = require("aws-sdk");
AWS.config.loadFromPath(__dirname + "/../variables.aws.json");
const s3 = new AWS.S3();

// Upload a file to an S3 bucket, using the same relative path
exports.upload = (Bucket, Key) => {
  console.log(`Uploading ${Key} to ${Bucket}`);
  // Read the file from disk
  const Body = fs.readFileSync(Key);
  // Use the same relative path for simplicity
  const options = { Body, Bucket, Key };
  // Upload the file to S3
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

// Downloads a given file to a target folder
exports.download = (Bucket, Key, saveFolder) => {
  return new Promise(resolve => {
    const options = { Bucket, Key }
    // Extracts the file name from the Key, which can contain nested folders
    // e.g. /backups/archive/backup-02-12-18.tgz becomes backup-02-12-18.tgz
    const filename = Key.split("/").slice(-1).pop()
    // Make sure the target folder exists
    if (!fs.existsSync(saveFolder)) {
      fs.mkdirSync(saveFolder)
    }
    // Generate the final save location
    const saveFileLocation = `${saveFolder}/${filename}`
    // Open a write stream to the target file
    const file = fs.createWriteStream(saveFileLocation)
    // Download the file from S3
    const fileStream = s3.getObject(options)
    // Pipe the file through to the write stream
    fileStream.createReadStream().pipe(file)
    // When the write stream has finished, return the file path
    file.on('close', () => {
      console.log("Successfully downloaded file to " + saveFileLocation)
      resolve(saveFileLocation)
    })
    // Handle errors
    file.on('error', () => {
      console.log("Error downloading file to " + saveFileLocation)
      resolve(false)
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

// Limit amount of items in a bucket to a given value
exports.cleanBucket = (Bucket, limit) => {
  console.log(`Limiting bucket ${Bucket} to ${limit} items`)
  const options = { Bucket }
  // Get a list of all bucket items
  s3.listObjectsV2(options, (err, data) => {
    if (err) {
      console.log("🚫 Error retrieving bucket information")
      console.log(err)
      return;
    }
    // If there are more files than the given limit, delete them
    if (data.KeyCount > limit) {
      // Find the oldest items
      const outdatedItems = data.Contents
        .slice(0, data.KeyCount - limit)
        .map(item => {
          return { Key: item.Key }
        })
      const deleteOptions = {
        Bucket,
        Delete: { Objects: outdatedItems }
      }
      // Delete the outdated items
      s3.deleteObjects(deleteOptions, (err, data) => {
        if (err) {
          console.log("🚫 Error deleting items")
          console.log(err)
        }
      })
    }
  })
};

// Ask user to select which file they want via terminal input
function userSelect(files) {
  return new Promise(resolve => {
    // Create the readline object
    const input = readline.createInterface(process.stdin, process.stdout, null)
    // Prints the question to stdout and waits for user input
    input.question("Select a backup entry: ", answer => {
      answer = parseInt(answer)
      if (answer >= 0 && answer <= Object.keys(files).length - 1) {
        // If the input is valid, return the selection
        selectedFile = answer
        resolve(selectedFile)
      } else {
        // Otherwise it's recursion time
        console.log("Please select a valid file")
        userSelect(files)
      }
      // Close the terminal input session
      input.close();
      process.stdin.destroy();
    })
  })
}