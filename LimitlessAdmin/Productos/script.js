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
async function agregarCliente(nombre, precio) {
  try {
    // Crea un nuevo documento en la colección 'QRs' con los datos proporcionados
    const docRef = await addDoc(collection(db, "Productos"), {
      nombre: nombre,
      precio: precio,
      ventas: 0,
    });
    cargarClientes();
    alert("Producto cargado correctamente");
    document.getElementById("link").value = "";
    document.getElementById("link1").value = "";
  } catch (err) {
    console.error("Error", err);
  }
}

// tabla

async function cargarClientes() {
  const qrCollection = collection(db, "Productos");
  const qrSnapshot = await getDocs(qrCollection);
  const qrList = qrSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  qrList.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const tableBody = document.querySelector("#qrTable tbody");
  tableBody.innerHTML = ""; // Limpiar la tabla antes de llenar

  qrList.forEach((qr) => {
    const row = document.createElement("tr");

    // Crear celdas para cada campo
    row.innerHTML = `
        <td>${qr.nombre}</td>
        <td>${qr.precio}</td>
        <td>${qr.ventas}</td>

      `;

    tableBody.appendChild(row);
  });
}
// Cargar los QR dinámicos al cargar la página
cargarClientes();
document.getElementById("boton").addEventListener("click", () => {
  const link = document.getElementById("link").value;
  const link1 = document.getElementById("link1").value;
  agregarCliente(link, link1);
});
