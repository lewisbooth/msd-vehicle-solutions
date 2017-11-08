const mongoose = require("mongoose");

require("dotenv").config({ path: "variables.env" });
process.env.ROOT = __dirname;

mongoose.connect(process.env.DATABASE, { useMongoClient: true });
mongoose.Promise = global.Promise;
mongoose.connection.on("error", err => {
  console.error(`🚫 → ${err.message}`);
});

require("./models/Vehicle");

const app = require("./app");

app.set("port", process.env.PORT || 8888);
const server = app.listen(app.get("port"), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});
