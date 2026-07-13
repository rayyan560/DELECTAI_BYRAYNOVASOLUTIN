const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 420;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// DUAL-MODE DATABASE MANAGER (MONGOOSE OR JSON)
// ==========================================
let isMongoMode = false;
const JSON_DB_PATH = path.join(__dirname, 'database.json');

// Mongoose Schemas (used in MongoDB Mode)
const UploadSchema = new mongoose.Schema({
  _id: String,
  userId: String,
  fileUrl: String,
  fileType: String,
  originalLanguage: String,
  detectedDialect: String,
  duration: Number,
  createdAt: { type: Date, default: Date.now }
});

const TranscriptSchema = new mongoose.Schema({
  _id: String,
  uploadId: String,
  originalText: String,
  translatedVersions: mongoose.Schema.Types.Mixed,
  generatedScript: String,
  createdAt: { type: Date, default: Date.now }
});

const SocialSchema = new mongoose.Schema({
  _id: String,
  userId: String,
  videoUrl: String,
  platform: String,
  transcript: String,
  generatedHooks: [String],
  captions: String,
  hashtags: [String],
  aiSummary: String,
  createdAt: { type: Date, default: Date.now }
});

const RequestSchema = new mongoose.Schema({
  _id: String,
  userId: String,
  requestType: String,
  input: String,
  output: String,
  processingTime: Number,
  createdAt: { type: Date, default: Date.now }
});

let UploadModel, TranscriptModel, SocialModel, RequestModel;

// Initialize file-based fallback database structure
function initJsonDatabase() {
  if (!fs.existsSync(JSON_DB_PATH)) {
    const initialStructure = {
      users: [
        {
          _id: 'u_01',
          fullName: 'Rayyan Ahmed Khan (Owner of Raynova Solution)',
          email: 'rayyan@dialect.ai',
          avatar: '/assets/rayyan_avatar.jpg',
          createdAt: new Date().toISOString()
        }
      ],
      uploads: [],
      transcripts: [],
      socialAnalysis: [],
      aiRequests: []
    };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initialStructure, null, 2));
    console.log("Initialized local JSON Database File: database.json");
  }
}

// Read from JSON Database
function readJsonDb() {
  initJsonDatabase();
  try {
    const raw = fs.readFileSync(JSON_DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database.json. Re-initializing...", err);
    fs.writeFileSync(JSON_DB_PATH, '{}');
    return { uploads: [], transcripts: [], socialAnalysis: [], aiRequests: [], users: [] };
  }
}

// Write to JSON Database
function writeJsonDb(data) {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing to database.json", err);
  }
}

// Connect to MongoDB with timeout
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dialect_intelligence';

console.log("Connecting to MongoDB database at:", MONGO_URI);
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 2500 // Fail quickly if mongo is offline
})
.then(() => {
  console.log("✓ SUCCESS: Mongoose committed. connected to local MongoDB engine.");
  isMongoMode = true;
  
  // Register Mongoose models
  UploadModel = mongoose.model('Upload', UploadSchema);
  TranscriptModel = mongoose.model('Transcript', TranscriptSchema);
  SocialModel = mongoose.model('SocialAnalysis', SocialSchema);
  RequestModel = mongoose.model('AIRequest', RequestSchema);
})
.catch((err) => {
  console.warn("⚠ WARNING: MongoDB database daemon is offline or connection refused.");
  console.log("✓ FALLBACK INITIALIZED: Running in high-fidelity JSON file storage mode (database.json).");
  initJsonDatabase();
});

// ==========================================
// REST API ENDPOINTS
// ==========================================

