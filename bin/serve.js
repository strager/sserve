var static = require('node-static');
var http = require('http');
var sys = require('sys');

var port = 80;
var basePath = process.cwd();

var args = process.argv.slice(2);

port = args.pop() || port;
basePath = args.pop() || basePath;

var fileServer = new static.Server(basePath);

http.createServer(function (req, res) {
    req.addListener('end', function () {
        fileServer.serve(req, res, function (err, serveRes) {
            if (err) {
                // An error as occured
                sys.error('Error serving ' + req.url + ': ' + err.message);
                res.writeHead(err.status, err.headers);
                res.end();
            } else {
                // The file was served successfully
                var prefix = ' - ';
                var headers = res._header.split('\r\n').slice(1).filter(function (header) {
                    return !!header;
                });

                sys.puts(req.method + ' ' + req.url + ' [' + serveRes.status + ' ' + serveRes.message + ']');
                sys.puts(prefix + headers.join('\n' + prefix));
            }
        });
    });
}).listen(port);

console.log('Serving %s on port %d', basePath, port);
