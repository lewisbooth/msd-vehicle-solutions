const { titleString } = require("./titleString");
const { cleanObject } = require("./cleanObject");

exports.formatVehicleData = data => {
  const vehicle = JSON.parse(JSON.stringify(data));
  vehicle.details.mileage = vehicle.details.mileage.toLocaleString();
  vehicle.details.transmission = titleString(vehicle.details.transmission);
  vehicle.details.fuelType = titleString(vehicle.details.fuelType);
  switch (vehicle.category) {
    case "car-economy":
      vehicle.category = "Economy Car";
      break;
    case "car-hatchback":
      vehicle.category = "Hatchback Car";
      break;
    case "car-saloon":
      vehicle.category = "Saloon Car";
      break;
    case "car-suv":
      vehicle.category = "SUV";
      break;
    case "car-truck":
      vehicle.category = "Truck";
      break;
    case "van-small":
      vehicle.category = "Small Van";
      break;
    case "van-medium":
      vehicle.category = "Medium Van";
      break;
    case "van-large":
      vehicle.category = "Large Van";
      break;
    case "van-luton":
      vehicle.category = "Luton Van";
      break;
  }
  cleanObject(vehicle);
  return vehicle;
};
