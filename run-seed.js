const http = require('http');

// Seed auth service
const options = {
  hostname: 'localhost',
  port: 4004,
  path: '/auth/seed',
  method: 'POST'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Auth Service Seed:', data);
  });
});

req.on('error', (error) => {
  console.error('Auth Service Seed Error:', error.message);
});

req.end();

// Seed college service
setTimeout(() => {
  const collegeOptions = {
    hostname: 'localhost',
    port: 4003,
    path: '/seed',
    method: 'POST'
  };

  const collegeReq = http.request(collegeOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('College Service Seed:', data);
    });
  });

  collegeReq.on('error', (error) => {
    console.error('College Service Seed Error:', error.message);
  });

  collegeReq.end();
}, 1000);
