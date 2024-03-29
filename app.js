const express = require("express")
const compression = require("compression")
const path = require("path")
const md5 = require("md5")
const fs = require("fs")
const session = require("express-session")
const mongoose = require("mongoose")
const MongoStore = require("connect-mongo")
const passport = require("passport")
require("./helpers/passport")
const { promisify } = require("es6-promisify")
const flash = require("connect-flash")
const device = require("device")
const bodyParser = require("body-parser")
const expressValidator = require("express-validator")
const routes = require("./routes/routes")
const { logging } = require("./helpers/logging")
const sitemap = require("./helpers/sitemap")
const { titleCase } = require("./helpers/titleString")
const { formatVehicleData } = require("./helpers/formatVehicleData")
const errorHandlers = require("./helpers/errorHandlers")
const app = express()

// Load the Pug template views
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "pug")

// Enable gzip
app.use(compression())

// Set cache headers for static content
const maxAge = process.env.NODE_ENV === "production" ? 31536000 : 1
app.use(express.static(path.join(__dirname, "public"), { maxAge }))

// BodyParser middleware to parse POST data
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// Data validation library
app.use(express.json())

// Dynamic flash messages that are passed to the template (e.g. "Successfully logged in" or "Incorrect login details")
app.use(flash())

// Cookies for tracking users login sessions
app.use(
  session({
    secure: true,
    secret: process.env.SECRET,
    key: process.env.KEY,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE })
  })
)

// PassportJS handles user logins
app.use(passport.initialize())
app.use(passport.session())

// Log requests with a timestamp, HTTP method, path and IP address
app.use(logging)

// Exposes variables and functions for use in Pug templates
app.use((req, res, next) => {
  // Parses the User Agent into desktop, phone, tablet, phone, bot or car
  res.locals.device = device(req.headers['user-agent']).type
  if (req.headers['user-agent'].includes("sights")) res.locals.bot = true
  // Function to remove 0s and empty entries from vehicle object
  res.locals.formatVehicleData = formatVehicleData
  res.locals.titleCase = titleCase
  res.locals.flashes = req.flash()
  res.locals.user = req.user || null
  res.locals.currentPath = req.path
  res.locals.query = req.query
  if (process.env.NODE_ENV === "production") {
    res.locals.production = true
  } else {
    const css = fs.readFileSync("public/css/style.css")
    res.locals.cssHash = md5(css)
  }
  next()
})

// Promisify some callback based APIs
app.use((req, res, next) => {
  req.login = promisify(req.login, req)
  next()
})

// Route handler
app.use("/", routes)

// 404 if no routes are found
app.use((req, res, next) => {
  if (req.accepts("html") && res.status(404)) {
    // Avoid spamming 404 console errors when sitemap is generated
    if (!req.headers['user-agent'].includes('Node/SitemapGenerator')) {
      console.error(`🚫  🔥  Error 404 ${req.method} ${req.path}`)
    }
    res.render("404")
  }
})

// Flash any errors that occurred
app.use(errorHandlers.flashValidationErrors)
app.use(errorHandlers.productionErrors)

module.exports = app
