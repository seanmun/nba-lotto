// src/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
// Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJj3KAMU1v3Sxc94cUKADMiRiXMSLngHk",
  authDomain: "draft-day-trades.firebaseapp.com",
  projectId: "draft-day-trades",
  storageBucket: "draft-day-trades.firebasestorage.app",
  messagingSenderId: "719157152951",
  appId: "1:719157152951:web:721d12b147be80ba53d132"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };