"use strict";

var xmlrpc = require("xmlrpc");
var Validator = require("validator");
var Url = require("url");
var Q = require("q");
var config = require("./config");
var exec = require("child_process").exec;
var sprintf = require("sprintf").sprintf;

var server = xmlrpc.createServer({
    host: config.host || "localhost",
    port: process.env.port || config.port || 12000
});

server.on("weblogUpdate.ping", function(err, params, callback) {
    if(params && params.length && params.length === 2) {
        // blog title
        var title = params[0];

        // blog url; trim leading/trailing slashes from slug
        var url = Url.parse(params[1]);
        var slug = Validator.trim(url.pathname, "/");

        // get post data
        getPost(slug).then(function(post) {
            return indexPost(post);
        }).then(function() {
            callback(null, "ok");
        }).fail(function(err) {
            callback(null, "not ok - " + JSON.stringify(err));
        });

    } else {
        callback(null, "not ok");
    }
});

function getPost(slug) {
    var deferred = Q.defer();
    exec(sprintf("%s %s %s %s %s",
            config.postOptions.command,
            config.postOptions.url,
            config.postOptions.userName,
            config.postOptions.password,
            slug), function(err, stdout, stderr) {
        if(err) {
            deferred.reject(err);
            return;
        }

        deferred.resolve(JSON.parse(stdout));
    });

    return deferred.promise;
}

function indexPost(post) {
    var deferred = Q.defer();
    var options = Url.parse(config.searchUrl + post.id);
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

console.log("Server listening on port", process.env.port || 12000);
