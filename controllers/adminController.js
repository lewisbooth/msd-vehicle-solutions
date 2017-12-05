const mongoose = require("mongoose");
const Vehicle = mongoose.model("Vehicle");
const { cleanObject } = require("../helpers/cleanObject");
const { bool } = require("../helpers/defaultBoolean");
const pug = require("pug");

exports.login = async (req, res) => {
  res.render("admin/login", {
    title: "Log In",
    description: "Log into the MSD Admin portal"
  });
};

exports.dashboard = async (req, res) => {
  res.render("admin/dashboard", {
    title: "Admin Dashboard",
    description:
      "Explore Our Range of Vans for Hire at Competitive Rates in Stoke-on-Trent. Suitable for Personal & Business Use. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.addVehiclePage = async (req, res) => {
  res.render("admin/addVehicle", {
    title: "Add a Vehicle",
    description:
      "Explore Our Range of Vans for Hire at Competitive Rates in Stoke-on-Trent. Suitable for Personal & Business Use. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.addVehicle = async (req, res) => {
  let {
    name,
    description,
    year,
    category,
    storageWidth,
    storageHeight,
    storageDepth,
    cargo,
    height,
    seats,
    doors,
    transmission,
    engineSize,
    fuelType,
    fuelEconomy,
    mileage,
    availabilityHire,
    availabilitySales,
    availabilityLease,
    promotedHire,
    promotedSales,
    promotedLease,
    pricingHire,
    pricingSales,
    pricingLease
  } = req.body;
  const vehicle = {
    name,
    category,
    availability: {
      hire: bool(availabilityHire),
      sales: bool(availabilitySales),
      lease: bool(availabilityLease)
    },
    pricing: {
      hire: bool(pricingHire),
      sales: bool(pricingSales),
      lease: bool(pricingLease)
    },
    promoted: {
      hire: bool(promotedHire),
      sales: bool(promotedSales),
      lease: bool(promotedLease)
    },
    details: {
      description,
      storage: {
        storageHeight,
        storageWidth,
        storageDepth
      },
      cargo,
      seats,
      doors,
      height,
      engineSize,
      transmission,
      fuelType,
      fuelEconomy,
      mileage,
      year
    }
  };
  // cleanObject(vehicle);
  console.log(vehicle);
  const vehicleData = await new Vehicle(vehicle).save();
  // req.flash("success", `Successfully created ${vehicle.name}`);
  // res.redirect(`/admin/dashboard`);
};
