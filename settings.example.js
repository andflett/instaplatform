// Globals
exports.appPort = 3000;
exports.CLIENT_ID = 'YOUR-CLIENT-ID';
exports.CLIENT_SECRET = 'YOUR-CLIENT-SECRET';
exports.CALLBACK_URL = 'YOUR-SUBSCRIPTION-CALLBACK_URL';
exports.REDIRECT_URL = 'YOUR-REDIRECT-URL-FOR-AUTHENTICATION';
exports.REDIS_PORT = 6486;
exports.REDIS_HOST = '127.0.0.1';

// Setup the express file server
var express = require('express');
var app = express.createServer();
app.set('view engine', 'ejs');
exports.app = app;

app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(app.router);
    app.use(express.static(__dirname + '/public/'));
});

app.configure('development', function(){
    app.use(express.logger());
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});