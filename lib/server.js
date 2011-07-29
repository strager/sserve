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
                        sys.error(format.error('Error serving ' + req.url + ': ' + err.message));
                        res.writeHead(err.status, err.headers);
                        res.end();
                    } else {
                        // The file was served successfully
                        sys.puts(format.response(req, serveRes));
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
