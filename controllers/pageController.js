const mongoose = require("mongoose");
const mail = require("../helpers/sendMail");
const pug = require("pug");

exports.homepage = async (req, res) => {
  res.render("hire");
};

exports.sales = async (req, res) => {
  res.render("sales", {
    title: "New & Used Vehicles for Sale in Stoke-on-Trent",
    description:
      "Explore Our Range of New & Used Cars & Vans for Sale or Lease in Stoke-on-Trent. Competitive Financing Available. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.leasing = async (req, res) => {
  res.render("leasing", {
    title: "Car & Van Leasing Deals in Stoke-on-Trent",
    description:
      "Find the Perfect Car & Van Lease Deals for Personal & Business Use in Stoke-on-Trent. PCP, PCH, & HP Options With Competitive Rates & Financing Available. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.vanSizes = async (req, res) => {
  res.render("van-sizes", {
    title: "Which Van Size Should You Choose?",
    description:
      "Moving House? Delivering Parcels? Buying Furniture? Our Van Size Guide Helps You Choose The Best Vehicle For Your Needs"
  });
};

exports.conversions = async (req, res) => {
  res.render("conversions", {
    title: "Van Conversions, Ply-Lining & Bulk Heads in Stoke-on-Trent",
    description:
      "Specialists in Bespoke Van Conversions & Modifications. Create Your Unique Camper Van or Protect Your Vehicle With Ply-Lining, Window Tinting or a Bulk Head. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.modifications = async (req, res) => {
  res.render("modifications", {
    title: "Vehicle Modifications & Performance in Stoke-on-Trent",
    description:
      "Experts in Car & Van Exhausts, Body Kits, Wheels, Performance Tuning and Custom Conversions in Stoke-on-Trent. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.servicing = async (req, res) => {
  res.render("servicing", {
    title: "Vehicle Servicing, Repair & Tyres in Stoke-on-Trent",
    description:
      "Professional Car & Van Servicing, Tyre Changes, Wheel Alignment & Bodywork Repairs in Stoke-on-Trent. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.contact = async (req, res) => {
  res.render("contact", {
    title: "Contact Us",
    description:
      "Get In Touch for Professional Vehicle Hire, Leasing, Sales, Modifications, Servicing & Repair in Stoke-on-Trent. Open 7 Days Per Week."
  });
};

exports.contactSubmit = async (req, res) => {
  const timestamp = new Date().toString();
  const { name, email, message, botTrap } = req.body;

  if (botTrap.length > 0) {
    console.log(`🤖  Stopped bot attempt`);
    res.status(200).send();
  }

  console.log(timestamp + " New contact message");
  console.log(req.body);

  const messageTemplate = pug.renderFile(
    process.env.ROOT + "/views/emails/contact-admin.pug",
    {
      name,
      email,
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
