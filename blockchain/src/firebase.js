const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const { getAuth, signInAnonymously } = require("firebase/auth");

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD7HbIpcDVFoAHZ4TwmFRDVksz6SJaupL4",
  authDomain: "nckh-d946f.firebaseapp.com",
  projectId: "nckh-d946f",
  storageBucket: "nckh-d946f.appspot.com",
  messagingSenderId: "87511226036",
  appId: "1:87511226036:web:5573fccb7d6188d3ece9e1",
  measurementId: "G-5L9MTF0CXK"
};

// Initialize Firebase
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

module.exports = { storage, ref, uploadBytes, getDownloadURL, authenticateAnonymously };