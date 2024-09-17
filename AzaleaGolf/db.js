let qi10 = localStorage.getItem("qi10");
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getFirestore,
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
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
// Configuración de Firebase
const firebaseConfig = {
  projectId: qi10,
};
const app = initializeApp(firebaseConfig);

// Obtener Firestore
const db = getFirestore(app);
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
};
