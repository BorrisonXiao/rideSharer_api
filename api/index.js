const express = require('express');
const apirouter = express.Router();
const { loginRequestHandler } = require('./auth');

apirouter.get('/', function (req, res) {
  res.json({ message: 'API is accessible' });
});

apirouter.use('/users', require('./users'));
apirouter.use('/trips', require('./trips'));

apirouter.post('/login', loginRequestHandler);

module.exports = apirouter;
