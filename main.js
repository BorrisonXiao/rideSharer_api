const nconf = require('nconf');

nconf.argv().env().file({ file: 'config/test.json' });

/* Start the user REST API server */
const api = require('./api');

const port = process.env.PORT || 3000;

const server = require('http').Server(api);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
