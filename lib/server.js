var static = require('node-static');
var http = require('http');
var sys = require('sys');

exports.serve = function (options) {
    var host = options.host || null;
    var port = options.port || 80;
    var basePath = options.basePath || process.cwd();
    var callback = options.callback || function () { };
    var errback = options.error || function (err) { };

    var fileServer = new static.Server(basePath);

    var formatting = {
        200: '\x1B[32m',
        304: '\x1B[33m',
        error: '\x1B[1;31m',
        end: '\x1B[0m'
    };

    try {
        http.createServer(function (req, res) {
            req.addListener('end', function () {
                fileServer.serve(req, res, function (err, serveRes) {
                    if (err) {
                        // An error as occured
                        sys.error(formatting.error + 'Error serving ' + req.url + ': ' + err.message + formatting.end);
                        res.writeHead(err.status, err.headers);
                        res.end();
                    } else {
                        // The file was served successfully
                        var prefix = ' - ';
                        var headers = res._header.split('\r\n').slice(1).filter(function (header) {
                            return !!header;
                        });

                        sys.puts((formatting[serveRes.status] || '') + req.method + ' ' + req.url + ' [' + serveRes.status + ' ' + serveRes.message + ']' + formatting.end);
                        sys.puts(prefix + headers.join('\n' + prefix));
                    }
                });
            });
        }).listen(port, host, callback);
    } catch (e) {
        errback(e);
        return;
    }
};
