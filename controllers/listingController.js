const mongoose = require("mongoose");
const pug = require("pug");

exports.listingPage = async (req, res) => {
  const { type, vehicle } = req.params;

  const titleCase = string => {
    const stringArray = string.split("");
    stringArray[0] = stringArray[0].toUpperCase();
    return stringArray.join("");
  };

  // Because this is a dynamic route (/vehicles/:type/:vehicle) we can use the request parameters :type and :vehicle to generate the filters on the page, whilst rendering the same template. /vehicles/leasing/cars will filter cars for lease etc.

  // Format the parameters for use in title/description
  const vehicleFormatted = titleCase(vehicle);
  const typeFormatted = titleCase(type);

  // Format the parameters for use in dropdown options on the page
  let selectedOptionVehicle, selectedOptionType;
  if (vehicle === "vans") selectedOptionVehicle = "Van";
  if (vehicle === "cars") selectedOptionVehicle = "Car";
  if (type === "hire") selectedOptionType = "Hire";
  if (type === "leasing") selectedOptionType = "Lease";
  if (type === "sales") selectedOptionType = "Buy";

  // If parameters aren't matched above, redirect to /hire/vans
  if (selectedOptionVehicle === undefined || selectedOptionType === undefined) {
    req.flash("error", "That category doesn't exist");
    res.redirect("/vehicles/hire/vans");
    next();
  }

  res.render("listing", {
    params: { selectedOptionVehicle, selectedOptionType },
    title: `${vehicleFormatted} for ${typeFormatted} in Stoke-on-Trent`,
    description: `Explore Our Range of ${vehicleFormatted} for ${
      typeFormatted
    } at Competitive Rates in Stoke-on-Trent. Suitable for Personal & Business Use. Open 7 Days Per Week, Call Us Or Drop In Today.`
  });
};

exports.vehiclePage = async (req, res) => {
  const vehicle = {
    name: "Ford Transit",
    availability: ["hire", "sales"]
  };
  res.render("vehicle", {
    vehicle,
    title: `${vehicle.name} in Stoke-on-Trent`,
    description: `Explore Our Range of Vehicles for Hire, Sale and Lease at Competitive Rates in Stoke-on-Trent. Suitable for Personal & Business Use. Open 7 Days Per Week, Call Us Or Drop In Today.`
  });
};
