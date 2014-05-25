"use strict";

var loginUrl, userName, password, slug;

function main () {
	var args = require("system").args;
	if(args.length !== 5) {
		console.log("Usage: phantomjs", args[0], "<loginUrl> <userName> <password> <slug>");
		phantom.exit();
		return;
	}

	loginUrl = args[1];
	userName = args[2];
	password = args[3];
	slug = args[4];

	var page = require("webpage").create();
	login(page, partialBind(getPost, null, phantom.exit));
}

function getPost(next, page, status) {
	if(status !== "success") {
		next(status);
		return;
	}

	page.evaluate(function(slug) {
		window.__postResult = null;
		$.getJSON("/ghost/api/v0.1/posts/from-slug/" + slug + "/").then(function(postData) {
			window.__postResult = postData;
		});
	}, slug);

	waitFor(function() {
		return page.evaluate(function() {
			return window.__postResult;
		});
	}, function () {
		var post = page.evaluate(function () {
			return window.__postResult;
		});
		console.log(JSON.stringify(post));
		next(status);
	}, 10000);
}

function login(page, next) {
	page.open(loginUrl, function(status) {
		if(status !== "success") {
			console.log("Open", loginUrl, " failed.");
			next(page, status);
			return;
		}

		page.onLoadFinished = function(status) {
			page.onLoadFinished = null;
			next(page, status);
		};

		page.evaluate(function(credentials) {
			$(".email").val(credentials.userName);
			$(".password").val(credentials.password)
			$(".button-save").click();
		}, {
			userName: userName,
			password: password
		});
	});
}

// Taken from: http://blogorama.nerdworks.in/partialfunctionapplicationinja/
function partialBind(f, context) {
    // arguments length MUST be greater than 2
    if(arguments.length <= 2) {
        // coz. what're you "partial binding" otherwise?!
        return null;
    }

    // convert args to array excluding param "f" and "context"
    var arrayProto = Array.prototype;
    var params = arrayProto.slice.call(arguments, 2, arguments.length);
    return function () {
        // append params passed to this function to "params"
        var args = params.slice(0, params.length);
        if (arguments.length > 0) {
            arrayProto.forEach.call(arguments, function (p) {
                args.push(p);
            });
        }

        // call the original function
        return f.apply(context, args);
    }
}

/**
 * Taken from here: https://github.com/ariya/phantomjs/blob/master/examples/waitfor.js
 *
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @param testFx javascript condition that evaluates to a boolean,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param onReady what to do when testFx condition is fulfilled,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param timeOutMillis the max amount of time to wait. If not specified, 3 sec is used.
 */
function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000, //< Default Max Timout is 3s
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(function() {
            if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
            } else {
                if(!condition) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 250); //< repeat check every 250ms
};

main();
