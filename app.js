var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
 var request = require('request');

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


// ***************************** //
// GET DATA //
//**Receiving POST data**//

// Reading parameters from URL
// POST http://localhost:8080/api/users
app.post('/createUser', function(request, response) {
    if(response.statusCode == 200) {
      console.log(request.body); 
      console.log("I AM HEREEEE!");
      response.send("Message received: " + request.body + " Response code: " + response.statusCode);
      createPatient(request.body);
      response.end();
    }else{
      response.send(" Error code: " + response.statusCode);
    }
});

// Reading data from JSON
  app.post("/sendmessage", function(request, response) {
    if(response.statusCode == 200) {
      console.log(request.body); 
      response.send("Message received: " + request.body + " Response code: " + response.statusCode);
      sendRequest(request.body);
      response.end();
    }else{
      response.send(" Error code: " + response.statusCode);
    }
});
// **************************** //


// POST DATA //
// **Sending POST request to openMRS**
function createPatient(requestData)
{
    var url = "http://uclactiveserver.westeurope.cloudapp.azure.com:8080/openmrs/ws/fhir/Patient";

    var options = {
      uri: url,
      method: 'POST',
      json: requestData,
       headers:{
        'Authorization': 'Basic ' + new Buffer("nodejs:[]Uclactive15").toString('base64')
       } 
    };

      request(options, function (error, response, body) {

       // console.log("******");
        //console.log(requestData);
        if (!error && (response.statusCode == 200 || response.statusCode == 201)) {
        console.log(body.id) // Print the shortened url.
      } else {
        console.log("error: " + error)
        console.log("response.statusCode: " + response.statusCode)
        console.log("response.statusText: " + response.statusText)
      }
    });
}
function sendRequest(requestData)
{
    var url = "http://uclactiveserver.westeurope.cloudapp.azure.com:8080/openmrs/ws/fhir/Observation";

    var options = {
      uri: url,
      method: 'POST',
      json: requestData,
       headers:{
        'Authorization': 'Basic ' + new Buffer("nodejs:[]Uclactive15").toString('base64')
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
