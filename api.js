/**
 * Main module for API server
 */
const express = require('express');
const app = express();
const morgan = require('morgan'); // A logger of HTTP requests
if (typeof jest === 'undefined') app.use(morgan('combined'));

app.use(express.json()); // Include JSON parsing middleware

app.use('/api', require('./api/index.js'));
module.exports = app;
