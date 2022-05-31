const express = require("express")
const router = express.Router()
const pageController = require("../controllers/pageController")
const listingController = require("../controllers/listingController")
const adminController = require("../controllers/adminController")
const authController = require("../controllers/authController")
const { catchErrors } = require("../helpers/errorHandlers")
const multer = require("multer")
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: "20MB",
    files: 1
  }
})

// Standard pages
router.get("/", catchErrors(pageController.homepage))
router.get("/sales", pageController.sales)
router.get("/leasing", pageController.leasing)
router.get("/van-sizes", pageController.vanSizes)
router.get("/customs", pageController.customVehicles)
router.get("/servicing", pageController.servicing)
router.get("/contact", pageController.contact)
router.post("/contact", pageController.contactSubmit)
router.get("/privacy", pageController.privacy)
router.get("/terms-and-conditions", pageController.terms)

// Listings
router.get("/vehicles", (req, res) => 
  res.redirect("/vehicles/listing/hire?size=all"))

router.get("/vehicles/listing/:type", listingController.listingPage)
router.get("/vehicles/:vehicleId", listingController.vehiclePage)

// Admin
router.get("/login", adminController.login)
router.post("/login", authController.login)
router.get("/logout", authController.logout)
router.get("/admin", authController.isLoggedIn, adminController.dashboard)
router.get(
  "/admin/add",
  authController.isLoggedIn,
  adminController.addVehiclePage
)
router.post(
  "/admin/add",
  authController.isLoggedIn,
  upload.single("photo"),
  catchErrors(adminController.uploadVehiclePhoto),
  catchErrors(adminController.addVehicle)
)
router.get(
  "/admin/edit/:vehicleId",
  authController.isLoggedIn,
  catchErrors(adminController.editVehiclePage)
)
router.post(
  "/admin/edit/:vehicleId",
  authController.isLoggedIn,
  upload.single("photo"),
  catchErrors(adminController.uploadVehiclePhoto),
  catchErrors(adminController.editVehicle)
)
router.get(
  "/admin/delete/:vehicleId",
  authController.isLoggedIn,
  catchErrors(adminController.deleteVehicle)
)

module.exports = router
