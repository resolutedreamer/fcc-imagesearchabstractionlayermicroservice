// server.js
// where your node app starts

// init project
var express = require('express');
const request = require('request-promise')  

//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');
var app = express();

//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;

// Connection URL. This is where your mongodb server is running.
var url = process.env.MONGOURL;

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

function checkURL (possibleURL) {
  var regex = /(https?:\/\/)?([\w\d]+\.)?[\w\d]+\.\w+\/?.+/;
  console.log(regex);
  if (possibleURL.match(regex)){
    console.log("A Match!");
    return true;
  }
  console.log("No Match");
  return false;
}

app.get("/api/imagesearch/*", function (req, res) {
  console.log("GET /api/imagesearch/*")
  var params = req.params;
  var query_param = req.query;
  console.log(params);
  console.log(query_param);
  var search_text = params[0];
  var num_results = query_param["offset"];
  console.log(search_text);
  var finalresult = [];
  // Store the search record into the database
  MongoClient.connect(url, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      console.log('Connection established to', url);
      
      // Get the documents collection
      var collection = db.collection('searches');
  
      //Create a search record
      var searchrecord = {term: search_text, when: Date()};
      
      // Insert some users
      collection.insert(searchrecord, function (err, result) {
        if (err) {
          console.log(err);
        } else {
          console.log('Inserted documents into the "searches" collection. The documents inserted with "_id" are:', result);
        }
        //Close connection
        db.close();
      });
    }
  });
  
  // Simultaneously, perform the search with Bing Image Search API
  const options = {  
    method: 'GET',
    uri: 'https://api.cognitive.microsoft.com/bing/v5.0/images/search',
    json: true,
    qs: {
      'q': search_text
    },
    headers: {
      'Ocp-Apim-Subscription-Key':"f7ccfd07651b4e488fdddcfe910525e5"
    }
  }

  request(options)
    .then(function (response) {
      // Request was successful, use the response object at will
      console.log("Bing Response")
      console.log(response["value"])
      for (var i = 0; i < num_results; i++) {
        var bing_result = response["value"][i];
        
        var image_result = {};
        image_result["url"] = bing_result["contentUrl"];
        image_result["snippet"] = bing_result["name"];
        image_result["thumbnail"] = bing_result["thumbnailUrl"];
        image_result["context"] = bing_result["hostPageUrl"];
        finalresult[i] = image_result;
      }
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
      console.log(finalresult);
      res.json(finalresult);
    })
    .catch(function (err) {
      // Something bad happened, handle the error
      console.log("Bad Response")
      console.log(err)
    })
});

app.get("/api/latest/imagesearch/", function (req, res){
  console.log("GET /api/latest/imagesearch/")
  var finalresult = [];
  
  // Use connect method to connect to the Server
  MongoClient.connect(url, function (err, db) {
    if (err) {
      console.log('Unable to connect to the mongoDB server. Error:', err);
    } else {
      //HURRAY!! We are connected. :)
      console.log('Connection established to', url);
  
      // Get the documents collection
      var collection = db.collection('searches');

      // Get the last 10 search results
      var cursor = collection.find().toArray(function (err, searchresults) {
        if (err) {
          console.log(err);
          res.json(finalresult);
        }
        else {
          console.log('Fetched:', searchresults);
          for (var i = 0; i < 10; i++) {
            finalresult[i] = {"term":searchresults[i]["term"], "when":searchresults[i]["when"]}
          }
        }
        db.close();
      });

    }
  });
});