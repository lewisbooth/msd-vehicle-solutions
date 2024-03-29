const mongoose = require("mongoose");
const Vehicle = mongoose.model("Vehicle");
const mail = require("../helpers/sendMail");
const { formatVehicleData } = require("../helpers/formatVehicleData");
const pug = require("pug");

exports.homepage = async (req, res) => {
  const vehicles = await Vehicle.find({ "availability.hire": true })
    .limit(3)
    .sort({ "promoted.hire": -1, updatedAt: -1 });
  const cleanVehicles = vehicles.map(vehicle => formatVehicleData(vehicle));
  res.render("hire", {
    vehicles: cleanVehicles,
    title: "Car & Van Hire in Stoke on Trent",
  });
};

exports.sales = async (req, res) => {
  const vehicles = await Vehicle.find({ "availability.sales": true })
    .limit(3)
    .sort({ "promoted.sales": -1, updatedAt: -1 });
  res.render("sales", {
    vehicles,
    title: "New & Used Vehicles for Sale in Stoke on Trent",
    description:
      "Explore Our Range of New & Used Cars & Vans for Sale or Lease in Stoke on Trent. Competitive Financing Available. Open 7 Days Per Week. Call Us On 01782 517782 Today."
  });
};

exports.leasing = async (req, res) => {
  const vehicles = await Vehicle.find({ "availability.lease": true })
    .limit(3)
    .sort({ "promoted.lease": -1, updatedAt: -1 });
  res.render("leasing", {
    vehicles,
    title: "Car & Van Leasing Deals in Stoke on Trent",
    description:
      "Find the Perfect Car & Van Lease Deals for Personal & Business Use in Stoke on Trent. PCP, PCH, & HP Options With Competitive Rates & Financing Available. Open 7 Days Per Week. Call Us On 01782 517782 Today."
  });
};

exports.vanSizes = async (req, res) => {
  const vehicles = await Vehicle.find({ "availability.hire": true })
    .limit(3)
    .sort({ "promoted.hire": -1, updatedAt: -1 });
  res.render("van-sizes", {
    vehicles,
    title: "Which Van Size Should You Choose?",
    description:
      "Moving House? Delivering Parcels? Buying Furniture? Our Van Size Guide Helps You Choose The Best Vehicle For Your Needs."
  });
};

exports.customVehicles = async (req, res) => {
  res.render("customs", {
    title: "Van Conversions & Ply Lining in Stoke on Trent",
    description:
      "Specialists in Bespoke Van Conversions & Modifications. Create Your Unique Camper Van or Protect Your Vehicle With Ply-Lining, Window Tinting or a Bulk Head. Open 7 Days Per Week. Call Us On 01782 517782 Today"
  });
};

exports.servicing = async (req, res) => {
  res.render("servicing", {
    title: "Vehicle Servicing, Repair & Tyres in Stoke on Trent",
    description:
      "Professional Car & Van Servicing, Tyre Changes, Wheel Alignment & Bodywork Repairs in Stoke on Trent. Open 7 Days Per Week. Call Us On 01782 517782 Today"
  });
};

exports.contact = async (req, res) => {
  res.render("contact", {
    title: "Contact Us",
    description:
      "Get In Touch for Professional Vehicle Hire, Leasing, Sales, Modifications, Servicing & Repair in Stoke on Trent. Open 7 Days Per Week."
  });
};

exports.privacy = async (req, res) => {
  res.render("privacy", {
    title: "Privacy Policy",
    description:
      "Our Privacy Policy"
  });
};

exports.terms = async (req, res) => {
  res.render("terms-and-conditions", {
    title: "Terms and Conditions",
    description:
      "Terms and Conditions"
  });
};

exports.contactSubmit = async (req, res) => {
  const timestamp = new Date().toString();
  const { name, email, message, phone, telephone } = req.body;

  // Check all required fields are present
  if (!name || !email || !message || !phone )
    return res
      .status(400)
      .send("Please fill in all fields.")

  // Catch bot attempts
  // 'telephone' is a hidden field seen only by bots
  if ((telephone && telephone.length > 0) || res.locals?.device == 'bot') {
    console.log(`🤖  Stopped bot attempt`);
    return res.status(200).send();
  }

  console.log(timestamp + " New contact message");
  console.log(req.body);

  const messageTemplate = pug.renderFile(
    process.env.ROOT + "/views/emails/contact-admin.pug",
    {
      name,
      email,
      phone,
      message
    }
  );

  const mailData = {
    to: [process.env.MAIL_TO],
    from: process.env.MAIL_FROM,
    subject: "MSD Website Enquiry | " + name,
    html: messageTemplate
  };

  const callback = (err, data) => {
    if (err) {
      console.log("🚫  🔥  Email Error: " + err);
      res
        .status(400)
        .send("Error submitting email. Please call us or try again later.");
    } else {
      console.log("📧  Email sent successfully");
      console.log(data);
      res.status(200).send();
    }
  };

  mail.send(mailData, callback);
};

exports.error = async (req, res) => {
  res.render("404", {
    title: "Page not found!"
  });
};
