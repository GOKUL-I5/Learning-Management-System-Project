import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, indexedDBLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCemvKMO2oBFxY1j69_ON2EVjtfZ6kM01k",
  authDomain: "lmscorelearn.firebaseapp.com",
  projectId: "lmscorelearn",
  storageBucket: "lmscorelearn.firebasestorage.app",
  messagingSenderId: "575736749645",
  appId: "1:575736749645:web:3bf259c0fedd30afdb4604",
  measurementId: "G-JCPREGTGFG"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Enforce local browser storage persistence to prevent redirect nullification due to cross-origin tracking prevention
setPersistence(auth, indexedDBLocalPersistence)
  .catch((error) => {
    console.error("Firebase persistence configuration error:", error);
  });
