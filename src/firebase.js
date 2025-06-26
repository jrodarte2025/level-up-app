// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB3iCL2C6654eo6mrLboG45f0H_aiFvWsw",
  authDomain: "level-up-app-c9f47.firebaseapp.com",
  projectId: "level-up-app-c9f47",
  storageBucket: "level-up-app-c9f47.firebasestorage.app",
  messagingSenderId: "256858356257",
  appId: "1:256858356257:web:e849c127252e552b58c160"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

export const messaging = getMessaging(app);

onMessage(messaging, (payload) => {
  console.log("Message received. ", payload);
});

// Export Firebase utilities in alphabetical order
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

export { getToken };