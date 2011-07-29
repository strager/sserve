var static = require('node-static');
var http = require('http');
var sys = require('sys');
var path = require('path');
var format = require('./format');

exports.serve = function (options) {
    var host = options.host || null;
    var port = options.port || 80;
    var basePath = path.resolve(options.basePath || process.cwd());
    var callback = options.callback || function () { };
    var errback = options.error || function (err) { };

    var fileServer = new static.Server(basePath);

    try {
        http.createServer(function (req, res) {
            req.addListener('end', function () {
                fileServer.serve(req, res, function (err, serveRes) {
                    if (err) {
                        // An error as occured
                        sys.error(format.response({
                            method: req.method,
                            url: req.url,
                            status: err.status,
                            message: err.message
                        }));
                        sys.error(format.headerObject(err.headers));

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
                        sys.puts(format.headerText(res._header));
                    }
                });
            });
        }).listen(port, host, function () {
            callback(host, port, basePath);
        });
    } catch (e) {
        errback(e);
        return;
    }
};
