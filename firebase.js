import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyChyfb90_MwZo-3vaDy9rV9qpESrFOfZS8",
  authDomain: "vip-store-d75d1.firebaseapp.com",
  projectId: "vip-store-d75d1",
  storageBucket: "vip-store-d75d1.firebasestorage.app",
  messagingSenderId: "87901903351",
  appId: "1:87901903351:web:d8f83e25bf511d859bb6f2",
  measurementId: "G-YLVN5CWCB5"
};

export const configured = true;

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("VIP Firebase connected:", firebaseConfig.projectId);
