// CAUTION: Mutates original object
exports.inputVehicleData = req => {
  const vehicle = {
    name: String(req.body.name) || "New Vehicle",
    category: String(req.body.category) || "van-small",
    condition: String(req.body.condition) || "used",
    sold: Boolean(req.body.sold),
    availability: {
      hire: Boolean(req.body.availabilityHire),
      sales: Boolean(req.body.availabilitySales),
      lease: Boolean(req.body.availabilityLease)
    },
    pricing: {
      hire: Number(req.body.pricingHire),
      sales: Number(req.body.pricingSales),
      lease: Number(req.body.pricingLease)
    },
    promoted: {
      hire: Boolean(req.body.promotedHire),
      sales: Boolean(req.body.promotedSales),
      lease: Boolean(req.body.promotedLease)
    },
    details: {
      description: String(req.body.description) || "",
      storage: {
        height: Number(req.body.storageHeight),
        width: Number(req.body.storageWidth),
        length: Number(req.body.storageLength)
      },
      cargo: Number(req.body.cargo),
      seats: Number(req.body.seats),
      doors: Number(req.body.doors),
      height: Number(req.body.height),
      engineSize: Number(req.body.engineSize),
      fuelEconomy: Number(req.body.fuelEconomy),
      mileage: Number(req.body.mileage),
      year: Number(req.body.year),
      transmission: String(req.body.transmission) || "manual",
      fuelType: String(req.body.fuelType) || "petrol"
    }
  };
  if (vehicle.availability.hire === true && vehicle.pricing.hire === 0) {
    req.flash("warning", "Please add a hire price if availability is ticked");
  }
  if (vehicle.availability.lease === true && vehicle.pricing.lease === 0) {
    req.flash("warning", "Please add a lease price if availability is ticked");
  }
  if (vehicle.availability.sales === true && vehicle.pricing.sales === 0) {
    req.flash("warning", "Please add a sales price if availability is ticked");
  }
  return vehicle;
};
