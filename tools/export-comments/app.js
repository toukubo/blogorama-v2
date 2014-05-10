"use strict";

var csv = require("csv");
var Q = require("q");
var FS = require("fs");
var sqlite3 = require("sqlite3").verbose();
var _ = require("lodash");
var xml = require("xml");

function main() {
    var comments;
    loadComments().then(function(entries) {
        comments = entries;
        return openDb();
    }).then(function(db) {
        return Q.nfcall(db.all.bind(db), "select * from posts");
    }).then(function (posts) {
        // accumulate comments for each post
        _.forEach(comments, function(comment) {
            var post = findPost(posts, comment.entry_url);
            post.comments = (post.comments) ? post.comments : [];
            post.comments.push(comment);
        });

        var root = {
            rss: [
                {
                    _attr: {
                        "version": "2.0",
                        "xmlns:content": "http://purl.org/rss/1.0/modules/content/",
                        "xmlns:dsq": "http://www.disqus.com/",
                        "xmlns:dc": "http://purl.org/dc/elements/1.1/",
                        "xmlns:wp": "http://wordpress.org/export/1.0/"
                    }
                },
                {
                    channel: [
                        {
                            item: [
                                {
                                    title: "Foo"
                                },
                                {
                                    link: "foo.com"
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        console.log(xml(root, {
            declaration: true,
            indent: true
        }));
    });
}

function findPost(posts, slug) {
    slug = slug.toLowerCase();
    return _.find(posts, function(p) {
        return p.slug === slug;
    })
}

function openDb() {
    var deferred = Q.defer();
    var db = new sqlite3.Database(__dirname + "/ghost.db", sqlite3.OPEN_READONLY);
    db.on("open", function () {
       deferred.resolve(db);
    }).on("error", function (err) {
       deferred.reject(err);
    });

    return deferred.promise;
}

function loadComments() {
    var deferred = Q.defer();
    var entries = [];
    csv().
        from.stream(FS.createReadStream(__dirname + '/comments.csv')).
        on("record", function (row, index) {
            entries.push({
                "entry_id": row[0],
                "comment_id": row[1],
                "comment_author_name": row[2],
                "comment_author_email": row[3],
                "comment_text": row[4],
                "comment_date": row[5],
                "entry_url": row[6]
            });
        }).
        on("end", function (count) {
           deferred.resolve(entries);
        });

    return deferred.promise;
}

// get things rolling!
main();
