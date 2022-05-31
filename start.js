process.env.ROOT = __dirname

const mongoose = require("mongoose")
const mongo = require("./helpers/mongo")
const cron = require("node-cron")
const sitemap = require("./helpers/sitemap")
const ip = require("ip")

// Load environment variables from file
require("dotenv").config({ path: "variables.env" })

if (!process.env.DATABASE) {
  console.error('ERROR: No database specified'.bgRed)
  process.exit()
}

// Initiate the database connection
mongoose.connect(process.env.DATABASE, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
}).then(() => {
  process.env.CONNECTED = 'true'
  console.log('✔ Connected to MongoDB')
}, err => {
  process.env.CONNECTED = 'false'
  console.error(err.message)
  console.error('Error connecting to database')
})

// Load the MongoDB models
require("./models/Vehicle")
require("./models/User")

// Schedule daily backups at 4am
cron.schedule("0 4 * * *", () => {
  mongo.backup()
})

// Schedule daily sitemap generations at 5am
sitemap.generate()
cron.schedule("0 5 * * *", () => {
  sitemap.generate()
})

// Load the server files & set the port to 8888
const app = require("./app")
app.set("port", process.env.PORT || 8888)

// Initiate the server
const server = app.listen(app.get("port"), () => {
  if (process.env.NODE_ENV === "production") {
    console.log("⚡  Production Mode ⚡")
  } else {
    console.log("🐌  Development Mode 🐌 ")
  }
  console.log(`Local address: http://${ip.address()}:${server.address().port}`)
})
