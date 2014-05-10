"use strict";

var Util = require("util");

// The list of filters that will applied to all nodes in the AST.
// If a filter's `apply` method returns null then, it is removed
// from the AST. If `apply` returns an object then the node is
// replaced with what's returned from the filter. If `apply` returns
// an array then the array is spliced in.
//
// `nodeType` specifies what nodes the filter is interested in looking
// at. If it is equal to '*' then the filter wants to look at all nodes.
var Filters = [
    {
        name: "Remove blockquote on code blocks",
        nodeType: "BlockQuote",
        apply: function(content) {
            // see if content is another array who's first element
            // is a "CodeBlock" content
            if(Util.isArray(content.c) &&
               content.c.length === 1 &&
               typeof(content.c[0]) === "object" &&
               content.c[0]["t"] &&
               content.c[0].t === "CodeBlock") {
                return content.c[0];
            }

            return content;
        }
    },
    {
        name: "Remove empty bold/strong tags",
        nodeType: "Strong",
        apply: function(content) {
            // if content's c array is empty then remove the
            // node
            if(content &&
               content["c"] &&
               Util.isArray(content.c) &&
               content.c.length === 0 ) {
                   return null;
            }

            return content;
        }
    }
];

exports.Filters = Filters;
