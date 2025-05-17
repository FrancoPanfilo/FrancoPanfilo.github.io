import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
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

        // Verificar si el dispositivo ya escaneó este QR
        const scannedQRs = JSON.parse(
          localStorage.getItem("scannedQRs") || "[]"
        );
        if (!scannedQRs.includes(qrId)) {
          // Dispositivo no ha escaneado este QR antes
          const currentCount = qrData.contador || 0;
          const newCount = currentCount + 1;

          // Actualizar el contador en Firestore
          updateDoc(qrDoc, {
            contador: newCount,
          })
            .then(() => {
              // Guardar el qrId en localStorage
              scannedQRs.push(qrId);
              localStorage.setItem("scannedQRs", JSON.stringify(scannedQRs));
            })
            .catch((error) => {
              console.error("Error actualizando el contador:", error);
            });
        }

        // Redirigir después de procesar (independientemente de si se actualizó el contador)
        setTimeout(() => {
          window.location.href = `https://${qrData.link}`;
        }, 1000);
      } else {
        console.error("El documento QR no existe");
      }
    })
    .catch((error) => {
      console.error("Error obteniendo el documento:", error);
    });
} else {
  console.error("No se encontró el ID del QR.");
}
