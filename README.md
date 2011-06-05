# Introduction

This is intended as a platform to allow for the rapid development Instagram-fed real-time web applications. 

See my <a href="http://madebymany.com/blog/a-picture-is-worth-140-characters">blog post</a> for some background on this project.

## What does what

I find it rather easy to get lost when dealing with JavaScript on both the front- and back-ends. Throw the multi-threaded, asyncronis nature of Node.js and Socket.io, and things can get a little messy, so, here's a very basic overview of the architecture:

- subscriptions.js - Socket server
- server.js - File server
- helpers/* - Subscription channel handlers

# How can you help?

1. Front-end library
2. Geography and Location real-time handlers
3. Extend to include more static API methods (comments, likes, etc.)

# Installation

You'll need to sign up for an Instagram API developer account and create a client before you do anything, go here:

http://instagr.am/developer/manage/

## Install Node.js 

curl -O http://nodejs.org/dist/node-v0.4.8.tar.gz
tar xvf node-v0.4.8.tar.gz
./configure
sudo make && sudo make install

## Install and run Redis

curl -O http://redis.googlecode.com/files/redis-2.2.1.tar.gz
tar xvf redis-2.2.1.tar.gz
./configure
sudo make
sudo make install

cd /your-app/
./redis-server conf/redis.conf

## Install NPM (Node package manager)

curl http://npmjs.org/install.sh | sh

## Install required node libraries

cd /your-app/

sudo npm install redis
sudo npm install socket.io 
sudo npm install express
sudo npm install ejs
sudo npm install instagram-node-lib
sudo npm install geo

Add your client_id and client_secret to settings.js

./node server.js

## Subscribe to your authenticated users' feeds

All other subscriptions are handled by the app code itself, but as this is a one-off, you may as well subscribe to it now.

curl -F 'client_id=CLIENT-ID' \
     -F 'client_secret=CLIENT-SECRET' \
     -F 'object=user' \
     -F 'aspect=media' \
     -F 'verify_token=userSubscription' \
     -F 'callback_url=http://YOUR-CALLBACK/URL' \
     https://api.instagram.com/v1/subscriptions/

Navigate to http://your-server:3000/