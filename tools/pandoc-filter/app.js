"use strict";

var Q = require("q");
var Util = require("util");
var FS = require("fs");
var Filters = require("./filters.js").Filters;

// run this with pandoc like this:
//    pandoc -f html input.html -t json | node app.js | pandoc --no-wrap -f json -t markdown_strict -o output.md

function main() {
    // load up the json from stdin
    //loadJsonAsync().done(function(json) {
    readFileAsync("input.json").done(function(json) {
        var ast = JSON.parse(json);
        // apply all of our filters
        Filters.forEach(function(filter) {
            ast[1] = walk(ast[1], filter);
        });
        console.log(JSON.stringify(ast));
    });
}

function walk(content, filter) {
    if(typeof(content) !== "object") {
        return content;
    }
    if(Util.isArray(content)) {
        return content.map(function(item) {
            return walk(item, filter);
        }).filter(function(item) {
            return (item !== null);
        });
    } else {
        if(filter.nodeType === "*" || filter.nodeType === content.t) {
            // If a filter's `apply` method returns null then, it is removed
            // from the AST. If `apply` returns an object then the node is
            // replaced with what's returned from the filter. If `apply` returns
            // an array then the array is spliced in.
            var node = filter.apply(content);
            if(node) {
                // splice array if its an array
                if(Util.isArray(node)) {
                    throw new Error("Not implemented yet.");
                } else {
                    content.t = node.t;
                    content.c = node.c;
                }
            } else {
                return null;
            }
        }

        if(content.c) {
            return {
                t: content.t,
                c: walk(content.c, filter)
            };
        }
    }

    // I don't think we should ever get here.
    return content;
}

function readFileAsync(fileName) {
    return Q.nfcall(FS.readFile, fileName);
}

function loadJsonAsync() {
    var deferred = Q.defer();
    var json = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("readable", function() {
        var chunk = process.stdin.read();
        if(chunk !== null) {
            json += chunk;
        }
    });
    process.stdin.on("end", function() {
        deferred.resolve(json);
    });

    return deferred.promise;
}

function printNodesCount(ast) {
    var types = {};
    walk(ast, {
        nodeType: "*",
        apply: function(content) {
            types[content.t] = (types[content.t]) ? types[content.t] + 1 : 1;
            return content;
        }
    });
    console.dir(types);
}

// kick things off!
main();
