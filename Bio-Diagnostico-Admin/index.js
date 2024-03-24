// Importa el SDK de Firebase App
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";

// Importa el SDK de Firebase Firestore
import {
  doc,
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Configuración de tu proyecto de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCuPx9ysr0pmqITB0wAAWHtdSu5Xn3phVE",
  authDomain: "viajes-40b4f.firebaseapp.com",
  projectId: "viajes-40b4f",
  storageBucket: "viajes-40b4f.appspot.com",
  messagingSenderId: "936557590711",
  appId: "1:936557590711:web:fe564b2430b47b82d43532",
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Obtiene una referencia a la base de datos Firestore
const db = getFirestore(app);

// Accede a la colección "Licencias"
const casasRef = collection(db, "Licencias");

// Función para agregar una fila a la tabla
function agregarFila(doc) {
  const fila = document.createElement("tr");

  const nombreCell = document.createElement("td");
  nombreCell.textContent = doc.Nombre;
  fila.appendChild(nombreCell);

  const apellidoCell = document.createElement("td");
  apellidoCell.textContent = doc.Justificacion;
  fila.appendChild(apellidoCell);

  const inicioCell = document.createElement("td");
  inicioCell.textContent = doc.Inicio;
  fila.appendChild(inicioCell);

  const finalCell = document.createElement("td");
  finalCell.textContent = doc.Final;
  fila.appendChild(finalCell);

  const accionesCell = document.createElement("td");
  const botonEliminar = document.createElement("button");
  botonEliminar.textContent = "X";
  botonEliminar.addEventListener("click", () => confirmarEliminar(doc.id));
  accionesCell.appendChild(botonEliminar);
  fila.appendChild(accionesCell);

  tablaBody.appendChild(fila);
}

// Función para confirmar antes de eliminar una fila
function confirmarEliminar(docId) {
  if (confirm("¿Estás seguro de que quieres eliminar esta fila?")) {
    eliminarFila(docId);
  }
}

// Función para eliminar una fila de la tabla y de la base de datos
// Función para eliminar una fila de la tabla y de la base de datos
async function eliminarFila(docId) {
  try {
    console.log(docId);
    await deleteDoc(doc(db, "Licencias", docId)); // Corrección aquí
    console.log("Documento eliminado correctamente");
  } catch (error) {
    console.error("Error al eliminar el documento: ", error);
  }
}

// Escuchar el evento submit del formulario para agregar un nuevo elemento a la tabla y a la base de datos
const formulario = document.querySelector("#formulario");
function formatearFecha(fecha) {
  const fechaObj = new Date(fecha);
  const dia = fechaObj.getDate();
  const mes = fechaObj.getMonth() + 1; // Los meses en JavaScript se cuentan desde 0, por lo que se suma 1
  const año = fechaObj.getFullYear();

  return `${dia}/${mes}/${año}`;
}
formulario.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = formulario.nombre.value;
  const justificacion = formulario.apellido.value;
  const inicio = formatearFecha(formulario.inicio.value);
  const final = formatearFecha(formulario.final.value);

  try {
    const docRef = await addDoc(casasRef, {
      Nombre: nombre,
      Justificacion: justificacion,
      Inicio: inicio,
      Final: final,
    });

    console.log("Documento agregado con ID: ", docRef.id);

    // Limpiar el formulario después de agregar el documento
    formulario.reset();
  } catch (error) {
    console.error("Error al agregar el documento: ", error);
  }
});

// Obtener todos los documentos de la colección y agregarlos a la tabla
const tablaBody = document.querySelector("#tablaDatos tbody");
getDocs(casasRef)
  .then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      agregarFila({ id: doc.id, ...doc.data() });
    });
  })
  .catch((error) => {
    console.log("Error obteniendo documentos: ", error);
  });
