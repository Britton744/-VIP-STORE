// ضع بيانات مشروع Firebase الخاص بك هنا من Firebase Console
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "ضع_API_KEY_هنا",
  authDomain: "ضع_AUTH_DOMAIN_هنا",
  projectId: "ضع_PROJECT_ID_هنا",
  storageBucket: "ضع_STORAGE_BUCKET_هنا",
  messagingSenderId: "ضع_MESSAGING_SENDER_ID_هنا",
  appId: "ضع_APP_ID_هنا"
};

export const configured = !Object.values(firebaseConfig).some(v => String(v).includes("ضع_"));
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
