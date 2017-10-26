const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const vehicleSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: "Please supply a vehicle name"
  },
  price: { type: Number, required: "Please supply a price" },
  category: { type: String, required: "Please supply a category" },
  details: {
    storage: {
      width: { type: Number },
      height: { type: Number },
      depth: { type: Number }
    },
    cargo: { type: Number },
    seats: { type: Number },
    engineSize: { type: Number },
    fuelType: { type: String },
    fuelEconomy: { type: String },
    transmission: { type: String },
    height: { type: String },
    mileage: { type: String },
    year: { type: String }
  }
});

vehicleSchema.index({
  price: -1
});

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

module.exports = Vehicle;
