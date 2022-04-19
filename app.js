//requiring dotenv and calling config on it at the very top to access the .env variables
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

//tell our app to use and set up the session package
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

//tell our app to use passport and initializing passport package
app.use(passport.initialize());
//tell our app to use passport and dealing with the session package
app.use(passport.session());

//using mongoose to connect to the mongoDB Database
mongoose.connect("mongodb://127.0.0.1:27017/userDB", {
  useNewUrlParser: true
});

//creating a Schema for the user
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

//adding the passportLocalMongoose plugin to the schema
//to hash and salt passwords and save users into DB
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//creating a new mongoose model based on the collection and schema in order to create users and adding them to the database
const User = new mongoose.model("User", userSchema);

//adding a helper method createStrategy to our Schema
//creating a local login strategy
passport.use(User.createStrategy());

//setting up passport to serialzie and deserialze our User
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, {
      id: user.id,
      username: user.username,
      name: user.name
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

//setting up and configuring google strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

//specifying a route for the chainable route handler
app.route("/")
  //specifying the method with a callback
  .get(function(req, res) {
    //rendering the ejs document called home
    res.render("home")
  });

//google authentication method
app.get("/auth/google",
  //using google strategy to authenticate the user
  passport.authenticate("google", {
    //telling google that we want to access the users profile
    scope: ["profile"]
  }));

//redirecting the user after login
app.get("/auth/google/secrets",
  passport.authenticate("google", {
    //failed authentication, redirect to login
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.route("/login")
  .get(function(req, res) {
    res.render("login")
  })
  .post(function(req, res) {
    //creating new user with inputed credentials
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });

    //log in and authenticate with passport
    //passing in the new user from login credentials
    req.login(user, function(err) {
      if (err) {
        //checking for potential errors
        console.log(err)
      } else {
        //authenticate the user login using passport
        passport.authenticate("local")(req, res, function() {
          //if successfull redirect user to secrets route
          res.redirect("/secrets")
        })
      }
    })
  });

app.get("/secrets", function(req, res) {
  //check the secret value of all users if it's not equal to null
  User.find({
    "secret": {
      $ne: null
    }
  }, function(err, foundUsers) {
    if (err) {
      console.log(err)
    } else {
      //if there are users with a secret value
      if (foundUsers) {
        //render secret page, passing the value of secret where it's not null
        res.render("secrets", {
          usersWithSecrets: foundUsers
        })
      }
    }
  })
});

app.route("/submit")
  .get(function(req, res) {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login")
    }
  })
  .post(function(req, res) {
    //saving the user inputed secret
    const submittedSecret = req.body.secret;
    //look in DB for user by ID
    User.findById(req.user.id, function(err, foundUser) {
      if (err) {
        console.log(err)
      } else {
        //check if user exists in DB
        if (foundUser) {
          //adding the inputed secret to the user
          foundUser.secret = submittedSecret
          //saving the updated user and redirecting
          foundUser.save(function() {
            res.redirect("/secrets")
          })
        }
      }
    })
  })

app.route("/logout")
  .get(function(req, res) {
    //loggin out the user and ending the session
    req.logout()
    //redirecting to home route
    res.redirect("/")
  });

app.route("/register")
  .get(function(req, res) {
    res.render("register")
  })
  .post(function(req, res) {
    //register the user passing the inputed credentials
    User.register({
      username: req.body.username
    }, req.body.password, function(err, user) {
      if (err) {
        //logging potential errors
        console.log(err)
        //redirecting the user back if error
        res.redirect("/register")
      } else {
        //authenticating the user locally, creating a logged in session
        passport.authenticate("local")(req, res, function() {
          //redirection the user if authentication successfull
          res.redirect("/secrets")
        })
      }
    })
  });









app.listen(3000, function() {
  console.log("Server started on port 3000.")
});
