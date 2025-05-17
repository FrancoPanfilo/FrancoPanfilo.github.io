import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  increment,
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

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const link = "www.google.com";
let id = "";
try {
  // Crea un nuevo documento en la colección 'QRs' con los datos proporcionados
  const docRef = await addDoc(collection(db, "QRsDemo"), {
    link: link,
  });
  document.getElementById("qrcode").src = generateQRCode(docRef.id);
  id = docRef.id;
  // Retornar el ID generado para asociarlo con el QR dinámico
} catch (e) {
  console.error("Error al agregar el documento: ", e);
}
// descaragar imagen rapidamente

// Limpiar el código QR anterior

// Esperar a que se genere el código QR
function generateQRCode(url) {
  url = `www.scanyourstyle.com/Demo/?id=${url}`;
  // Aseguramos que bgcolor sea transparente y el patrón blanco
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    url
  )}&format=png&bgcolor=000000&color=ffffff`;
}
async function guardarLink(link) {
  if (id) {
    const qrDocRef = doc(db, "QRsDemo", id);
    try {
      await updateDoc(qrDocRef, { link: link });
    } catch (error) {
      console.error("Error actualizando el link: ", error);
    }
  } else {
    alert("El campo link no puede estar vacío.");
  }
}
document.getElementById("boton").addEventListener("click", () => {
  guardarLink(document.getElementById("text").value);
});
