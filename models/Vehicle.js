const mongoose = require("mongoose");
const slugify = require("slugify");
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
        "car-suv",
        "car-truck",
        "van-small",
        "van-medium",
        "van-large",
        "van-xlarge"
      ],
      required: "Please supply a category"
    },
    slug: {
      type: String,
      trim: true
    },
    photos: {
      main: {
        type: String,
        default: "vehicle-photo-default.jpg"
      },
      support: [String]
    },
    pricing: {
      hire: { type: Number },
      sales: { type: Number },
      lease: { type: Number }
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
      seats: { type: Number, required: "Please supply the number of seats" },
      doors: { type: Number },
      engineSize: { type: Number },
      fuelType: { type: String },
      fuelEconomy: { type: String },
      transmission: { type: String },
      height: { type: String },
      mileage: { type: String },
      year: { type: String, required: "Please supply a year" }
    }
  },
  options
);

vehicleSchema.index({
  slug: "text"
});

// Create a slug, adding an index at the end if multiple stores are found with the same name
vehicleSchema.pre("save", async function(next) {
  if (!this.isModified("name")) {
    return next();
  }
  this.slug = slugify(`${this.name}-${this.details.year}`);
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)`, "i");
  const vehiclesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if (vehiclesWithSlug.length) {
    this.slug = `${this.slug}-${vehiclesWithSlug.length + 1}`;
  }
  next();
});

const Vehicle = mongoose.model("Vehicle", vehicleSchema);

module.exports = Vehicle;
