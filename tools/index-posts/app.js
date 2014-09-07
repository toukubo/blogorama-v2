var util = require("util");
var sqlite3 = require("sqlite3");
var async = require("async");
var request = require("request");
var fs = require("fs");
var FtpClient = require("ftp");
var _ = require("lodash");
var colors = require('colors');

function main() {
  // load config file
  if(!fs.existsSync("./config.json")) {
    console.log("config.json was not found. aborting...".error);
    return;
  }

  var config = require("./config.json");

  async.waterfall([
    _.bind(downloadDb, null, config),
    loadPosts,
    _.bind(indexPosts, null, config)
  ], function(err, results) {
    if(err) {
      return console.log(("ERROR " + JSON.stringify(err)).error);
    }
    console.log("All indexing complete.".info);
  });
}

function downloadDb(config, cb) {
  console.log("Downloading ghost.db".info);

  var client = new FtpClient();
  var localFileName = "./ghost.db";
  client.on("ready", function() {
    client.get(config.ftp.filePath, function(err, stream) {
      if(err) {
        return cb(err);
      }

      stream.once("close", function() { client.end(); cb(null, localFileName); });
      stream.pipe(fs.createWriteStream(localFileName, { flags: "w" }));
    });
  });

  client.connect({
    host: config.ftp.host,
    user: config.ftp.userName,
    password: config.ftp.password
  });
}

function loadPosts(file, cb) {
  console.log("Loading posts from ghost.db".info);

  var db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, function(err) {
    if(err) {
      cb(err);
      return;
    }

    db.all("select id, title, slug, markdown, html from posts", function(err, rows) {
      cb(err, rows);
    });
  })
}

function indexPosts(config, posts, cb) {
  async.eachSeries(posts, function(post, callback) {
    process.stdout.write("Indexing post: ".info + post.title.data);

    request({
      uri: config.searchUrl + post.id.toString(),
      method: "PUT",
      json: post
    }, function(err, res, body) {
      process.stdout.write((err) ? " not ok".red : " ok".green + "\n");
      callback(err, {res: res, body: body});
    });
  }, function(err, results) {
    if(cb) {
      cb(err, results);
    }
  });
}

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

main();
