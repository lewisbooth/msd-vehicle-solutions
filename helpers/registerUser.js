const mongoose = require("mongoose");
const User = mongoose.model("User");
const promisify = require("es6-promisify");

exports.registerUser = async (username, password) => {
  const user = new User({
    username
  });
  const register = promisify(User.register, User);
  register(user, password);
};
