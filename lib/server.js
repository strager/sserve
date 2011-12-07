var static = require('node-static');
var http = require('http');
var sys = require('util');
var path = require('path');
var format = require('./format');

var easysgf = null;
try {
    easysgf = require('easysgf');
} catch (e) {
    // Ignore
}

exports.serve = function (options) {
    var host = options.host || null;
    var port = options.port || 80;
    var basePath = path.resolve(options.basePath || process.cwd());
    var callback = options.callback || function () { };
    var errback = options.error || function (err) { };
    var showIncomingHeaders = options.showIncomingHeaders || false;
    var showOutgoingHeaders = options.showOutgoingHeaders || false;

    var fileServer = new static.Server(basePath);

    function serveStatic(req, res) {
        fileServer.serve(req, res, function (err, serveRes) {
            if (err) {
                // An error as occured
                sys.error(format.response({
                    method: req.method,
                    url: req.url,
                    status: err.status,
                    message: err.message
                }));

                if (showIncomingHeaders) {
                    sys.error(format.headerObject(req.headers, ' <  '));
                }

                if (showOutgoingHeaders) {
                    sys.error(format.headerObject(err.headers, '  > '));
                }

                res.writeHead(err.status, err.headers);
                res.end();
            } else {
                // The file was served successfully
                sys.puts(format.response({
                    method: req.method,
                    url: req.url,
                    status: serveRes.status,
                    message: serveRes.message
                }));

                if (showIncomingHeaders) {
                    sys.puts(format.headerObject(req.headers, ' <  '));
                }

                if (showOutgoingHeaders) {
                    sys.puts(format.headerText(res._header, '  > ', { skipFirst: true }));
                }
            }
        });
    }

    var easysgfExtensionRe = /\.(sgf|jvo)$/;
    function file(req, res) {
        if (easysgf && easysgfExtensionRe.test(req.url)) {
            // XXX INSECURE XXX NOT DESIGNED FOR PRODUCTION
            var swfFilename = basePath + req.url.replace(easysgfExtensionRe, '.swf');

            var options = { };
            switch (easysgfExtensionRe.exec(req.url)[1]) {
            case 'jvo':
                options.jvo = true;
                break;

            case 'sgf':
                options.sgf = true;
                break;

            default:
                throw new Error("wtf");
            }

            easysgf.ensureBuilt(swfFilename, options, function (err, rebuiltFiles) {
                if (err) {
                    sys.error(format.error(err));

                    res.writeHead(500, { 'content-type': 'text-plain' });
                    res.write(err.toString());
                    res.end();
                    return;
                }

                rebuiltFiles.forEach(function (filename) {
                    sys.puts(format.message("Rebuilt " + filename));
                });

                serveStatic(req, res);
            });
        } else {
            serveStatic(req, res);
        }
    }

    try {
        http.createServer(function (req, res) {
            req.addListener('end', function () {
                file(req, res);
            });
        }).listen(port, host, function () {
            callback(host, port, basePath);
        });
    } catch (e) {
        errback(e);
        return;
    }
};
