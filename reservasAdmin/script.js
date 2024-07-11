// Import the functions you need from the SDKs you need
import {
  doc,
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCaoKajIMiN3Y8AtPz5X2brHm0YOsFqiuo",
  authDomain: "azalea-92a39.firebaseapp.com",
  projectId: "azalea-92a39",
  storageBucket: "azalea-92a39.appspot.com",
  messagingSenderId: "564234531814",
  appId: "1:564234531814:web:ba8f9c434cd576b01e5c27",
  measurementId: "G-MX1L41XYVE",
};
// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const reservasRef = collection(db, "Posibles reservas");
const reservasConfirmadasRef = collection(db, "Reservas"); // Referencia a la colección de reservas confirmadas

function confirmarReserva(reservaId) {
  // Obtener el documento de la colección 'Posibles reservas' por ID
  doc(reservasRef, reservaId)
    .get()
    .then((doc) => {
      if (doc.exists) {
        const reservaData = doc.data();

        // Agregar la reserva a la colección 'Reservas'
        addDoc(reservasConfirmadasRef, reservaData)
          .then(() => {
            // Eliminar la reserva de la colección 'Posibles reservas'
            deleteDoc(doc.ref)
              .then(() => {
                console.log(
                  "Reserva confirmada y eliminada de 'Posibles reservas'."
                );
                // Actualizar la tabla
                fetchReservations();
              })
              .catch((error) => {
                console.error(
                  "Error al eliminar la reserva de 'Posibles reservas': ",
                  error
                );
              });
          })
          .catch((error) => {
            console.error("Error al agregar la reserva a 'Reservas': ", error);
          });
      } else {
        console.error("La reserva no existe.");
      }
    })
    .catch((error) => {
      console.error("Error al obtener la reserva: ", error);
    });
}

// Función para cancelar una reserva
function cancelarReserva(reservaId) {
  // Eliminar el documento de la colección 'Posibles reservas' por ID
  deleteDoc(doc(reservasRef, reservaId))
    .then(() => {
      console.log("Reserva cancelada y eliminada de 'Posibles reservas'.");
      // Actualizar la tabla
      fetchReservations();
    })
    .catch((error) => {
      console.error("Error al cancelar la reserva: ", error);
    });
}
// Función para obtener y mostrar las reservas
function fetchReservations() {
  getDocs(reservasRef).then((querySnapshot) => {
    const reservasBody = document.getElementById("reservas-body");
    reservasBody.innerHTML = ""; // Limpiamos el contenido anterior de la tabla

    querySnapshot.forEach((doc) => {
      const reserva = doc.data();
      const row = `
        <tr>
          <td>${reserva.date}</td>
          <td>${reserva.day}</td>
          <td>${reserva.name}</td>
          <td>${reserva.phone}</td>
          <td>${reserva.time}</td>
          <td>
            <button id='${doc.id}'>Confirmar</button>
            <button onclick="cancelarReserva('${doc.id}')">Cancelar</button>
          </td>
        </tr>
      `;
      document
        .getElementById("${doc.id}")
        .addEventListener("click", () => confirmarReserva(doc.id));
    });
    reservasBody.innerHTML += row;
  });
}

// Función para confirmar una reserva

// Llama a fetchReservations al cargar la página
document.addEventListener("DOMContentLoaded", function () {
  fetchReservations();
});
