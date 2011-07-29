var formatting = {
    200: '\x1B[32m',
    304: '\x1B[33m',
    headers: '\x1B[37m',
    error: '\x1B[1;31m',
    end: '\x1B[0m'
};

exports.error = function (message) {
    return formatting.error + message + formatting.end;
};

exports.headerText = function (headerText, linePrefix) {
    var headers = headerText.split('\r\n').slice(1).filter(function (header) {
        return !!header;
    });

    var prefix = typeof linePrefix === 'undefined' ? ' - ' : linePrefix;
    return formatting.headers + prefix + headers.join('\n' + prefix) + formatting.end;
};

exports.response = function (req, res) {
    return [
        (formatting[res.status] || ''),

        req.method + ' ' + req.url + ' ',
        '[' + res.status + ' ' + res.message + ']',

        formatting.end
    ].join('');
};
