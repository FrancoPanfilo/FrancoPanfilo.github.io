import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  increment,
  doc,
  addDoc,
  arrayUnion,
  getDoc,
  query,
  where,
  deleteDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let qi10 = localStorage.getItem("qi35");

let d = document.getElementById("acceso");
console.log(d);
d.addEventListener("click", function iSSS() {
  console.log("object");
  let i = prompt("Ingrese la contraseña");
  localStorage.setItem("qi35", i);
  location.reload();
});

// Configuración de Firebase
const firebaseConfig = {
  projectId: qi10,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export {
  db,
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  increment,
  doc,
  addDoc,
  arrayUnion,
  getDoc,
  query,
  where,
  deleteDoc,
  setDoc,
};
