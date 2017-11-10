const express = require("express");
const compression = require("compression");
const passport = require("passport");
const bodyParser = require("body-parser");
const routes = require("./routes/routes");
const path = require("path");
const mongoose = require("mongoose");
const Vehicle = mongoose.model("Vehicle");
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(compression());

const maxAge = process.env.NODE_ENV === "production" ? 31536000 : 1;
app.use(express.static(path.join(__dirname, "public"), { maxAge: 31536000 }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", (req, res, next) => {
  const timestamp = new Date().toString();
  console.log(`${timestamp} ${req.method} ${req.path} ${req.ip}`);
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

app.use("/", routes);

app.use((req, res, next) => {
  if (req.accepts("html") && res.status(404)) {
    console.error(`🚫  🔥  Error 404 ${req.method} ${req.path}`);
    res.render("404");
  }
});

module.exports = app;