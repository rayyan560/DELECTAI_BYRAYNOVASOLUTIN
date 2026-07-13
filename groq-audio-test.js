require('dotenv').config();
const fs = require('fs');

// Note: The @groq/groq-sdk API surface used here is based on the example you provided.
// If the SDK surface differs, adapt the call accordingly.
let Groq;
try {
  Groq = require('@groq/groq-sdk').Groq || require('@groq/groq-sdk');
} catch (e) {
  console.error('Missing @groq/groq-sdk. Run: npm install @groq/groq-sdk dotenv');
  process.exit(1);
}

const apiKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY || '';
if (!apiKey) {
  console.error('No GROQ_API_KEY found in environment. Add it to .env as GROQ_API_KEY=your_key');
  process.exit(1);
}

const groq = new Groq({ apiKey });

async function translateAudio(audioFilePath) {
  try {
    if (!fs.existsSync(audioFilePath)) throw new Error('Audio file not found: ' + audioFilePath);
    const audioFile = fs.createReadStream(audioFilePath);

    console.log('Uploading', audioFilePath, 'to Groq Translations API...');
    const translation = await groq.audio.translations.create({
      file: audioFile,
      model: 'whisper-large-v3',
      prompt: 'Translate this audio file accurately into English',
      temperature: 0.0
    });

    console.log('Translation result:');
    console.log(JSON.stringify(translation, null, 2));
    if (translation && (translation.text || translation.transcript)) {
      console.log('\nTranslated Text (English):', translation.text || translation.transcript);
      return translation.text || translation.transcript;
    }

    console.warn('No text field in Groq response; full object printed above.');
    return null;
  } catch (error) {
    console.error('Audio processing error:', error);
    throw error;
  }
}

// CLI: node groq-audio-test.js path/to/audio.wav
const audioPath = process.argv[2];
if (!audioPath) {
  console.error('Usage: node groq-audio-test.js <path/to/audio.file>');
  process.exit(1);
}

translateAudio(audioPath).catch(() => process.exit(1));
