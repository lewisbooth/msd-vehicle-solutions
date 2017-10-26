const mongoose = require("mongoose");

exports.homepage = async (req, res) => {
  // const stores = await Store.getTopStores();
  res.render("index", { title: "Car & Van Hire in Stoke-on-Trent" });
};
