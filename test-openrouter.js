const https = require('https');
const data = JSON.stringify({
  model: 'google/gemma-4-31b-it:free',
  messages: [{ role: 'user', content: "How many r's are in the word 'strawberry'?" }],
  modelType: 'gemma',
  temperature: 0.7
});
const options = {
  hostname: 'localhost',
  port: 420,
  path: '/api/openrouter',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};
const req = https.request(options, res => {
  console.log('STATUS', res.statusCode);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(body));
});
req.on('error', err => console.error('REQERR', err));
req.write(data);
req.end();
