const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pageController");

router.get("/", pageController.homepage);

module.exports = router;