// 1. Get Environmental Sync Configurations (Reads OpenRouter Key securely)
app.get('/api/sync-env', (req, res) => {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const primaryMatch = content.match(/OPENROUTER_API_KEY\s*=\s*([^\r\n]+)/);
      const altMatch = content.match(/OPENROUTER_API_KEY_ALT\s*=\s*([^\r\n]+)/);
      const primaryKey = primaryMatch ? primaryMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
      const altKey = altMatch ? altMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';
      if (primaryKey || altKey) {
        return res.json({ success: true, apiKey: primaryKey, apiKeyAlt: altKey });
      }
    }
    res.json({ success: false, message: "No key found in environmental settings." });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/openrouter', async (req, res) => {
  try {
    const {
      messages,
      model,
      modelType = 'gemma',
      temperature,
      max_tokens = 1024,
      top_p = 0.9,
      frequency_penalty = 0.0,
      presence_penalty = 0.0
    } = req.body || {};

    const apiKeyCandidates = modelType === 'nemotron'
      ? [process.env.OPENROUTER_API_KEY_ALT, process.env.OPENROUTER_API_KEY]
      : [process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEY_ALT];

    const apiKeys = apiKeyCandidates.filter(Boolean);
    if (apiKeys.length === 0) {
      return res.status(400).json({ success: false, error: 'No OpenRouter API key configured on the server.' });
    }

    if (!messages || !Array.isArray(messages) || !model) {
      return res.status(400).json({ success: false, error: 'Missing OpenRouter payload parameters.' });
    }

    const resolvedTemperature = typeof temperature === 'number'
      ? temperature
      : modelType === 'nemotron'
        ? 0.12
        : 0.25;

    const makeRequest = async (apiKey) => {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Title': 'Dialect Intelligence Cinematic Console'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: resolvedTemperature,
          max_tokens,
          top_p,
          frequency_penalty,
          presence_penalty
        })
      });

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        throw { type: 'parse', response, rawText, parseErr };
      }

      return { response, data, rawText };
    };

    let lastError = null;
    for (let index = 0; index < apiKeys.length; index += 1) {
      const currentKey = apiKeys[index];
      try {
        const { response, data, rawText } = await makeRequest(currentKey);
        if (response.ok && data.choices?.[0]?.message?.content) {
          return res.json({
            success: true,
            content: data.choices[0].message.content,
            keyUsed: index === 0 ? 'primary' : 'secondary'
          });
        }

        const status = response.status || 500;
        const message = data.error?.message || data.error || 'OpenRouter request failed.';
        const retryable = [429, 502, 503, 504].includes(status);
        lastError = { status, message, details: rawText, provider: data.error?.provider_name || 'OpenRouter' };

        console.error('[OpenRouter] API error response:', lastError);
        if (!retryable || index === apiKeys.length - 1) break;
        console.warn(`[OpenRouter] Retrying request with alternate key after ${status}.`);
        continue;
      } catch (err) {
        if (err.type === 'parse') {
          console.error('[OpenRouter] Invalid JSON response:', err.rawText);
          return res.status(err.response?.status || 500).json({ success: false, error: 'OpenRouter returned invalid JSON', details: err.rawText });
        }

        lastError = {
          status: err.response?.status || 500,
          message: err.message || 'OpenRouter request failed.',
          details: err.rawText || ''
        };
        console.error('[OpenRouter] Fetch error:', lastError);
        if (index === apiKeys.length - 1) break;
      }
    }

    return res.status(lastError?.status || 500).json({
      success: false,
      error: lastError?.message || 'OpenRouter request failed.',
      details: lastError?.details || 'No response body returned from OpenRouter.'
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/openrouter-audio', async (req, res) => {
  try {
    const { fileName, fileType, fileBase64, language = '' } = req.body || {};
    const apiKeys = [process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEY_ALT].filter(Boolean);
    const apiKey = apiKeys[0] || '';

    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'No OpenRouter API key configured on the server.' });
    }
    if (!fileName || !fileType || !fileBase64) {
      return res.status(400).json({ success: false, error: 'Missing audio upload parameters.' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    const boundary = `----DialectAIFormBoundary${Date.now()}`;
    const CRLF = '\r\n';
    const parts = [];

    const appendField = (name, value) => {
      parts.push(Buffer.from(`--${boundary}${CRLF}`));
      parts.push(Buffer.from(`Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}`));
      parts.push(Buffer.from(`${value}${CRLF}`));
    };

    const appendFile = (name, fileBuffer, filename, contentType) => {
      parts.push(Buffer.from(`--${boundary}${CRLF}`));
      parts.push(Buffer.from(`Content-Disposition: form-data; name="${name}"; filename="${filename}"${CRLF}`));
      parts.push(Buffer.from(`Content-Type: ${contentType}${CRLF}${CRLF}`));
      parts.push(fileBuffer);
      parts.push(Buffer.from(CRLF));
    };

    appendFile('file', buffer, fileName, fileType);
    appendField('model', 'gpt-4o-mini-transcribe');
    if (language) {
      appendField('language', language);
    }
    parts.push(Buffer.from(`--${boundary}--${CRLF}`));

    const bodyBuffer = Buffer.concat(parts);
    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'Dialect Intelligence Audio Transcription',
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: bodyBuffer
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[OpenRouter] Invalid JSON audio response:', rawText);
      return res.status(response.status || 500).json({ success: false, error: 'OpenRouter returned invalid JSON', details: rawText });
    }

    if (!response.ok || (!data.text && !data.transcript)) {
      console.error('[OpenRouter] Audio API error response:', response.status, rawText);
      return res.status(response.status || 500).json({ success: false, error: data.error?.message || data.error || 'OpenRouter audio transcription failed.', details: rawText });
    }

    return res.json({ success: true, transcript: data.text || data.transcript });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// Proxy: Forward /api/analyze-link to FastAPI service on port 8000
app.post('/api/analyze-link', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }

    const fastApiUrl = process.env.LINK_ANALYZER_URL || 'http://127.0.0.1:8000/api/analyze-link';
    console.log(`[Proxy] Forwarding /api/analyze-link to ${fastApiUrl}`);

    const proxyRes = await fetch(fastApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const proxyData = await proxyRes.json();
    const statusCode = proxyRes.ok ? 200 : (proxyRes.status || 500);

    res.status(statusCode).json(proxyData);
  } catch (e) {
    console.error('[Proxy] Link analyzer forwarding error:', e);
    res.status(500).json({ 
      success: false, 
      message: 'Link analyzer unavailable. Ensure FastAPI service is running on port 8000.',
      error: e.message 
    });
  }
});

