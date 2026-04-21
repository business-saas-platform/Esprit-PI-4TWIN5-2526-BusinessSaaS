const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const MODELS_DIR = './Front-End/public/models/';

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
];

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log(`Created directory: ${MODELS_DIR}`);
}

let completed = 0;

files.forEach(file => {
  const dest = path.join(MODELS_DIR, file);
  const fileStream = fs.createWriteStream(dest);
  
  https.get(BASE_URL + file, res => {
    res.pipe(fileStream);
    fileStream.on('finish', () => {
      completed++;
      console.log(`✅ Downloaded ${file} (${completed}/${files.length})`);
      if (completed === files.length) {
        console.log('✅ All models downloaded successfully!');
      }
    });
  }).on('error', err => {
    console.error(`❌ Error downloading ${file}:`, err.message);
    fs.unlink(dest, () => {});
  });
});
