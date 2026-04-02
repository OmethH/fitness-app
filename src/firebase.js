import {initializeApp} from "firebase/app";
import {getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore"
import {getStorage} from "firebase/storage";
import {getMessaging, isSupported} from "firebase/messaging";

//cred
const firebaseConfig = {
  apiKey: "AIzaSyDpQuDPPQSOMKR4uBeDEldOXYImhEgpJk0",
  authDomain: "fitnessapp-acba1.firebaseapp.com",
  projectId: "fitnessapp-acba1",
  storageBucket: "fitnessapp-acba1.firebasestorage.app",
  messagingSenderId: "555724150523",
  appId: "1:555724150523:web:4c6489d9a6e39d1cd4025e",
  measurementId: "G-PBS8SY5H49"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const messaging = (async () => {
  try {
    const isSupportedBrowser = await isSupported();
    if (isSupportedBrowser) {
      return getMessaging(app);
    }
    console.log("Firebase Messaging is not supported in this browser.");
    return null;
  } catch (err) {
    console.error("Failed to initialize Firebase Messaging", err);
    return null;
  }
})();