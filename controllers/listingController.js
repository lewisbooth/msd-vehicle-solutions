const mongoose = require("mongoose");
const pug = require("pug");

exports.hireListingVans = async (req, res) => {
  res.render("listing-hire-vans", {
    title: "Vans for Hire in Stoke-on-Trent",
    description:
      "Explore Our Range of Vans for Hire at Competitive Rates in Stoke-on-Trent. Suitable for Personal & Business Use. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.hireListingCars = async (req, res) => {
  res.render("listing-hire-cars", {
    title: "Cars for Hire in Stoke-on-Trent",
    description:
      "Explore Our Range of Cars for Hire at Competitive Rates in Stoke-on-Trent. Suitable for Personal & Business Use. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.salesListingVans = async (req, res) => {
  res.render("listing-sales-vans", {
    title: "New & Used Vans for Sale in Stoke-on-Trent",
    description:
      "Explore Our Range of New & Used Vans for Sale in Stoke-on-Trent. Competitive Financing Available. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.salesListingCars = async (req, res) => {
  res.render("listing-sales-cars", {
    title: "New & Used Cars for Sale in Stoke-on-Trent",
    description:
      "Explore Our Range of New & Used Cars for Sale in Stoke-on-Trent. Competitive Financing Available. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.leaseListingVans = async (req, res) => {
  res.render("listing-leasing-vans", {
    title: "New Van Leasing Deals in Stoke-on-Trent",
    description:
      "Find the Perfect Van Lease Deals for Personal & Business Use in Stoke-on-Trent. PCP, PCH, & HP Options With Competitive Rates & Financing Available. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.leaseListingCars = async (req, res) => {
  res.render("listing-leasing-cars", {
    title: "New Car Leasing Deals in Stoke-on-Trent",
    description:
      "Find the Perfect Car Lease Deals for Personal & Business Use in Stoke-on-Trent. PCP, PCH, & HP Options With Competitive Rates & Financing Available. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};
