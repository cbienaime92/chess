// healthcheck.js - Script de vérification de santé pour Docker
const http = require('http');

const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3000,
    path: '/',
    method: 'GET',
    timeout: 2000
};

const request = http.request(options, (res) => {
    console.log(`HEALTHCHECK: Status ${res.statusCode}`);
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

request.on('error', (err) => {
    console.log('HEALTHCHECK: ERROR', err.message);
    process.exit(1);
});

request.on('timeout', () => {
    console.log('HEALTHCHECK: TIMEOUT');
    request.destroy();
    process.exit(1);
});

request.end();
