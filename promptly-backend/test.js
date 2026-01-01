const http = require('http');
const data = JSON.stringify({prompt: 'write hello world', tone: 'professional'});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/improve-prompt',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(body));
});

req.write(data);
req.end();
