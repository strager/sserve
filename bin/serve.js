var static = require('node-static');
var http = require('http');

var port = 80;
var basePath = process.cwd();

var args = process.argv.slice(2);

port = args.pop() || port;
basePath = args.pop() || basePath;

var fileServer = new static.Server(basePath);

http.createServer(function (request, response) {
    request.addListener('end', function () {
        fileServer.serve(request, response);
    });
}).listen(port);

console.log('Serving %s on port %d', basePath, port);
