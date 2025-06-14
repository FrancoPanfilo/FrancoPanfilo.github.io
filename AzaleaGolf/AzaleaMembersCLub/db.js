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
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { db } from "./firebase.js";

let qi10 = localStorage.getItem("qi10");

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
};
