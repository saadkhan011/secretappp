//jshint esversion:6
require('dotenv').config()
const express = require("express")
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// session will generate cookie 
const session = require('express-session');
// passport is for authentication 
const passport = require("passport")
// passport local is for username and password authentication 
// we are using third party passport local mongoose for authentication  
const passportLocalMongoose = require("passport-local-mongoose")
// google Strategy is passport Strategy for using sign up method with google 
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const { authenticate } = require('passport');
const { Strategy } = require('passport-local');
const { Cookie } = require('express-session');


const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(express.static("public"));

// we are generting Cookie here
app.use(session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: false,
    // we can also set expiry time of Cookie here 
}))

app.use(passport.initialize());
app.use(passport.session());

// mongoose.connect("mongodb://localhost:27017/singnupForm");
mongoose.connect(process.env.MONGO_URI);

const dbSchema = new mongoose.Schema({
    username: String,
    password: String,
    // we are adding googleid in our database to identify the user this googleid come from google 
    googleId: String,
    secret: String
})
dbSchema.plugin(findOrCreate);
dbSchema.plugin(passportLocalMongoose)

const form = mongoose.model("form", dbSchema);

passport.use(form.createStrategy());

// passport.serializeUser(form.serializeUser());
// passport.deserializeUser(form.deserializeUser());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    // this is the url where google will redirect after authentication 
    callbackURL: "https://secretappp.herokuapp.com/auth/google/secrets",
},
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile)
        // this findOrCreate method does not come from mongoose so that's why we are using npm package
        form.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));




app.get("/", function (req, res) {
    res.render("home");
})
// this is the url where user will redirect when user will click for google authentication 
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));
    // scope define which thing you want from google here here we need user profile

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

app.get("/login", function (req, res) {
    res.render("login")
})
app.get("/register", function (req, res) {
    res.render("register")
})


app.get("/logout", function (req, res) {
    // this req.logout method provide by passport 
    req.logOut(function (err) {
        if (err) {
            console.log(err)
        }
    });
    res.redirect("/")
})



app.get("/secrets", function (req, res) {
    // here we are finding any secret post that is in our database so we can place it in our secret page 
    form.find({ secret: { $ne: null } }, function(err, data){
        if (err){
            console.log(err)
        }
        else{
            console.log(data)
            console.log(data.length)
            res.render("secrets", {object: data})
        }
    })
})


app.get("/submit", function (req, res) {
    // it is the submit page we will only show thia page if user is authenticate 
    if (req.isAuthenticated()) {
        res.render("submit")
        console.log(req.isAuthenticated())
    }
    else {
        console.log(req.isAuthenticated())
        res.redirect("/login");
    }
})

app.post("/submit", function(req, res){
    console.log(req.user)
    console.log(req.body.secret)
    // here we are adding secret post in our database
    form.findByIdAndUpdate(req.user.id, {secret: req.body.secret}, function(err, docs){
        if (err){
            console.log(err)
        }
        else{
            res.redirect("/secrets")
        }
    })
})


app.post("/register", function (req, res) {
    // here we are using passport register method it will save the username and password in the database
    form.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err)
            res.redirect("/register")
        }
        else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    })
})
app.post("/login", function (req, res) {
    // here we are making a new schema so we can authentciate 
    const user = new form({
        username: req.body.username,
        password: req.body.password
    })
    req.login(user, function (err) {
        if (err) {
            console.log(err)
        }
        else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    })
})





let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port);


