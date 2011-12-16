var path = require('path');
var url = require('url');
var sys = require('util');

var format = require('../format');

var easysgf = null;
try {
    easysgf = require('easysgf');
} catch (e) {
    // easysgf not installed; no-op
    exports.serve = function serve(req, res, next) {
        next();
    };
    return;
}

function serve(req, res, next) {
    if (req.method !== 'GET') {
        next();
        return;
    }

    var parsedUrl = url.parse(req.url, false, false);
    var extension = path.extname(parsedUrl.pathname);

    // XXX INSECURE XXX NOT DESIGNED FOR PRODUCTION
    var swfFilename = req.basePath + parsedUrl.pathname.replace(/\.(sgf|jvo)$/, '.swf');
    console.log(swfFilename);

    var options = { };
    switch (extension) {
    case '.jvo':
        options.jvo = true;
        break;

    case '.sgf':
        options.sgf = true;
        break;

    default:
        next(new Error("wtf"));
        return;
    }

    easysgf.ensureBuilt(swfFilename, options, function (err, rebuiltFiles) {
        if (err) {
            if (err.code === 'ENOENT') {
                // Let someone else handle missing files
                next();
            } else {
                next(err);
            }
            return;
        }

        rebuiltFiles.forEach(function (filename) {
            sys.puts(format.message("Rebuilt " + filename));
        });

        next();
    });
}

exports.serve = serve;
