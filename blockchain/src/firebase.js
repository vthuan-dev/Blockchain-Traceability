const admin = require("firebase-admin");
const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require("firebase/storage");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Thêm dòng này để sử dụng biến môi trường
const { getAuth } = require("firebase/auth");

// Thay đổi đường dẫn đến file service account mới của bạn
const serviceAccount = require("./config/nckh-60471-firebase-adminsdk-8mdwy-9be31f7d4a.json");

// Khởi tạo Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "nckh-60471.appspot.com" // Đảm bảo đây là tên bucket chính xác
});

// Lấy bucket từ Admin SDK
const adminBucket = admin.storage().bucket();

// Khởi tạo Firebase SDK thông thường
const firebaseConfig = {
  apiKey: "AIzaSyBoQ2awa55USQWa761znOQfgrMQQ6mDjCo",
  authDomain: "nckh-60471.firebaseapp.com",
  projectId: "nckh-60471",
  storageBucket: "nckh-60471.appspot.com", // Đảm bảo đây là tên bucket chính xác
  messagingSenderId: "1010939149692",
  appId: "1:1010939149692:web:65fded95a0addc68deb8f9",
  measurementId: "G-7ZDW2SJV3F"
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