// 2. Database Stats Endpoint
app.get('/api/db/stats', async (req, res) => {
  try {
    if (isMongoMode) {
      const totalUploads = await UploadModel.countDocuments();
      const totalSocial = await SocialModel.countDocuments();
      const totalRequests = await RequestModel.countDocuments();
      
      const allRequests = await RequestModel.find({});
      let avgSpeed = 0;
      if (allRequests.length > 0) {
        const sum = allRequests.reduce((acc, curr) => acc + (curr.processingTime || 0), 0);
        avgSpeed = parseFloat((sum / allRequests.length).toFixed(2));
      }

      res.json({
        success: true,
        mode: 'MongoDB Atlas',
        totalLogs: totalUploads + totalSocial,
        aiRequests: totalRequests,
        avgSpeed: `${avgSpeed}s`
      });
    } else {
      const db = readJsonDb();
      const totalUploads = db.uploads.length;
      const totalSocial = db.socialAnalysis.length;
      const totalRequests = db.aiRequests.length;
      
      let avgSpeed = 0;
      if (db.aiRequests.length > 0) {
        const sum = db.aiRequests.reduce((acc, curr) => acc + (curr.processingTime || 0), 0);
        avgSpeed = parseFloat((sum / db.aiRequests.length).toFixed(2));
      }

      res.json({
        success: true,
        mode: 'Local JSON File',
        totalLogs: totalUploads + totalSocial,
        aiRequests: totalRequests,
        avgSpeed: `${avgSpeed}s`
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get All Collections Database Dump
app.get('/api/db/records', async (req, res) => {
  try {
    if (isMongoMode) {
      const uploads = await UploadModel.find({}).sort({ createdAt: -1 });
      const transcripts = await TranscriptModel.find({}).sort({ createdAt: -1 });
      const socialAnalysis = await SocialModel.find({}).sort({ createdAt: -1 });
      const aiRequests = await RequestModel.find({}).sort({ createdAt: -1 });
      
      res.json({
        success: true,
        mode: 'MongoDB Atlas',
        data: { uploads, transcripts, socialAnalysis, aiRequests }
      });
    } else {
      const db = readJsonDb();
      res.json({
        success: true,
        mode: 'Local JSON File',
        data: {
          uploads: db.uploads,
          transcripts: db.transcripts,
          socialAnalysis: db.socialAnalysis,
          aiRequests: db.aiRequests
        }
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Commit Media Upload Document
app.post('/api/db/upload', async (req, res) => {
  try {
    const uploadData = req.body;
    if (isMongoMode) {
      const doc = new UploadModel(uploadData);
      await doc.save();
    } else {
      const db = readJsonDb();
      db.uploads.push(uploadData);
      writeJsonDb(db);
    }
    res.json({ success: true, message: "Upload schema successfully committed!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Commit Transcript Document
app.post('/api/db/transcript', async (req, res) => {
  try {
    const transcriptData = req.body;
    if (isMongoMode) {
      const doc = new TranscriptModel(transcriptData);
      await doc.save();
    } else {
      const db = readJsonDb();
      db.transcripts.push(transcriptData);
      writeJsonDb(db);
    }
    res.json({ success: true, message: "Transcript schema successfully committed!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Commit Social Media Analysis Document
app.post('/api/db/social', async (req, res) => {
  try {
    const socialData = req.body;
    if (isMongoMode) {
      const doc = new SocialModel(socialData);
      await doc.save();
    } else {
      const db = readJsonDb();
      db.socialAnalysis.push(socialData);
      writeJsonDb(db);
    }
    res.json({ success: true, message: "Social Analysis committed to database." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Commit AI Transaction Request
app.post('/api/db/request', async (req, res) => {
  try {
    const requestData = req.body;
    if (isMongoMode) {
      const doc = new RequestModel(requestData);
      await doc.save();
    } else {
      const db = readJsonDb();
      db.aiRequests.push(requestData);
      writeJsonDb(db);
    }
    res.json({ success: true, message: "AI Transaction logged." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Purge Database
app.post('/api/db/purge', async (req, res) => {
  try {
    if (isMongoMode) {
      await UploadModel.deleteMany({});
      await TranscriptModel.deleteMany({});
      await SocialModel.deleteMany({});
      await RequestModel.deleteMany({});
    } else {
      const db = readJsonDb();
      db.uploads = [];
      db.transcripts = [];
      db.socialAnalysis = [];
      db.aiRequests = [];
      writeJsonDb(db);
    }
    res.json({ success: true, message: "MongoDB and fallback collections successfully purged." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Express Server listening
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`   DIALECT OS DATABASE SERVER RUNNING ON PORT ${PORT} `);
  console.log(`   Local Cockpit Directives Interface Online       `);
  console.log(`===================================================`);
});
