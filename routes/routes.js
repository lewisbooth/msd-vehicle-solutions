const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pageController");
const listingController = require("../controllers/listingController");
const adminController = require("../controllers/adminController");
const authController = require("../controllers/authController");

// Standard pages
router.get("/", pageController.homepage);
router.get("/sales", pageController.sales);
router.get("/leasing", pageController.leasing);
router.get("/van-sizes", pageController.vanSizes);
router.get("/custom-vehicles", pageController.customVehicles);
router.get("/servicing", pageController.servicing);
router.get("/contact", pageController.contact);
router.post("/contact", pageController.contactSubmit);

// Listings
router.get("/vehicles/:type/:vehicle", listingController.listingPage);
router.get("/vehicles/:id", listingController.listingPage);

// Admin
router.get("/login", adminController.login);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.get("/dashboard", authController.isLoggedIn, adminController.dashboard);

module.exports = router;
