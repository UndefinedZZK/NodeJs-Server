var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var assert = require('assert');


// Database
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/nodetest2');


var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var port = process.env.PORT || 3001;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/*
// <-------------------------------------------------------------------------->
// Retrieve
var MongoClient = require('mongodb').MongoClient;

// Connect to the db
MongoClient.connect("mongodb://localhost:27017/nodetest2", function(err, db) {
  if(!err) {
    console.log("We are connected");
    var collection = db.collection('openMRS');
    insertData(db, function() {
        db.close();
      }); 

    db.openMRS.find()
    /*
    MongoClient.connect("mongodb://localhost:27017/nodetest2", function(err, db) {
      assert.equal(err, null);
      queryData(db, function() {
        db.close();
      });
    }); 

  }else{
    console.log("Could not connect");
  }
});

var insertData = function(db,callback) {
    var collection = db.collection('openMRS');
    collection.insert({'givenName':'John'}, {'familyName':'Smith'}, {'email':'john@yahoo.com'}, {'openMRS_uuid':'dasdaswqe'}, {'device_udid':'dsadsa'}, {w:1}, function(err, result) {
      if( err || !saved ) console.log("User not saved");
      else console.log("User saved");
    });
}

var queryData = function(db, callback) {
   var cursor =db.collection('openMRS').find( );
   cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (doc != null) {
         console.log(doc);
      } else {
         callback();
      }
   });
};*/
// <-------------------------------------------------------------------------->



// ***************************** //
// GET DATA //
//**Receiving POST data**//

// Saving Data to the Node Server
app.post('/saveUser', function(request, response) {
    if(response.statusCode == 200) {
      console.log("TESTING......")
      console.log("This is your request: ", request.body);
      console.log("Given Name: ", request.body.givenName); 
      console.log("Family Name: ", request.body.familyName); 
      console.log("Email: ", request.body.email);
      console.log("openMRS uuid: ", request.body.openMRS_uuid);  
      console.log("Device udid: ", request.body.device_udid); 

      //Saving data to Mongo (in progress)
      var dataPatient = [{'givenName':request.body.givenName}, {'familyName':request.body.familyName}, {'email':request.body.email}, {'openMRS_uuid':request.body.openMRS_uuid}, {'device_udid':request.body.device_udid}];
      response.send("Message received: " + request.body + " Response code: " + response.statusCode);
      response.end();
    }else{
      response.send(" Error code: " + response.statusCode);
    }
});

// Create Patient - for openMRS
app.post('/createUser', function(request, response) {
    if(response.statusCode == 200) {
      response.send("Message received: " + request.body + " Response code: " + response.statusCode);
      createPatient(request.body); // <-- call to openMRS
      response.end();
    }else{
      response.send(" Error code: " + response.statusCode);
    }
});

// Create Observation
  app.post("/sendmessage", function(request, response) {
    if(response.statusCode == 200) {
      console.log(request.body);
      response.send("Message received: " + request.body + " Response code: " + response.statusCode);
      sendRequest(request.body); // <-- call to openMRS
      response.end();
    }else{
      response.send(" Error code: " + response.statusCode);
    }
});

// Get Observation
// Reading data from JSON
  app.post("/getObs", function(request, response) {
    if(response.statusCode == 200) {
      console.log(request.body.url); 
      getObservation(request.body.url) // <-- call to openMRS
      response.send("Message received: " + request.body + " Response code: " + response.statusCode);
      response.end();
    }else{
      response.send(" Error code: " + response.statusCode);
    }
});

// Delete Obs
app.post("/deleteObs", function(request, response) {
    if(response.statusCode == 200) {
      console.log(request.body.url); 
      console.log(">>>>>>>HERE<<<<<")
      deleteObservation(request.body.url) // <-- call to openMRS
      response.send("Message received: " + request.body + " Response code: " + response.statusCode);
      response.end();
    }else{
      response.send(" Error code: " + response.statusCode);
    }
});
// **************************** //


// POST DATA //
// Posting Patient to openMRS
function createPatient(requestData)
{
    var url = "http://uclactiveserver.westeurope.cloudapp.azure.com:8080/openmrs/ws/fhir/Patient";

    var options = {
      uri: url,
      method: 'POST',
      json: requestData,
       headers:{
        'Authorization': 'Basic ' + new Buffer("*****:*****").toString('base64')
       } 
    };

      request(options, function (error, response, body) {
        if (!error && (response.statusCode == 200 || response.statusCode == 201)) {
        console.log(body.id) // Print the shortened url.
      } else {
        console.log("error: " + error)
        console.log("response.statusCode: " + response.statusCode)
        console.log("response.statusText: " + response.statusText)
      }
    });
}

// Posting Observation to openMRS
function sendRequest(requestData)
{
    var url = "http://uclactiveserver.westeurope.cloudapp.azure.com:8080/openmrs/ws/fhir/Observation";

    var options = {
      uri: url,
      method: 'POST',
      json: requestData,
       headers:{
        'Authorization': 'Basic ' + new Buffer("*****:******").toString('base64')
       } 
    };

      request(options, function (error, response, body) {

        console.log("******");
        console.log(requestData);
        if (!error && (response.statusCode == 200 || response.statusCode == 201)) {
        console.log(body.id) // Print the shortened url.
      } else {
        console.log("error: " + error)
        console.log("response.statusCode: " + response.statusCode)
        console.log("response.statusText: " + response.statusText)
      }
    });
}

// Getting Observation from openMRS
function getObservation(requestData)
{
    var url = requestData;
    console.log("HEREEEE");
    console.log(requestData);
    var options = {
      uri: url,
      method: 'GET',
      headers:{
        'Authorization': 'Basic ' + new Buffer("nodejs:[]Uclactive15").toString('base64')
       } 
    };

      request(options, function (error, response, body) {
        if (!error && (response.statusCode == 200 || response.statusCode == 201)) {
            console.log(body) // Print the shortened url.
      } else {
        console.log("error: " + error)
        console.log("response.statusCode: " + response.statusCode)
        console.log("response.statusText: " + response.statusText)
      }
    });
}

// Delete Observation from openMRS
function deleteObservation(requestData)
{
    var url = requestData;
    console.log(requestData);
    var options = {
      uri: url,
      method: 'DELETE',
      headers:{
        'Authorization': 'Basic ' + new Buffer("nodejs:[]Uclactive15").toString('base64')
       } 
    };

      request(options, function (error, response, body) {
        if (!error && (response.statusCode == 200 || response.statusCode == 201)) {
            console.log(body) // Print the shortened url.
      } else {
        console.log("error: " + error)
        console.log("response.statusCode: " + response.statusCode)
        console.log("response.statusText: " + response.statusText)
      }
    });
}
// ****************************** //



// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    next();
});

app.use('/', routes);
app.use('/users', users);


// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


// start the server
app.listen(port);
console.log('Server started! At http://localhost:' + port);
module.exports = app;
