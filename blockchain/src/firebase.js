const admin = require("firebase-admin");
const { getStorage } = require("firebase-admin/storage");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') }); // Thêm dòng này để sử dụng biến môi trường

const serviceAccount = require("./config/nckh-d946f-firebase-adminsdk-lcxc4-6736053840.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const storage = getStorage().bucket();

async function uploadFile(file) {
  const fileName = `avatars/${Date.now()}_${file.originalname}`;
  const fileUpload = storage.file(fileName);

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
      const publicUrl = `https://storage.googleapis.com/${storage.name}/${fileUpload.name}`;
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
}

async function deleteFile(fileUrl) {
  const fileName = fileUrl.split('/').pop();
  const file = storage.file(`avatars/${fileName}`);
  
  try {
    await file.delete();
    console.log(`File ${fileName} đã được xóa thành công.`);
  } catch (error) {
    console.error('Lỗi khi xóa file:', error);
    throw error;
  }
}

module.exports = { uploadFile, deleteFile };
