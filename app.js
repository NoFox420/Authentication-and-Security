//requiring dotenv and calling config on it at the very top to access the .env variables
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

//using mongoose to connect to the mongoDB Database
mongoose.connect("mongodb://127.0.0.1:27017/userDB", {
  useNewUrlParser: true
});

//creating a Schema for the user
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

//adding the encrypt as a plugin to our schema and passing over the secret as an object
//encrypting only the password field
// userSchema.plugin(encrypt, {
//   //accessing the secret variable inside .env
//   secret: process.env.SECRET,
//   encryptedFields: ["password"]
// });

//creating a new mongoose model based on the collection and schema in order to create users and adding them to the database
const User = new mongoose.model("User", userSchema);

//specifying a route for the chainable route handler
app.route("/")
  //specifying the method with a callback
  .get(function(req, res) {
    //rendering the ejs document called home
    res.render("home")
  });

app.route("/login")
  .get(function(req, res) {
    res.render("login")
  })
  .post(function(req, res) {
    //checking the db for the credentials that were just inputed
    const username = req.body.username;
    const password = req.body.password;


    User.findOne({
      //matching the saved email to the inputed username
      email: username
    }, function(err, foundUser) {
      if (err) {
        //logging possible errors
        console.log(err)
      } else {
        //check if the user exists
        if (foundUser) {
          //check if the found users password matches the inputed password
          bcrypt.compare(password, foundUser.password, function(err, result) {
            if (result === true) {
              res.render("secrets");
            }
          })
        }
      }
    })
  });

app.route("/register")
  .get(function(req, res) {
    res.render("register")
  })
  .post(function(req, res) {
    //generate a salt and hash
    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {

      //creating a user with the inputs made
      const newUser = new User({
        email: req.body.username,
        password: hash
      });
      //saving the created user to the database
      newUser.save(function(err) {
        if (err) {
          //loggind possible errors
          console.log(err)
        } else {
          //rendering the secrets page if everything worked
          res.render("secrets")
        }
      });
    })
  });









app.listen(3000, function() {
  console.log("Server started on port 3000.")
});
