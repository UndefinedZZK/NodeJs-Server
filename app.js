var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var assert = require('assert');


var index = require('./routes/index');
var users = require('./routes/users');

var app = express();
var azure = require('azure-storage');
var uuid = require('node-uuid');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overridden in the second argument.
function CSVToArray(strData, strDelimiter) {
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = (strDelimiter || ",");
    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp((
    // Delimiters.
    "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
    // Quoted fields.
    "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
    // Standard fields.
    "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");
    // Create an array to hold our data. Give the array
    // a default empty first row.
    var arrData = [[]];
    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches = null;
    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while (arrMatches = objPattern.exec(strData)) {
        // Get the delimiter that was found.
        var strMatchedDelimiter = arrMatches[1];
        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push([]);
          }
        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[2]) {
            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            var strMatchedValue = arrMatches[2].replace(
              new RegExp("\"\"", "g"), "\"");
          } else {
            // We found a non-quoted value.
            var strMatchedValue = arrMatches[3];
          }
        // Now that we have our value string, let's add
        // it to the data array.
        arrData[arrData.length - 1].push(strMatchedValue);
      }
    // Return the parsed data.
    return (arrData);
  }
  
  //CSV to JSON
  function CSV2JSON(csv) {
    var array = CSVToArray(csv);
    var objArray = [];
    for (var i = 1; i < array.length; i++) {
      objArray[i - 1] = {};
      for (var k = 0; k < array[0].length && k < array[i].length; k++) {
        var key = array[0][k];
        objArray[i - 1][key] = array[i][k]
      }
    }

    var json = JSON.stringify(objArray);
    var str = json.replace(/},/g, "},\r\n");

    return str;
  }

// IMPORTANT!!! - COMMENT THIS SECTION IF THE CSV WAS ALREADY PARSED AND SAVED INTO MONGO - OTHERWISE IT WILL BE IMPORTED AGAIN
// uses stream&pipe 
// RAM usage < 60mb
// <--------------------PARSE LARGE CSV--------------------------------------->

var csv = require('csv-parser')
var fs = require('fs')
		, es = require('event-stream');
var file = 'CSVs/vGymSwipeGM.csv';
var lineNr = 0;


var stream = csv(['Swipes', 'Gender', 'Post_Out_Code', 'MemberID_Hash', 'Year_Of_Birth', 'Member_Key_Hash', 'SITE_NAME', 'Time_Key', 'Swipe_DateTime', 'Date_Key', 'TRANSACTION_EVENT_KEY'])

var s = fs.createReadStream(file)
  .pipe(stream)
  .on('data', function (data) {	
	s.pause();

    lineNr += 1;
	if(lineNr!=1)
		console.log('Row %s: Swipes %s Gender %s Post_Out_Code %s MemberID_Hash %s Year_Of_Birth %s Member_Key_Hash %s SITE_NAME %s Time_Key %s Date_Key %s TRANSACTION_EVENT_KEY %s' , lineNr, data.Swipes, data.Gender, data.Post_Out_Code, data.MemberID_Hash, data.Year_Of_Birth, data.Member_Key_Hash, data.SITE_NAME, data.Time_Key, data.Date_Key, data.TRANSACTION_EVENT_KEY);


	s.resume();
	
	if(lineNr==4)
		s.pause();
  })

/*
// Method II - Using Papa Parse 

var Papa = require('babyparse');
var fs = require('fs')
	, util = require('util')
    , stream = require('stream')
    , es = require('event-stream');
	
var lineNr = 0;
var file = 'CSVs/vGymSwipeGM.csv';
var obj;

var s = fs.createReadStream(file)
    .pipe(es.split())
	//.pipe(es.stringify())
    .pipe(es.mapSync(function(line){

        // pause the readstream
        s.pause();

        lineNr += 1;

        // process line here and call s.resume() when rdy
        // function below was for logging memory usage
        //logMemoryUsage(lineNr);

		console.log("Row ", lineNr, " : ", line);
		
		
		//var array = CSV2JSON(line);
		//console.log("Array ", lineNr, " : ", JSON.parse(CSV2JSON(line)));

        // resume the readstream, possibly from a callback
        s.resume();
		
		if(lineNr==3)
			s.pause();
    })
    .on('error', function(){
        console.log('Error while reading file.');
    })
    .on('end', function(){
        console.log('Read entire file.')
    })
);*/

/*
var content = fs.readFileSync(file, { encoding: 'binary' });
Papa.parse(content, {
    step: function(row){
        console.log("Row: ", row.data);
    }
}); */

