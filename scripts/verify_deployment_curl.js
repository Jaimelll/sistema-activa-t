
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 8081,
    path: '/',
    method: 'GET',
    timeout: 2000
};

console.log('Checking http://localhost:8081 ...');

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    process.exit(0);
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    process.exit(1);
});

req.end();
