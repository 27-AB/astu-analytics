const http = require('http');

// Seed college service
const options = {
  hostname: 'localhost',
  port: 4003,
  path: '/seed',
  method: 'POST'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('College Service Seed:', data);
  });
});

req.on('error', (error) => {
  console.error('College Service Seed Error:', error.message);
});

req.end();
