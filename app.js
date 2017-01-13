var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var assert = require('assert');
var http = require('http');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();
var azure = require('azure-storage');
var uuid = require('node-uuid');

// <-------------------------PATHS--------------------------------->
var mongourl = 'mongodb://localhost:27017/test';
// MEAN Stack Dashboard Server Path
var dashboardGetQueryJson = "http://localhost:9000/getQueryJson";
// <--------------------------------------------------------------->

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


app.all('*', function(req, res,next) {


    /**
     * Response settings
     * @type {Object}
     */
    var responseSettings = {
        "AccessControlAllowOrigin": req.headers.origin,
        "AccessControlAllowHeaders": "Content-Type,X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5,  Date, X-Api-Version, X-File-Name",
        "AccessControlAllowMethods": "POST, GET, PUT, DELETE, OPTIONS",
        "AccessControlAllowCredentials": true
    };

    /**
     * Headers
     */
    res.header("Access-Control-Allow-Credentials", responseSettings.AccessControlAllowCredentials);
    res.header("Access-Control-Allow-Origin",  responseSettings.AccessControlAllowOrigin);
    res.header("Access-Control-Allow-Headers", (req.headers['access-control-request-headers']) ? req.headers['access-control-request-headers'] : "x-requested-with");
    res.header("Access-Control-Allow-Methods", (req.headers['access-control-request-method']) ? req.headers['access-control-request-method'] : responseSettings.AccessControlAllowMethods);

    if ('OPTIONS' == req.method) {
        res.send(200);
    }
    else {
        next();
    }


});

// <---------------------GETTING DATA FROM MONGO------------------------------>


// IMPORTANT!!! - COMMENT THIS SECTION IF THE CSV WAS ALREADY PARSED AND SAVED INTO MONGO - OTHERWISE IT WILL BE IMPORTED AGAIN
// uses stream&pipe 
// RAM usage < 60mb
// <--------------------PARSE LARGE CSV--------------------------------------->
/*
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
	{
		console.log('Row %s: Swipes %s Gender %s Post_Out_Code %s MemberID_Hash %s Year_Of_Birth %s Member_Key_Hash %s SITE_NAME %s Time_Key %s Date_Key %s TRANSACTION_EVENT_KEY %s' , lineNr, data.Swipes, data.Gender, data.Post_Out_Code, data.MemberID_Hash, data.Year_Of_Birth, data.Member_Key_Hash, data.SITE_NAME, data.Time_Key, data.Date_Key, data.TRANSACTION_EVENT_KEY);
		var JSON = "{\"collection\":\"observations\",\"content\":{\"Swipes\":\"" + data.Swipes + "\",\"Gender\":\"" + data.Gender + "\",\"Post_Out_Code\":\"" + data.Post_Out_Code + "\",\"MemberID_Hash\":\"" + data.MemberID_Hash + "\",\"Year_Of_Birth\":\"" + data.Year_Of_Birth + "\",\"Member_Key_Hash\":\"" + data.Member_Key_Hash + "\",\"SITE_NAME\":\"" + data.SITE_NAME + "\",\"Time_Key\":\"" + data.Time_Key + "\",\"Swipe_DateTime\":\"" + data.Date_Key + "\",\"Date_Key\":\"" + data.Date_Key + "\",\"TRANSACTION_EVENT_KEY\":\"" + data.TRANSACTION_EVENT_KEY + "\"}}"
		console.log('JSON: %s', JSON);
		
		// sending to azure queue
		queue('v44hnc76pf', JSON);
	}

	s.resume();
	 
	//if(lineNr==1000)
	//	s.pause();
  })
*/
  

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


//<-----------------MONGO QUERIES---------------------------------------------------------->

var mongodb = require('mongodb');
//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;
// Connection URL. This is where your mongodb server is running.
var url = mongourl;
	
function mongoAnalytics(userID, gymMonth) {
	// Use connect method to connect to the Server
	MongoClient.connect(url, function (err, db) {
	  if (err) {
		console.log('Unable to connect to the mongoDB server. Error:', err);
	  } else {
		//HURRAY!! We are connected. :)
		console.log('Connection established to', url);
		//getNrOfSwipes(userID, gymMonth);
		monthlyStatistics(gymMonth);
		//getNeighbouringValues(10);
	  }
	});
}

function getNrOfSwipes (userID, gymMonth) {
	MongoClient.connect(url, function (err, db) {
		if (err) {
			console.log('Unable to connect to the mongoDB server. Error:', err);
		} else { 
			// Get the documents collection
			var collection = db.collection('observations');
			// Get the user's number of swipes from a given month
			collection
			.aggregate(
			[{$match: {"content.MemberID_Hash": "" + userID + "", "content.Swipe_DateTime": {$regex:"" + gymMonth + ""}}},
			{$group: {_id: null, count:{$sum: 1}}}],
			function(err,result) {
				 var error = 0;
				 if(err){
						error = 1;
                        throw err ;
                      } else if (!result[0]){ error = 2; console.log("No records found");}
                      if(result && result[0]){
						  console.log("User's number of swipes from last month: ", result[0].count);
						  //findUserRank(result[0].count);
						  var json = {"numberOfSwipes": result[0].count};
						  sendToDashboard(json);
						  //getNeighbouringValues(result[0].count);
					  }
				 // do smth in case of error 
			});
 	    }
    });
}

