const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const options = {
  timestamps: true
};

const vehicleSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: "Please supply a vehicle name"
    },
    category: {
      type: String,
      enum: [
        "car-hatchback",
        "car-saloon",
        "car-estate",
        "car-suv",
        "car-sports",
        "car-truck",
        "van-small",
        "van-medium",
        "van-large",
        "van-xlarge"
      ],
      required: "Please supply a category"
    },
    photos: {
      main: {
        type: String,
        default: "vehicle-photo-default.jpg"
      },
      support: [String]
    },
    pricing: {
      hire: {
        type: Number,
        required: function() {
          return this.availability.hire === true;
        }
      },
      sales: {
        type: Number,
        required: function() {
          return this.availability.sales === true;
        }
      },
      lease: {
        type: Number,
        required: function() {
          return this.availability.lease === true;
        }
      }
    },
    availability: {
      hire: { type: Boolean, default: false },
      sales: { type: Boolean, default: false },
      lease: { type: Boolean, default: false }
    },
    promoted: {
      hire: { type: Boolean, default: false },
      sales: { type: Boolean, default: false },
      lease: { type: Boolean, default: false }
    },
    details: {
      description: { type: String },
      storage: {
        width: { type: Number },
        height: { type: Number },
        depth: { type: Number }
      },
      cargo: { type: Number },
      seats: { type: Number },
      doors: { type: Number },
      engineSize: { type: Number },
      fuelType: { type: String },
      fuelEconomy: { type: String },
      transmission: { type: String },
      height: { type: String },
      mileage: { type: String },
      year: { type: String }
    }
  },
  options
);

vehicleSchema.index({
  price: -1
});

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

module.exports = Vehicle;
