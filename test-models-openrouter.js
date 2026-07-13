const https = require('https');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/OPENROUTER_API_KEY\s*=\s*([^\r\n]+)/);
const apiKey = match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
if (!apiKey) {
  console.error('NO_API_KEY');
  process.exit(1);
}
const models = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-31b:free',
  'google/gemma-4-31b-alpha:free',
  'google/gemma-4-31b-mini:free',
  'google/gemma-2-9b-it:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
];
function test(model) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ model, messages: [{ role: 'user', content: 'Say hello in Urdu' }], temperature: 0.7 });
    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ model, status: res.statusCode, body });
      });
    });
    req.on('error', (err) => resolve({ model, status: 0, body: err.message }));
    req.write(data);
    req.end();
  });
}
(async () => {
  for (const model of models) {
    const result = await test(model);
    console.log('MODEL:', model);
    console.log('STATUS:', result.status);
    console.log(result.body);
    console.log('-----');
  }
})();
