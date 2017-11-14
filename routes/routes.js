const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pageController");
const listingController = require("../controllers/listingController");
const adminController = require("../controllers/adminController");

// Standard pages
router.get("/", pageController.homepage);
router.get("/sales", pageController.sales);
router.get("/leasing", pageController.leasing);
router.get("/van-sizes", pageController.vanSizes);
router.get("/van-conversions", pageController.conversions);
router.get("/modifications", pageController.modifications);
router.get("/servicing", pageController.servicing);
router.get("/contact", pageController.contact);
router.post("/contact", pageController.contactSubmit);

// Listings
router.get("/hire/vans", listingController.hireListingVans);
router.get("/hire/cars", listingController.hireListingCars);
router.get("/sales/vans", listingController.salesListingVans);
router.get("/sales/cars", listingController.salesListingCars);
router.get("/leasing/vans", listingController.leaseListingVans);
router.get("/leasing/cars", listingController.leaseListingCars);

// Admin
router.get("/admin", adminController.dashboard);

module.exports = router;
