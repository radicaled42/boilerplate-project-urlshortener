require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

const dns = require("dns");
const url = require("url");
// const mongo = require("mongodb");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// URL Shortener Microservice

// Connect to Mongo
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Set the Schema
let urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: Number,
});

// set the URL Model
let urlModel = mongoose.model("URL", urlSchema);

app.post("/api/shorturl", (req, response) => {
  const inputUrl = req.body.url;
  // console.log(inputUrl);

  const furl = url.parse(inputUrl);
  // console.log(url.parse(inputUrl));
  // console.log(furl.hostname);

  dns.lookup(furl.hostname, (err, add, fam) => {
    //dns check
    if (err) {
      return response.json({ error: "invalid url" });
    } else if (furl.protocol == null || furl.host == null) {
      //if host and protocol not defined
      return response.json({
        error: "invalid url",
      });
    } else {
      // Check if the url I'm trying to get exist if not add it to the DB
      urlModel
        .findOne({ original: inputUrl })
        .sort({ short: "desc" })
        .exec((err, result) => {
          if (err) return console.log(err);
          // If the object doesn't exist find the next available short and create a new object
          else if (result === null) {
            // Find the next available short
            urlModel
              .findOne({})
              .sort({ short: "desc" })
              .exec((err, resultNew) => {
                if (!err && resultNew != undefined) {
                  // console.log(
                  //   "There is no result add it to the DB with short " +
                  //     (resultNew.short + 1)
                  // );

                  // Create the new object
                  const newUrl = new urlModel({
                    original: inputUrl,
                    short: resultNew.short + 1,
                  });

                  // Save it in the DB
                  newUrl.save(function (err, newUrlData) {
                    // Post the new Object
                    if (err) return console.error(err);
                    // console.log(newUrlData);
                    response.json({
                      original_url: newUrl.original,
                      short_url: newUrl.short,
                    });
                  });
                }
              });
          } else {
            // If exist return the object
            // console.log("Return the JSON object");
            // console.log(result);
            response.json({ original_url: inputUrl, short_url: result.short });
          }
        });
    }
  });
});

app.get("/api/shorturl/:input", (request, response) => {
  let input = request.params.input;

  urlModel.findOne({ short: input }, (error, result) => {
    if (!error && result != undefined) {
      response.redirect(result.original);
    } else {
      response.json("invalid url");
    }
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
