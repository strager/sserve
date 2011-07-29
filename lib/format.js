var formatting = {
    200: '\x1B[32m',
    304: '\x1B[33m',
    403: '\x1B[1;31m',
    404: '\x1B[31m',
    headers: '\x1B[37m',
    error: '\x1B[1;31m',
    end: '\x1B[0m'
};

exports.error = function (message) {
    return formatting.error + message + formatting.end;
};

exports.headerObject = function (headerObject, linePrefix) {
    var headerText = '';

    // Not super robust
    Object.keys(headerObject).forEach(function (key) {
        headerText += key + ': ' + headerObject[key] + '\r\n';
    });

    return exports.headerText(headerText, linePrefix, { skipFirst: false });
};

exports.headerText = function (headerText, linePrefix, options) {
    // Not super robust
    var headers = headerText.split('\r\n');
    if (options && options.skipFirst) headers = headers.slice(1);
    headers = headers.filter(function (header) {
        return !!header;
    });

    var prefix = typeof linePrefix === 'undefined' ? ' - ' : linePrefix;
    var text = headers.length ? prefix + headers.join('\n' + prefix) : '';

    return formatting.headers + text + formatting.end;
};

exports.response = function (params) {
    return [
        (formatting[params.status] || ''),

        params.method + ' ' + params.url + ' ',
        '[' + params.status + ' ' + params.message + ']',

        formatting.end
    ].join('');
};
