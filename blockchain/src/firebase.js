const admin = require("firebase-admin");
const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require("firebase/storage");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Thêm dòng này để sử dụng biến môi trường
const { getAuth } = require("firebase/auth");

const serviceAccount = require("./config/nckh-d946f-firebase-adminsdk-lcxc4-6736053840.json");

// Khởi tạo Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "nckh-d946f.appspot.com" // Sử dụng tên bucket mặc định của dự án
});

// Lấy bucket từ Admin SDK
const adminBucket = admin.storage().bucket();

// Khởi tạo Firebase SDK thông thường
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: "nckh-d946f.appspot.com", // Sử dụng tên bucket mặc định của dự án
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
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
      reject('Lỗi khi upload file: ' + error);
    });

    blobStream.on('finish', async () => {
      const publicUrl = `https://storage.googleapis.com/${adminBucket.name}/${fileUpload.name}`;
      resolve(publicUrl);
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
