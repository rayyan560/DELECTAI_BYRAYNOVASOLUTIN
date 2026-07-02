const https = require('https');

const apiKey = 'sk-or-v1-YOUR_API_KEY_HERE';

function testModel(modelName) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: 'Say hello in Urdu' }]
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'API Key Test'
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            resolve({ success: false, error: parsed.error });
          } else {
            resolve({ success: true, text: parsed.choices[0].message.content });
          }
        } catch (e) {
          resolve({ success: false, error: body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log("--- STARTING OPENROUTER KEY VALIDITY TEST ---");
  
  console.log("\n[TEST 1] Querying NVIDIA Nemotron...");
  const nemotron = await testModel("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free");
  console.log("Nemotron Status:", nemotron.success ? "✓ WORKING" : "⚠ FAILED");
  if (nemotron.success) {
    console.log("Nemotron Response:", nemotron.text.trim());
  } else {
    console.log("Nemotron Error details:", nemotron.error);
  }

  console.log("\n[TEST 2] Querying Google Gemma...");
  const gemma = await testModel("google/gemma-2-9b-it:free");
  console.log("Gemma Status:", gemma.success ? "✓ WORKING" : "⚠ FAILED");
  if (gemma.success) {
    console.log("Gemma Response:", gemma.text.trim());
  } else {
    console.log("Gemma Error details:", gemma.error);
  }
  
  console.log("\n--- TEST COMPLETE ---");
}

run();
