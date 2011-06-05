var settings = require('../settings');

// Channel helpers
exports.tags = require('./tags'),
exports.geographies = require('./geographies'),
exports.locations = require('./locations'),
exports.users = require('./users');

// Instagram node library
var instagram = require('instagram-node-lib');
instagram.set('client_id', settings.CLIENT_ID);
instagram.set('client_secret', settings.CLIENT_SECRET);
instagram.set('callback_url', settings.CALLBACK_URL);
Instagram.set('redirect_uri', settings.REDIRECT_URL);
exports.instagram = instagram