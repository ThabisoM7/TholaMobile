const https = require('https');

const data = JSON.stringify({
  full_name: 'John Doe',
  email: 'johndoe123@test.com',
  password: 'password123',
  role: 'CUSTOMER'
});

const options = {
  hostname: 'tholamobile.up.railway.app',
  port: 443,
  path: '/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let body = '';
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log(body);
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(data);
req.end();
