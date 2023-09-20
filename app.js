import dotenv from "dotenv";
import express from "express";
import multer from "multer"
import fs from "fs";
import twilio from "twilio";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import GoogleStrategy from "passport-google-oauth20";
import findOrCreate from "mongoose-findorcreate";

dotenv.config();
GoogleStrategy.Strategy;
const directoryPath = 'documents';

const app = express();
const port = 3000;

app.use("/public",express.static("./public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: process.env.SECRET, // Secret used to sign the session ID cookie
    resave: false, // Forces the session to be saved back to the session store, even if it wasn't modified during the request
    saveUninitialized: false // Ensures uninitialized sessions are not saved to the session store
}));
app.use(passport.initialize()); // Initialize Passport.js
app.use(passport.session()); // Enable persistent login sessions using Passport.js


mongoose.connect(process.env.URI, {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    google_ID: String,
    secret: String
});
userSchema.plugin(passportLocalMongoose); // Simplifies Passport authentication with username and password
userSchema.plugin(findOrCreate); // Adds the "findOrCreate" method to the user schema

const User = mongoose.model('User', userSchema); // Create a User model using the user schema
passport.use(User.createStrategy()); // Set up Passport to use the local strategy for authentication

// Serialize and deserialize user instances to and from the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            done(err, null);
        });
});

passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/outsettle",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({google_ID: profile.id}, function (err, user) {
            return cb(err, user);
        });
    }
));

const accountSid = 'ACcd1284ff9c91faa4f72ecb15f25de1dd';
const authToken = 'b855e05cfe38977fcadfec2ee6565370';
const client = twilio(accountSid, authToken);

fs.mkdir(directoryPath, { recursive: true }, (err) => {
    if (err) {
        console.error('Error creating directory:', err);
    } else {
        console.log('Directory created successfully.');
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'documents/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });
app.get("/",(req,res)=>{
    res.render("home.ejs")
})

app.get("/auth/google", passport.authenticate("google", {scope: ["profile"]})); // Authenticate with Google

app.get('/auth/google/outsettle',
    passport.authenticate('google', {failureRedirect: '/login'}),
    function (req, res) {
        // Successful authentication, redirect to the "/secrets" page
        res.redirect("/secrets");
    });

app.get("/login", (req, res) => {
    res.render("login"); // Render the "login" template
});

app.get("/register", (req, res) => {
    res.render("register"); // Render the "register" template
});

app.get("/secrets", (req, res) => {
    User.find({'secret': {$ne: null}}).then((found) => {
        res.render("secrets", {usersWithSecrets: found});
    }).catch((err) => {
        console.log("Error in rendering secrets => " + err);
    });
});

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login"
}));

app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", (req, res) => {
    const secret = req.body.secret;
    User.findById(req.user.id).then((found) => {
        found.secret = secret;
        found.save().then(() => {
            res.redirect("/secrets");
        });
    }).catch(() => {
        console.log("Error, couldn't submit secret");
    });
});

app.get("/claims",(req,res)=>{
    res.render("claims.ejs");
})

app.post("/claims",(req,res)=>{
    client.messages
        .create({
            body: 'Alpha2 testing enabled.',
            from: '+12564483528',
            to: '+918002215433',
        })
        .then((message) => console.log('SMS sent:', message.sid))
        .catch((error) => console.error('Error sending SMS:', error)).then(()=>{res.render("home.ejs")});
})

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send('File uploaded!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});