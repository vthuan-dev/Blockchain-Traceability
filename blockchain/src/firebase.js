const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const { getAuth, signInAnonymously } = require("firebase/auth");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Thêm dòng này để sử dụng biến môi trường

// var admin = require("firebase-admin");

// var serviceAccount = require("path/to/serviceAccountKey.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// Sử dụng biến môi trường để cấu hình Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);

async function authenticateAnonymously() {
  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error("Lỗi xác thực:", error);
  }
}

module.exports = { auth, storage, ref, uploadBytes, getDownloadURL, authenticateAnonymously };