// <--------------------AZURE STUFF------------------------------------------->

// QUEUE CREDENTIALS ----> TO DO: create encrypted config file <----
var accountname = "testqueue31";
var accountkey = "sdaHxeMYILrdpbqxxG0klHsgUMQFHNyo6GT+9uVn5vET6WnFi42Sk1iT3HjI3XFcJS4OGRf3YmFs7h/1tSrtSw==";

function queue(QueueName, requestData) {
	console.log("\nPosting to queue...");
	var queueService = azure.createQueueService(accountname, accountkey);	
		
	 queueService.createQueueIfNotExists(QueueName, function(error, result, response){
        if(!error)
        {
			if(result.created){console.log("Just created the queue: " + QueueName);}
			else{console.log("Your queue " + QueueName+ " exists already!");}
			//console.log("Trying to insert: ", requestData);
			
			// Inserts a new message to queue
			queueService.createMessage(QueueName, requestData, function(error, result, response){
				if(!error){console.log("Your messaged was insterted into the queue");}
				else{console.log("ERROR!!!!!!!");}  
			}); 
			
			// Prints the last message from the queue
			queueService.peekMessages(QueueName, function(error, result, response){
			  if(!error){console.log("Last message inserted in the queue ", result);}
			});

			
			// Deletes the last message from the queue
			/*
			queueService.getMessages(QueueName, function(error, result, response){
			  if(!error){
				var message = result[0];
				//console.log ("Message to be deleted ", message);
				
				queueService.deleteMessage(QueueName, message.messageId, message.popReceipt, function(error, response){
				  if(!error){console.log("Deleted the last message");}
				  else{console.log("Couldn't delete the message");}
				});
			  }
			});
			*/
			
			// Delete a queue 
			/*
			queueService.deleteQueue("sasa", function(error, response){
			  if(!error){console.log ("Queue was deleted! :D");}
			  else {console.log("Couldn't delete queue! :(")}
			});
			*/
			
        }else{console.log("error: " + error);}
    });
}


//<-----------------DATA FLOW FROM/TO SWIFT APP---------------------------------------->

// ***************************** //
// GET DATA //
//**Receiving POST data**//

// Saving Data
app.post('/saveUser', function(request, response) {
    if(response.statusCode == 200) { 
	/*
      console.log("TESTING......")
      console.log("This is your request: ", request.body);
      console.log("\nGiven Name: ", request.body.givenName); 
      console.log("Family Name: ", request.body.familyName); 
	  console.log("Sex: ", request.body.sex);  
	  console.log("Birthdate: ", request.body.birthdate);
      console.log("Email: ", request.body.email);
      console.log("Postal Code: ", request.body.postalcode);  
	  console.log("Country: ", request.body.country);  
      console.log("Device udid: ", request.body.device_udid); 
	 */
	 

	 //console.log("This is your request: ", JSON.stringify(request.body));

	 queue("v44hnc76pf", JSON.stringify(request.body));
	  
      //Saving data to Mongo (in progress)
      // var dataPatient = [{'givenName':request.body.givenName}, {'familyName':request.body.familyName}, {'email':request.body.email}, {'openMRS_uuid':request.body.openMRS_uuid}, {'device_udid':request.body.device_udid}];
      //response.send("Message received: " + request.body + " Response code: " + response.statusCode);
      // response.end();
    }else{
      response.send(" Error code: " + response.statusCode);
    }
});

// Create Patient - for openMRS
app.post('/createUser', function(request, response) {
	console.log("Creating user..." + request + " " + request.body + " Response: " + response);
    if(response.statusCode == 200) {
	  console.log("I AM HEREEEEE " + request.body);
      response.send("Message received: " + request.body + " Response code: " + response.statusCode);
      createPatient(request.body); // <-- call to openMRS
      response.end();
    }else{
	  console.log("JSON: " + request + " " + response.statusCode);
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
    var url = "http://uclactive.westeurope.cloudapp.azure.com:8080/openmrs/ws/fhir/Patient";

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
    var url = "http://uclactive.westeurope.cloudapp.azure.com:8080/openmrs/ws/fhir/Observation";

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
        'Authorization': 'Basic ' + new Buffer("admin:Uclactive15").toString('base64')
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
        'Authorization': 'Basic ' + new Buffer("admin:Uclactive15").toString('base64')
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

/*
// <---------------------------------MONGO STUFF----------------------------------------->
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


/*
// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    next();
});
*/


app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


console.log('Server started! At http://localhost:3000');
module.exports = app;