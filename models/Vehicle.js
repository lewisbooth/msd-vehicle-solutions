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
        "car-economy",
        "car-hatchback",
        "car-saloon",
        "car-suv",
        "car-truck",
        "van-small",
        "van-medium",
        "van-large",
        "van-luton"
      ],
      default: "van-small"
    },
    condition: {
      type: String,
      enum: ["new", "used"],
      default: "used"
    },
    slug: {
      type: String,
      trim: true
    },
    photos: {
      type: [String]
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
      seats: { type: Number },
      doors: { type: Number },
      engineSize: { type: Number },
      fuelType: { type: String },
      fuelEconomy: { type: Number },
      transmission: { type: String },
      height: { type: Number },
      mileage: { type: Number },
      year: { type: Number }
    }
  },
  options
);

vehicleSchema.index({
  slug: 1
});
vehicleSchema.index({
  name: "text"
});

vehicleSchema.pre("save", async function(next) {
  if (!this.isModified("name")) {
    return next();
  }
  this.slug = slugify(`${this.name}-${this.details.year}`, { lower: true });
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)`, "i");
  const vehiclesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if (vehiclesWithSlug.length) {
    this.slug = `${this.slug}-${vehiclesWithSlug.length + 1}`;
  }
  next();
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
