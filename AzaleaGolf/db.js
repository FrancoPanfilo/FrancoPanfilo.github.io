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
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { db } from "./AzaleaMembersCLub/firebase.js";

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
