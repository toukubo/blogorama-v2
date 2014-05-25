"use strict";

var xmlrpc = require("xmlrpc");
var Validator = require("validator");
var Url = require("url");
var Q = require("q");
var FTPClient = require("ftp");
var config = require("./config");
var FS = require("fs");
var http = require("http");
var _ = require("lodash");
var sqlite3 = require("sqlite3").verbose();
var Path = require("path");

var server = xmlrpc.createServer({
    host: config.host,
    port: process.env.port || config.port || 12000
});

server.on("weblogUpdate.ping", function(err, params, callback) {
    if(params && params.length && params.length === 2) {
        // blog title
        var title = params[0];

        // blog url; trim leading/trailing slashes from slug
        var url = Url.parse(params[1]);
        var slug = Validator.trim(url.pathname, "/");

        var filePath = Path.join(__dirname, "ghost.db");

        // download ghost.db & read post
        deleteLocalDb(filePath).then(function() {
            return downloadDatabase(filePath);
        }).then(function() {
            return openDb(filePath);
        }).then(function(db) {
            return [db, loadPost(db, slug)];
        }).spread(function(db, post) {
            return [Q.ninvoke(db, "close"), indexPost(post)];
        }).spread(function () {
            callback(null, "ok");
        }).fail(function(err) {
            console.log("An error occurred:", err);
            callback(null, "not ok - " + err);
        }).done();
    } else {
        callback(null, "not ok");
    }
});

function indexPost(post) {
    var deferred = Q.defer();
    var options = Url.parse("http://nerd-search.cloudapp.net/blog/post/" + post.id);
    _.defaults(options, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    });

    var req = http.request(options, function(res) {
        deferred.resolve(true);
    });

    req.on("error", function(err) {
        deferred.reject(err);
    });

    // write the post's json
    req.write(JSON.stringify(post));
    req.end();

    return deferred.promise;
}

function openDb(filePath) {
    var deferred = Q.defer();
    var db = new sqlite3.Database(filePath, sqlite3.OPEN_READONLY);
    db.on("open", function () {
        deferred.resolve(db);
    }).on("error", function (err) {
        deferred.reject(err);
    });

    return deferred.promise;
}

function loadPost(db, slug) {
    return Q.ninvoke(db, "get", "select * from posts where slug=$slug", {
        "$slug": slug
    });
}

function deleteLocalDb(filePath) {
    var deferred = Q.defer();
    FS.exists(filePath, function(exists) {
        if(exists) {
	    console.log("deleteing local copy of db");
            Q.nfcall(FS.unlink, filePath).done(function() {
	        deferred.resolve();
	    }, function(err) {
	        deferred.reject(err);
	    });
        } else {
	    deferred.resolve();
        }
    });

    return deferred.promise;
}

function downloadDatabase(filePath) {
    var deferred = Q.defer();
    var client = new FTPClient();

    client.on("ready", function() {
        client.get("/site/wwwroot/content/data/ghost.db", function(err, stream) {
            if(err) {
                console.log("Attempt to download ghost.db failed with: ", err);
                deferred.reject(err);
                return;
            }

            stream.once("close", function() {
                client.end();
                deferred.resolve();
            });

            console.log("Writing ghost.db to", filePath);
            stream.pipe(FS.createWriteStream(filePath));
        });
    });

    client.connect({
        host: config.ftp.host,
        user: config.ftp.user,
        password: config.ftp.password
    });

    return deferred.promise;
}

console.log("Server listening on port", process.env.port || 12000);
