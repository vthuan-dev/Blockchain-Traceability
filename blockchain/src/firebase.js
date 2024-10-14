const admin = require("firebase-admin");
const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require("firebase/storage");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { getAuth } = require("firebase/auth");

// Khởi tạo Firebase Admin SDK
const serviceAccount = {
  type: process.env.FIREBASE_ADMIN_TYPE,
  project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
  private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
  auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI,
  token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

// Lấy bucket từ Admin SDK
const adminBucket = admin.storage().bucket();

// Khởi tạo Firebase SDK thông thường
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);
const auth = getAuth(firebaseApp);

async function uploadFile(file) {
  const fileName = `avatars/${Date.now()}_${file.originalname}`;
  const fileUpload = adminBucket.file(fileName);

  const blobStream = fileUpload.createWriteStream({
    metadata: {
      contentType: file.mimetype
    }
  });

  return new Promise((resolve, reject) => {
    blobStream.on('error', (error) => {
      console.error('Lỗi khi upload file:', error);
      reject('Lỗi khi upload file: ' + error.message);
    });

    blobStream.on('finish', async () => {
      try {
        const publicUrl = `https://storage.googleapis.com/${adminBucket.name}/${fileUpload.name}`;
        resolve(publicUrl);
      } catch (error) {
        console.error('Lỗi khi lấy URL công khai:', error);
        reject('Lỗi khi lấy URL công khai: ' + error.message);
      }
    });

    blobStream.end(file.buffer);
  });
}

async function deleteFile(fileUrl) {
  const fileName = fileUrl.split('/').pop();
  const file = adminBucket.file(`avatars/${fileName}`);
  
  try {
    await file.delete();
    console.log(`File ${fileName} đã được xóa thành công.`);
  } catch (error) {
    console.error('Lỗi khi xóa file:', error);
    throw error;
  }
}

async function uploadFileFirebase(file) {
  const fileName = `avatars/${Date.now()}_${file.originalname}`;
  const storageRef = ref(storage, fileName);

  const snapshot = await uploadBytes(storageRef, file.buffer, {
    contentType: file.mimetype,
  });

  const url = await getDownloadURL(snapshot.ref);
  return url;
}

module.exports = { 
  uploadFile, 
  deleteFile, 
  uploadFileFirebase, 
  storage,
  auth,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  admin,
  adminBucket
};
