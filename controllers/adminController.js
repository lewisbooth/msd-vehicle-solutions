const mongoose = require("mongoose");
const pug = require("pug");

exports.dashboard = async (req, res) => {
  res.render("dashboard", {
    title: "Admin Dashboard",
    description:
      "Explore Our Range of Vans for Hire at Competitive Rates in Stoke-on-Trent. Suitable for Personal & Business Use. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};
