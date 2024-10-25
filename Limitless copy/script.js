import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
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
async function agregarQR(nombre, link) {
  try {
    // Crea un nuevo documento en la colección 'QRs' con los datos proporcionados
    const docRef = await addDoc(collection(db, "QRs"), {
      nombre: nombre,
      link: link,
    });

    console.log("Documento agregado con ID: ", docRef.id);
    const copiarContenido = async () => {
      try {
        await navigator.clipboard.writeText(
          `www.scanyourstyle.uy?id=${docRef.id}`
        );
        alert("Link copiado en portapapeles");
      } catch (err) {
        console.error("Error al copiar: ", err);
      }
    };
    copiarContenido();
    // Retornar el ID generado para asociarlo con el QR dinámico
    return docRef.id;
  } catch (e) {
    console.error("Error al agregar el documento: ", e);
  }
}
document
  .getElementById("boton")
  .addEventListener("click", () => generateQRCode());
document
  .getElementById("boton1")
  .addEventListener("click", () => generateQRDinamicCode());
function generateQRCode() {
  const link = document.getElementById("link").value;
  const specificity = document.getElementById("specificity").value;

  if (!link) {
    alert("Por favor ingresa un enlace..");
    return;
  }

  // Limpiar el código QR anterior
  document.getElementById("qr-code").innerHTML = "";

  const qrCode = new QRCode(document.getElementById("qr-code"), {
    text: link,
    width: 1000, // Aumentar la resolución
    height: 1000, // Aumentar la resolución
    colorDark: "#000000",
    colorLight: "transparent", // Fondo transparente
    correctLevel: QRCode.CorrectLevel[specificity],
  });

  // Esperar a que se genere el código QR
  setTimeout(() => {
    const qrCanvas = document.querySelector("#qr-code canvas");
    if (qrCanvas) {
      const imgData = qrCanvas
        .toDataURL("image/png") // Mantener formato PNG
        .replace("image/png", "image/octet-stream");
      const downloadLink = document.getElementById("download-link");
      downloadLink.href = imgData;
      downloadLink.download = "qr_code.png";
      downloadLink.style.display = "block";
    }
  }, 500);
}
function generateQRDinamicCode() {
  const link = document.getElementById("link1").value;
  const name = document.getElementById("name1").value;

  if (!link) {
    alert("Por favor ingresa un enlace.");
    return;
  }

  agregarQR(name, link);

  // Limpiar el código QR anterior
  document.getElementById("qr-code").innerHTML = "";
}
// tabla

async function cargarQRs() {
  const qrCollection = collection(db, "QRs");
  const qrSnapshot = await getDocs(qrCollection);
  const qrList = qrSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const tableBody = document.querySelector("#qrTable tbody");
  tableBody.innerHTML = ""; // Limpiar la tabla antes de llenar

  qrList.forEach((qr) => {
    const row = document.createElement("tr");

    // Crear celdas para cada campo
    row.innerHTML = `
        <td>${qr.id}</td>
        <td>${qr.nombre}</td>
        <td><input type="text" value="${qr.link}" id="link-${qr.id}" /></td>
        <td><button id='save${qr.id}'>Guardar</button></td>
        <td><button id='link${qr.id}'>Link</button></td>

      `;

    tableBody.appendChild(row);
    document
      .getElementById(`save${qr.id}`)
      .addEventListener("click", () => guardarLink(qr.id));
    document
      .getElementById(`link${qr.id}`)
      .addEventListener("click", () => descargarQR(qr.id));
  });
}
function descargarQR(id) {
  const copiarContenido = async () => {
    try {
      await navigator.clipboard.writeText(
        `www.scanyourstyle.uy/QRDinamicos/?id=${id}`
      );
      alert("Link copiado en portapapeles");
    } catch (err) {
      console.error("Error al copiar: ", err);
    }
  };
  copiarContenido();
}
// Función para guardar el nuevo link en Firestore
async function guardarLink(id) {
  const newLink = document.getElementById(`link-${id}`).value;

  if (newLink) {
    const qrDocRef = doc(db, "QRs", id);
    try {
      await updateDoc(qrDocRef, { link: newLink });
      alert("Link actualizado exitosamente.");
    } catch (error) {
      console.error("Error actualizando el link: ", error);
    }
  } else {
    alert("El campo link no puede estar vacío.");
  }
}

// Cargar los QR dinámicos al cargar la página
cargarQRs();
