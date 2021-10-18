var ejs = require('ejs');
var fs = require('fs');
var path = require('path');
var express = require("express");
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var passport = require('passport');
var saml = require('passport-saml');
var multer = require('multer');
const { MetadataReader, toPassportConfig } = require('passport-saml-metadata');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {

        // Uploads is the Upload_folder_name
        cb(null, "")
    },
    filename: function (req, file, cb) {
        cb(null, 'allbound_metadata.xml')
    }
})

const maxSize = 1 * 1000 * 1000;
var upload = multer({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: function (req, file, cb){

        // Set the filetypes, only XML is allowed
        var filetypes = /xml/;
        var mimetype = filetypes.test(file.mimetype);

        var extname = filetypes.test(path.extname(
            file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }

        cb("Error: File upload only supports the "
            + "following filetypes - " + filetypes);
    }

// mypic is the name of file attribute
}).single("mypic");



passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

const reader = new MetadataReader(fs.readFileSync(path.join(__dirname, './allbound_metadata.xml'), 'utf8'));
const config = toPassportConfig(reader);

fs.writeFile('/app/idp_cert.pem', config.cert, function(err) {
  if(err) {
      return console.log(err);
  }
  console.log("The file was saved!");
}); 

var samlStrategy = new saml.Strategy({
  // URL that goes from the Identity Provider -> Service Provider
  callbackUrl: "https://demosp-sso.dev.allbound.xyz/login/callback",
  // URL that goes from the Service Provider -> Identity Provider
  entryPoint: config.entryPoint,
  issuer: config.identityProviderUrl,
  identifierFormat: null,
  // Identity Provider's public key
  cert: fs.readFileSync(__dirname + '/idp_cert.pem', 'utf8'),
  validateInResponseTo: false,
  disableRequestedAuthnContext: true,
    additionalParams: {'RelayState': 'rte'}
}, function(profile, done) {
  return done(null, profile); 
});

passport.use(samlStrategy);

var app = express();

app.use(cookieParser());
app.use(bodyParser());
app.use(session({secret: "secret"}));
app.use(passport.initialize());
app.use(passport.session());
app.set('view engine', 'ejs');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated())
    return next();
  else
    return res.redirect('/login/fail');
}


app.get('/',
  ensureAuthenticated, 
  function(req, res) {
    res.render('index', { user: req.user});
    console.log(req.user);
  }
);

app.get('/upload',
    function(req, res) {
        res.render('upload', { user: req.user});
        console.log(req.user);
    }
);

app.get('/login',
  passport.authenticate('saml', { failureRedirect: '/login/fail' }),
  function (req, res) {
    res.redirect('/');
  }
);

app.post('/login/callback',
   passport.authenticate('saml', { failureRedirect: '/login/fail' }),
  function(req, res) {
    res.redirect('/');
  }
);

app.get('/login/fail', 
  function(req, res) {
    res.status(401).send('Login failed');
  }
);

//general error handler
app.use(function(err, req, res, next) {
  console.log("Fatal error: " + JSON.stringify(err));
  next(err);
});

app.post("/upload",function (req, res, next) {

    // Error MiddleWare for multer file upload, so if any
    // error occurs, the image would not be uploaded!
    upload(req,res,function(err) {

        if(err) {

            // ERROR occured (here it can be occured due
            // to uploading image of size greater than
            // 1MB or uploading different file type)
            res.send(err)
        }
        else {

            // SUCCESS, image successfully uploaded
            res.send("Success hink, File uploaded!")
        }
    })
})

var server = app.listen(9090, function () {
  console.log('Listening on port %d', server.address().port)
});