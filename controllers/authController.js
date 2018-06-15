const passport = require("passport");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const promisify = require("es6-promisify");

exports.login = passport.authenticate("local", {
  failureRedirect: "/login",
  failureFlash: "Failed login",
  successRedirect: "/",
  successFlash: "Success! You are logged in"
});

exports.logout = (req, res) => {
  req.logout();
  req.flash("success", "You have been logged out");
  res.redirect("/");
};

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  req.flash("error", "You must be logged in to access that page");
  res.redirect("/login");
};

exports.registerUser = async (req, res, next) => {
  const user = new User({
    name: req.body.name,
    email: req.body.email
  });
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  next();
};
