const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 420;

app.use(cors());
app.use(express.json());
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
      const keyRegex = /apiKey:\s*'([^']+)'/;
      const match = content.match(keyRegex);
      if (match && match[1]) {
        return res.json({ success: true, apiKey: match[1] });
      }
    }
    res.json({ success: false, message: "No key found in environmental settings." });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
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
