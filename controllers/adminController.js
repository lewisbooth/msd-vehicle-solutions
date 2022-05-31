const mongoose = require("mongoose");
const slugify = require("slugify");
const Vehicle = mongoose.model("Vehicle");
const { move } = require("../helpers/move");
const { cleanObject } = require("../helpers/cleanObject");
const { inputVehicleData } = require("../helpers/inputVehicleData");
const fs = require("fs");
const sharp = require("sharp");
const rmdir = require("rmdir");

exports.login = async (req, res) => {
  res.render("admin/login", {
    title: "Log In",
    description: "Log into the MSD Admin portal"
  });
};

exports.dashboard = async (req, res) => {
  const { query } = req;
  const filter = {};
  let sort = {
    updatedAt: -1
  };
  if (query.sortBy === "name") {
    sort = { name: 1 };
  }
  if (query.search) {
    filter.name = { $regex: query.search, $options: "i" };
  }
  if (query.category && query.category !== "all") {
    filter.category = query.category;
  }
  const vehicles = await Vehicle.find(filter).sort(sort);
  res.render("admin/dashboard", {
    vehicles,
    query,
    title: "Admin Dashboard",
    description: "MSD Admin Dashboard"
  });
};

exports.addVehiclePage = async (req, res) => {
  res.render("admin/addVehicle", {
    title: "Add a Vehicle",
    description:
      "Explore Our Range of Vans for Hire at Competitive Rates in Stoke-on-Trent. Suitable for Personal & Business Use. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.editVehiclePage = async (req, res) => {
  const vehicle = await Vehicle.findOne({ slug: req.params.vehicleId });
  if (!vehicle) {
    req.flash("error", "Vehicle not found");
    res.redirect("back");
  }
  const cleanVehicle = JSON.parse(JSON.stringify(vehicle));
  cleanObject(cleanVehicle);
  res.render("admin/addVehicle", {
    vehicle: cleanVehicle,
    title: `Edit ${cleanVehicle.name}`,
    description:
      "Explore Our Range of Vans for Hire at Competitive Rates in Stoke-on-Trent. Suitable for Personal & Business Use. Open 7 Days Per Week, Call Us Or Drop In Today."
  });
};

exports.addVehicle = async (req, res) => {
  const vehicle = inputVehicleData(req);
  if (req.body.photos) {
    vehicle.photos = req.body.photos;
  }
  const vehicleSave = await new Vehicle(vehicle).save((err, data) => {
    if (err) {
      req.flash("error", "Error adding vehicle");
      res.redirect("back");
    } else {
      if (req.body.photos) {
        fs.mkdirSync(`public/images/vehicles/${data._id}`)
        move(
          `public/images/vehicles/temp/${req.body.photos}-1000.jpg`,
          `public/images/vehicles/${data._id}/${req.body.photos}-1000.jpg`,
          (err) => {
            if (err) console.log
          }
        )
        move(
          `public/images/vehicles/temp/${req.body.photos}-400.jpg`,
          `public/images/vehicles/${data._id}/${req.body.photos}-400.jpg`,
          (err) => {
            if (err) console.log
          }
        )
      }
      req.flash("success", "Successfully added vehicle");
      res.redirect("/admin");
    }
  });
};

exports.editVehicle = async (req, res) => {
  console.log(req.body);
  const vehicle = inputVehicleData(req);
  if (req.body.photos) {
    vehicle.photos = req.body.photos;
  }
  let redirect = "back";
  Vehicle.findOneAndUpdate(
    { slug: req.params.vehicleId },
    { $set: vehicle },
    { new: true },
    (err, item) => {
      if (err || !item) {
        req.flash("error", "Vehicle not found");
        res.redirect("/admin");
        return;
      }
      const slug = slugify(`${vehicle.name}-${vehicle.details.year}`, {
        lower: true
      });
      if (!item.slug.includes(slug)) {
        const slugRegEx = new RegExp(`^(${slug})((-[0-9]*$)?)`, "i");
        const vehiclesWithSlug = Vehicle.find({ slug: slugRegEx });
        if (vehiclesWithSlug.length) {
          slug = `${slug}-${vehiclesWithSlug.length + 1}`;
        }
        item.slug = redirect = slug;
      }
      item.save().then(saved => {
        req.flash("success", "Successfully updated vehicle");
        res.redirect(redirect);
      });
    }
  );
};

exports.deleteVehicle = async (req, res) => {
  const deleted = await Vehicle.remove({ slug: req.params.vehicleId }, err => {
    if (err) {
      req.flash("error", "Error deleting vehicle");
      res.redirect("/admin");
    } else {
      // Remove imagery folder
      rmdir(`public/images/vehicles/${req.params.vehicleId}`, err => {
        if (err) {
          console.log("Error deleting vehicle images folder")
          console.log(err)
        } else {
          console.log("Deleted vehicle images")
        }
      })
      req.flash("success", "Successfully deleted vehicle");
      res.redirect("/admin");
    }
  });
};

exports.uploadVehiclePhoto = async (req, res, next) => {
  if (!req.file) {
    return next()    
  }

  const vehicle = await Vehicle.findOne({ slug: req.params.vehicleId })
  if (!vehicle) return next()

  const photo = req.file.buffer;
  const photoFolder = `${process.env.ROOT}/public/images/vehicles/${vehicle ? vehicle._id : "temp"}`;
  const timestamp = new Date().getTime().toString();

  if (!fs.existsSync(photoFolder)) {
    fs.mkdirSync(photoFolder)
  }

  sharp(photo)
    .rotate()
    // Resize to 1000px on longest side
    .resize(1000, 1000, {
      fit: 'inside',
    })
    .toFormat("jpg")
    .toFile(`${photoFolder}/${timestamp}-1000.jpg`)
    .then(() => {
      sharp(photo)
        .rotate()
        // Resize to 400px on longest side
        .resize(400, 400, {
          fit: 'inside',
        })
        .toFormat("jpg")
        .toFile(
          `${photoFolder}/${timestamp}-400.jpg`
        )
        .then(() => {
          req.body.photos = [timestamp];
          next();
          return;
        });
    })
    .catch(err => {
      console.error(err);
      req.flash(
        "error",
        "Sorry, there was an error uploading the photo. Please try again."
      );
      res.redirect("back");
    });
};
