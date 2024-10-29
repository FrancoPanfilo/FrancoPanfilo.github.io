// Importa Firebase y Firebase Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBZskI-w8lTQ5eF7b24d9Mae27Jjc6nenU",
  authDomain: "limitless-259e1.firebaseapp.com",
  projectId: "limitless-259e1",
  storageBucket: "limitless-259e1.appspot.com",
  messagingSenderId: "780450660358",
  appId: "1:780450660358:web:9f6fd50c7770b5b9e34387",
  measurementId: "G-N6EVVE075H",
};

// Inicializa Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Obtener el ID del QR desde la URL
// Obtener el ID del QR desde la URL usando parámetros de consulta
const urlParams = new URLSearchParams(window.location.search);
const qrId = urlParams.get("id");
document.addEventListener("DOMContentLoaded", () => {
  const logoContainer = document.querySelector(".logo-container");
  document.querySelectorAll(".Ele1, .Ele2").forEach((element) => {
    element.classList.add("hidden");
  });
  // Iniciar la transición después de un breve retraso
  setTimeout(() => {
    logoContainer.classList.add("hide");
  }, 1000);
});

if (qrId) {
  // Busca el documento en Firebase Firestore
  const qrDoc = doc(db, "QRs", qrId);
  getDoc(qrDoc)
    .then((docSnap) => {
      if (docSnap.exists()) {
        const qrData = docSnap.data();
        window.location.href = `https://${qrData.link}`; // Redirige al link asociado al QR
      } else {
      }
    })
    .catch((error) => {
      console.error("Error obteniendo el documento:", error);
    });
} else {
  //alert("No se encontró el ID del QR.");
}
