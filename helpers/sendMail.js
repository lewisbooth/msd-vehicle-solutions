const aws = require("aws-sdk");
aws.config.update({ region: "eu-west-1" });

exports.send = async (mailData, callback) => {
  let errors = [];
  if (!mailData.to) errors.push("Please supply a To: address");
  if (!mailData.from) errors.push("Please supply a From: address");
  if (!mailData.subject) errors.push("Please supply a subject line");
  if (!mailData.html) errors.push("Please supply message data");
  if (!callback) errors.push("Please supply a callback function");
  if (errors.length > 0) {
    console.log("🚫  🔥  Error sending email");
    errors.forEach(error => {
      console.log(error);
    });
    return;
  }

  // Verified SES email accounts only
  var ses = new aws.SES();
  ses.sendEmail(
    {
      Source: mailData.from,
      Destination: { ToAddresses: mailData.to },
      Message: {
        Subject: {
          Data: mailData.subject
        },
        Body: {
          Html: {
            Data: mailData.html
          }
        }
      }
    },
    (err, data) => callback(err, data)
  );
};
