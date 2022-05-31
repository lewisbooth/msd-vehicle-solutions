const mongoose = require("mongoose");
const Vehicle = mongoose.model("Vehicle");
const pug = require("pug");
const { titleString } = require("../helpers/titleString");
const { formatVehicleData } = require("../helpers/formatVehicleData");

exports.listingPage = async (req, res) => {
  // Because this is a dynamic route (/vehicles/:type/:vehicle) we can use the request parameters :type and :vehicle to generate the filters on the page, whilst rendering the same template. /vehicles/leasing/cars will filter cars for lease etc.

  const { type } = req.params;
  const { sort, size, seats, fuel } = req.query;

  let selectedOptionType;
  if (type === "hire") selectedOptionType = "Hire";
  if (type === "lease") selectedOptionType = "Lease";
  if (type === "sales") selectedOptionType = "Sale";

  const filter = {};

  filter[`availability.${type}`] = true;

  // Add extra filters from the query strings
  if (size && size !== "all") {
    filter.category = size
  }
  if (size == 'all-cars') {
    filter.category = { $regex: '^car-' }
  }
  if (size == 'all-vans') {
    filter.category = { $regex: '^van-' }
  }
  if (seats && seats === "4+") {
    // Filter for > 3 seats
    filter["details.seats"] = { $gt: 3 }
  } else if (seats && seats !== "all") {
    filter["details.seats"] = seats
  }
  if (fuel && fuel !== "all") {
    filter["details.fuelType"] = fuel
  }

  const sortBy = {}

  // Place promoted items at the top regardless of sort (not currently used)
  // sortBy[`promoted.${type}`] = -1;

  // Add extra sorting from the query strings
  if (!sort || sort === "price-low") {
    sortBy[`pricing.${type}`] = 1
  } else if (sort === "price-high") {
    sortBy[`pricing.${type}`] = -1
  }

  const vehicles = await Vehicle.find(filter).sort(sortBy);

  res.render("listing", {
    vehicles,
    type,
    selectedOptionType,
    title: `Vehicles for ${ selectedOptionType } in Stoke-on-Trent`,
    description: `Explore Our Range of Vehicles for ${selectedOptionType} at Competitive Rates in Stoke-on-Trent. Suitable for Personal & Business Use. Open 7 Days Per Week | Call Us On 01782 517782 Today`
  });
};

exports.vehiclePage = async (req, res) => {
  const vehicle = await Vehicle.findOne({ slug: req.params.vehicleId });
  if (!vehicle) {
    req.flash("error", "Vehicle not found");
    res.redirect("back");
  }

  // Find other vehicles in the same category
  const filter = {
    _id: { $ne: vehicle.id },
    category: vehicle.category
  };
  if (req.query.ref) {
    filter[`availability.${req.query.ref}`] = true;
  }
  const relatedVehicles = await Vehicle.find(filter).limit(3);

  // Customise the page title based on the reference type
  let selectedOptionType;
  if (req.query.ref === "hire") selectedOptionType = " for Hire";
  if (req.query.ref === "lease") selectedOptionType = " for Lease";
  if (req.query.ref === "sales") selectedOptionType = " for Sale";

  // Useful for 'back' links
  const vehicleType = vehicle.category.split("-")[0] + "s";
  const referrer = `/vehicles/${req.query.ref || "hire"}/${vehicleType}`;

  // Generate a description, use the vehicle description if it exists
  let description
  if (vehicle.details.description) {
    description = vehicle.details.description.split("").slice(0, 250).join("")
  } else {
    description = "Explore Our Range of Vehicles for Hire, Sale and Lease at Competitive Rates in Stoke-on-Trent. Suitable for Personal & Business Use. Open 7 Days Per Week"
  }
  description += " | Call Us On 01782 517782 Today"

  const title = `${vehicle.details.year ? ` ${vehicle.details.year}` : ""} ${vehicle.name}${selectedOptionType ? selectedOptionType : ""} in Stoke-on-Trent`

  res.render("vehicle", {
    vehicle: formatVehicleData(vehicle),
    relatedVehicles,
    referrer,
    ref: req.query.ref,
    title,
    description
  });
};
