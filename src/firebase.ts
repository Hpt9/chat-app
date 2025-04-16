// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA1BY_UFHIJZbSAAtdGy_ra34V_MoS1E58",
  authDomain: "chat-app-4041d.firebaseapp.com",
  projectId: "chat-app-4041d",
  storageBucket: "chat-app-4041d.firebasestorage.app",
  messagingSenderId: "710766079625",
  appId: "1:710766079625:web:2a01f478b551f76e242058",
  measurementId: "G-2CE6FJ4JKQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn('Firebase persistence failed to enable. Multiple tabs may be open.');
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.warn('Firebase persistence not supported in this browser.');
    }
  });
