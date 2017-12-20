const express = require("express");
const compression = require("compression");
const path = require("path");
const md5 = require("md5");
const fs = require("fs");
const passport = require("passport");
require("./helpers/passport");
const promisify = require("es6-promisify");
const flash = require("connect-flash");
const bodyParser = require("body-parser");
const expressValidator = require("express-validator");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo")(session);
const routes = require("./routes/routes");
const errorHandlers = require("./helpers/errorHandlers");
const { titleCase } = require("./helpers/titleString");
const { formatVehicleData } = require("./helpers/formatVehicleData");
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(compression());

const maxAge = process.env.NODE_ENV === "production" ? 31536000 : 1;
app.use(express.static(path.join(__dirname, "public"), { maxAge }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Exposes a bunch of methods for validating data. Used heavily on userController.validateRegister
app.use(expressValidator());

// // The flash middleware let's us use req.flash('error', 'Shit!'), which will then pass that message to the next page the user requests
app.use(flash());

// Sessions allow us to store data on visitors from request to request
// This keeps users logged in and allows us to send flash messages
app.use(
  session({
    secure: true,
    secret: process.env.SECRET,
    key: process.env.KEY,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  })
);

// // Passport JS is what we use to handle our logins
app.use(passport.initialize());
app.use(passport.session());

app.use("/", (req, res, next) => {
  const timestamp = new Date().toString();
  var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  console.log(`${timestamp} ${req.method} ${req.path} ${ip}`);
  if (req.method === "POST") {
    console.log(req.body);
  }
  next();
});

// Exposes variables and functions for use in Pug templates
app.use((req, res, next) => {
  res.locals.formatVehicleData = formatVehicleData;
  res.locals.titleCase = titleCase;
  res.locals.flashes = req.flash();
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  res.locals.query = req.query;
  if (process.env.NODE_ENV === "production") {
    res.locals.production = true;
  } else {
    const css = fs.readFileSync("public/css/style.css");
    res.locals.cssHash = md5(css);
  }
  next();
});

// promisify some callback based APIs
app.use((req, res, next) => {
  req.login = promisify(req.login, req);
  next();
});

app.use("/", routes);

app.use((req, res, next) => {
  if (req.accepts("html") && res.status(404)) {
    console.error(`🚫  🔥  Error 404 ${req.method} ${req.path}`);
    res.render("404");
  }
});

app.use(errorHandlers.flashValidationErrors);
app.use(errorHandlers.productionErrors);

module.exports = app;
