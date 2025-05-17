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
        // Obtener el contador actual o inicializarlo en 0
        const currentCount = qrData.contador || 0;
        // Incrementar el contador
        const newCount = currentCount + 1;

        // Actualizar el documento con el nuevo contador
        updateDoc(qrDoc, {
          contador: newCount,
        })
          .then(() => {
            // Redirigir después de actualizar el contador
            setTimeout(() => {
              window.location.href = `https://${qrData.link}`;
            }, 1000);
          })
          .catch((error) => {
            console.error("Error actualizando el contador:", error);
            // Redirigir incluso si falla la actualización del contador
            setTimeout(() => {
              window.location.href = `https://${qrData.link}`;
            }, 1000);
          });
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
