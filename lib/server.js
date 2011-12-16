var fs = require('fs');
var http = require('http');
var sys = require('util');
var path = require('path');
var url = require('url');

var Q = require('q');
var static = require('node-static');
var Mu = require('mu');

var format = require('./format');

// Add custom content-types to server
// Hacky, but node-static doesn't provide an API
var staticMime = require('node-static/lib/node-static/mime');
staticMime.contentTypes['ogg'] = 'application/ogg';
staticMime.contentTypes['sgf'] = 'application/x-sgf';

function getExtensions(extensionsPath, handlers) {
    var defer = Q.defer();

    fs.readdir(extensionsPath, function (err, files) {
        if (err) {
            defer.reject(err);
            return;
        }

        var extensionPromises = { };
        files.forEach(function (filename) {
            if (/^\./.test(filename)) {
                // Ignore dot files
                return filename;
            }

            var ext = path.extname(filename);
            var fullFilename = path.join(extensionsPath, filename);
            extensionPromises['.' + path.basename(filename, ext)] = handlers[ext](fullFilename);
        });

        defer.resolve(extensionPromises);
    });

    return defer.promise;
}

var handlers = {
    '.js': function _js(filename) {
        return require(filename);
    },
    '.mu': function _mu(filename) {
        var defer = Q.defer();

        Mu.compile(filename, function (err, parsedTemplate) {
            if (err) {
                defer.reject(err);
                return;
            }

            defer.resolve({
                serve: function serve(req, res, next) {
                    if (req.method !== 'GET') {
                        next();
                        return;
                    }

                    // TODO Better content-type
                    res.writeHead(200, { 'content-type': 'text/html' });

                    var parsedUrl = url.parse(req.url, false, false);
                    var extension = path.extname(parsedUrl.pathname);
                    var basename = path.basename(parsedUrl.pathname, extension);
                    var filename = path.basename(parsedUrl.pathname);
                    var dirname = path.dirname(parsedUrl.pathname);

                    var t = Mu.render(parsedTemplate, {
                        extension: extension,
                        basename: basename,
                        dirname: dirname
                    });

                    t.addListener('data', function (data) {
                        res.write(data);
                    });
                    t.addListener('end', function () {
                        res.end();

                        sys.puts(format.response({
                            method: req.method,
                            url: req.url,
                            status: 200,
                            message: 'OK'
                        }));
                    });
                }
            });
        });

        return defer.promise;
    }
};

var extensions = getExtensions(path.join(__dirname, 'ext'), handlers);

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

    function file(req, res) {
        req.basePath = basePath;

        var parsedUrl = url.parse(req.url, false, false);
        var ext = path.extname(parsedUrl.pathname);

        function theNext(err) {
            if (err) {
                sys.error(format.error(err));

                res.writeHead(500, { 'content-type': 'text/plain' });
                res.write(err.toString());
                res.end();
                return;
            }

            serveStatic(req, res);
        }

        Q.when(extensions, function (extensions) {
            if (Object.prototype.hasOwnProperty.call(extensions, ext)) {
                Q.when(extensions[ext], function (extension) {
                    extension.serve(req, res, theNext);
                }).fail(theNext);
            } else {
                theNext();
            }
        }).fail(theNext);
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
