import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
let qi10 = localStorage.getItem("qi10");
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  increment,
  setDoc,
  getDoc,
  arrayUnion,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
const firebaseConfig = {
  projectId: qi10,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exportar funciones y objetos necesarios
export {
  db,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  increment,
  setDoc,
  getDoc,
  doc,
  arrayUnion,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
};