var json = "[";
function getMemberID_Hash(limitNumber) {
	MongoClient.connect(url, function (err, db) {
	  if (err) {
		console.log('Unable to connect to the mongoDB server. Error:', err);
		} else {
		   // Get the documents collection
		  
		  var collection = db.collection('observations');
		  //We have a cursor now with our find criteria
		  var ok = 0;
		  collection.find({}).limit(limitNumber).toArray(function(err, result) { 
				//	console.log("Fetched ", ok, result[ok].content.MemberID_Hash); ok+=1; 
				 if(err){
						error = 1;
                        throw err ;
                      } else if (!result[0]){ error = 2; console.log("No records found");}
                      if(result && result[0]){
						var i = 0;
						for (i=0; i<limitNumber; i++)
						{
							console.log("Fetched ", i, result[i].content.MemberID_Hash);
							json = json + "{ID:\"" + result[i].content.MemberID_Hash + "\"}";
							if (i+1<limitNumber)
								json = json + ",";
						}
						json = json + "]";
						console.log ("JSON: ", json);
						sendUsersID(json);
					  }
			});
		  
			
		}
	});
}

function findUserRank(user_swipes_month) {
	MongoClient.connect(url, function (err, db) {
		if (err) {
			console.log('Unable to connect to the mongoDB server. Error:', err);
		} else {

			// Get the documents collection
			var collection = db.collection('observations');
	
			collection
			.aggregate(
			[{$match: {"content.Swipe_DateTime": {$regex:"201602"}}},
			{$group: {_id: "$content.MemberID_Hash", count:{$sum: 1}}},
			{$sort: {count: 1}},
			{$match: {count: {$lte: user_swipes_month}}},
			{$group: {_id: null, count:{$sum: 1}}}],
			function(err,result) {
				 if(err){
						error = 1;
                        throw err ;
                      } else if (!result[0]){ error = 2; console.log("No records found");}
                      if(result && result[0]){ console.log("User's Rank: ", result[0].count); }
			});
		}
	});
}

function monthlyStatistics (gymMonth){
	MongoClient.connect(url, function (err, db) {
		if (err) {
			console.log('Unable to connect to the mongoDB server. Error:', err);
		} else {
			// Get the documents collection
			var collection = db.collection('observations');
			

			collection
			.aggregate(
				[{"$match": {"content.Swipe_DateTime": {"$regex":""+gymMonth+""}}},
				{"$group": {"_id": "$content.MemberID_Hash", "nrOfGymSwipes": {"$sum": 1}}},
				{"$group": {"_id": "$nrOfGymSwipes", "nrOfMembers": {"$sum": 1}}}, 
				{"$project": {"_id": 0, "nrOfGymSwipes": "$_id", "nrOfMembers": 1}},
				{"$sort": {"nrOfGymSwipes": 1}}],
			function(err,result) {
				 if(err){
						error = 1;
                        throw err ;
                      } else if (!result[0]){ error = 2; console.log("No records found");}
                      if(result && result[0]){ console.log("Statistics: ", result); }
			});
		}
	});
}

function getNeighbouringValues(user_swipes_month) {
	
	// Use connect method to connect to the Server
	MongoClient.connect(url, function (err, db) {
		if (err) {
			console.log('Unable to connect to the mongoDB server. Error:', err);
		} else {

			// Get the documents collection
			var collection = db.collection('observations');
	
			// Get First 5 users with nrSwipes < user's nrSwipes
			collection
			.aggregate(
			[{$match: {"content.Swipe_DateTime": {$regex:"201602"}}},
			{$group: {_id: "$content.MemberID_Hash", count:{$sum: 1}}},
			{$sort: {count: 1}},
			{$match: {count: {$lte: user_swipes_month}}},
			{$limit : 5 }],
			function(err,result) {
				 if(err){
						error = 1;
                        throw err ;
                      } else if (!result[0]){ error = 2; console.log("No records found");}
                      if(result && result[0]){ console.log(result); }
			});
			
			collection
			.aggregate(
			[{$match: {"content.Swipe_DateTime": {$regex:"201602"}}},
			{$group: {_id: "$content.MemberID_Hash", count:{$sum: 1}}},
			{$sort: {count: -1}},
			{$match: {count: {$gte: user_swipes_month}}},
			{$limit : 5 }],
			function(err,result) {
				 if(err){
						error = 1;
                        throw err ;
                      } else if (!result[0]){ error = 2; console.log("No records found");}
                      if(result && result[0]){ console.log(result); }
			});
		}
	});
}
  
function sendToDashboard(requestData) {
		console.log ("I am here in node: ", requestData);
		
		request({
		  uri: dashboardGetQueryJson,
		  method: "POST",
		  json: true,
		  headers: {
			"content-type": "application/json",
		  },
		  body: requestData,
		  timeout: 10000,
		  followRedirect: true,
		  maxRedirects: 10
		}, function(error, response, body) {
		  console.log(body);
		});

}

//<-----------------DATA FLOW FROM/TO DashboardWebbApp---------------------------------------->
// Saving Data
app.post('/query', function(request, response) {
    if(response.statusCode == 200) { 

      console.log("Express: TESTING......")
      console.log("Express: This is your request: ", request.body);
      console.log("\nMemberID_Hash: ", request.body.MemberID_Hash); 	 
      console.log("\Date_Key_Month: ", request.body.Date_Key_Month); 	 

	  //console.log("This is your request: ", JSON.stringify(request.body));
	  
	  mongoAnalytics(request.body.MemberID_Hash,request.body.Date_Key_Month);
	  response.send("success");
    }else{
      response.send(" Error code: " + response.statusCode);
    }
});

// Sending Users' ID for Query Data Form 





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
      //createPatient(request.body); // <-- call to openMRS
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