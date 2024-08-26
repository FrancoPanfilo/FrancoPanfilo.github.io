import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  increment,
  setDoc,
  getDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCaoKajIMiN3Y8AtPz5X2brHm0YOsFqiuo",
  authDomain: "azalea-92a39.firebaseapp.com",
  projectId: "azalea-92a39",
  storageBucket: "azalea-92a39.appspot.com",
  messagingSenderId: "564234531814",
  appId: "1:564234531814:web:ba8f9c434cd576b01e5c27",
  measurementId: "G-MX1L41XYVE",
};

const mobileNav = document.querySelector(".hamburger");
const navbar = document.querySelector(".menubar");

const toggleNav = () => {
  navbar.classList.toggle("active");
  mobileNav.classList.toggle("hamburger-active");
};
mobileNav.addEventListener("click", () => toggleNav());

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
document.addEventListener("DOMContentLoaded", async () => {
  const reservationForm = document.getElementById("reservation-form");
  const clientInput = document.getElementById("client-input");
  const clientList = document.getElementById("client-list");
  const reservationsTableBody = document.querySelector(
    "#reservations-table tbody"
  );

  reservationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = clientInput.value;
    const date = reservationForm.date.value;
    const time = reservationForm.time.value;
    const guests = reservationForm.guests.value;

    // Verificar si el cliente ya existe en la colección Clientes
    const clientsSnapshot = await getDocs(collection(db, "Clientes"));
    let clientDoc = null;

    clientsSnapshot.forEach((doc) => {
      if (doc.data().name === name) {
        clientDoc = doc;
      }
    });
    if (clientDoc) {
      // Si el cliente existe, incrementar el campo reservations
      await updateDoc(clientDoc.ref, {
        reservations: increment(1),
      });
    } else {
      // Si el cliente no existe, agregar a la colección Clientes con reservations = 1
      await addDoc(collection(db, "Clientes"), {
        name,
        reservations: 1,
        availableSessions: 0,
      });
    }

    // Agregar la nueva reserva a la colección Reservas
    await addDoc(collection(db, "Reservas"), {
      name,
      date,
      time,
      guests: parseInt(guests),
      payment: false,
    });

    reservationForm.reset();
    await displayReservations();
  });

  const fetchReservations = async () => {
    const reservations = [];
    const snapshot = await getDocs(collection(db, "Reservas"));
    const today = new Date();
    const startOfDay = new Date(today.setHours(-24, 0, 0, 0));
    snapshot.forEach((doc) => {
      const reservation = { id: doc.id, ...doc.data() };
      const reservationDate = new Date(reservation.date);
      if (reservationDate >= startOfDay) {
        reservations.push(reservation);
      }
    });

    return reservations;
  };

  const groupReservationsByDate = (reservations) => {
    return reservations.reduce((group, reservation) => {
      const date = reservation.date;
      if (!group[date]) {
        group[date] = [];
      }
      group[date].push(reservation);
      return group;
    }, {});
  };

  const displayReservations = async () => {
    reservationsTableBody.innerHTML = "";
    const reservations = await fetchReservations();

    // Ordenar las reservas por fecha
    const sortedReservations = reservations.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Agrupar las reservas por fecha
    const groupedReservations = groupReservationsByDate(sortedReservations);

    for (const [date, reservations] of Object.entries(groupedReservations)) {
      // Ordenar las reservas del mismo día por hora
      const sortedByTime = reservations.sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.time}`);
        const timeB = new Date(`${b.date}T${b.time}`);
        return timeA - timeB;
      });

      const dateObj = new Date(`${date}T00:00:00`);
      const day = dateObj.toLocaleDateString("es-ES", { weekday: "long" });
      const formattedDate = dateObj.toLocaleDateString("es-ES");

      const dayHeaderRow = document.createElement("tr");
      dayHeaderRow.classList.add("day-header");
      dayHeaderRow.innerHTML = `
          <td colspan="7">
            ${day} ${formattedDate}
          </td>`;
      reservationsTableBody.appendChild(dayHeaderRow);

      sortedByTime.forEach((reservation) => addReservationToTable(reservation));
    }
  };

  const addReservationToTable = (reservation) => {
    const { id, name, date, time, guests, payment } = reservation;

    const dateObj = new Date(`${date}T${time}`);
    const day = dateObj.toLocaleDateString("es-ES", { weekday: "long" });
    const formattedDate = dateObj.toLocaleDateString("es-ES");
    const formattedTime = dateObj.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const row = document.createElement("tr");
    row.dataset.id = id;
    row.innerHTML = `
      <td>${name}</td>
      <td>${day}</td>
      <td>${formattedDate}</td>
      <td>${formattedTime}</td>
      <td>${guests}</td>
      <td><input type="checkbox" class="payment-checkbox" ${
        payment ? "checked disabled" : ""
      }></td>
      <td><button class="cancel-btn">X</button></td>`;
    reservationsTableBody.appendChild(row);

    const paymentCheckbox = row.querySelector(".payment-checkbox");

    paymentCheckbox.addEventListener("change", async (e) => {
      const clientsSnapshot = await getDocs(collection(db, "Clientes"));
      let clientDoc = null;

      clientsSnapshot.forEach((doc) => {
        if (doc.data().name === name) {
          clientDoc = doc;
        }
      });

      // Si se encuentra el cliente, obtener las sesiones disponibles y mostrarlas en consola
      const sesiones = clientDoc.data().availableSessions;
      if (sesiones < 1) {
        let b = confirm("Confirmar pago");
        if (b) {
          b = e.target.checked;
          await updateDoc(doc(db, "Reservas", id), { payment: true });
          paymentCheckbox.disabled = true; // Deshabilitar el checkbox después de marcarlo
        } else {
          e.target.checked = false;
        }
      } else {
        let b = confirm("Desea Pagar usando cuponera?");
        if (b) {
          b = e.target.checked;
          await updateDoc(doc(db, "Clientes", clientDoc.id), {
            availableSessions: sesiones - 1,
          });
          await updateDoc(doc(db, "Reservas", id), { payment: true });
          paymentCheckbox.disabled = true; // Deshabilitar el checkbox después de marcarlo
        } else {
          let b = confirm("Confirmar pago");
          if (b) {
            b = e.target.checked;
            await updateDoc(doc(db, "Reservas", id), { payment: true });
            paymentCheckbox.disabled = true; // Deshabilitar el checkbox después de marcarlo
          } else {
            e.target.checked = false;
          }
        }
      }
    });

    row.querySelector(".cancel-btn").addEventListener("click", async () => {
      await deleteDoc(doc(db, "Reservas", id));

      // Decrementar el campo reservations del cliente
      const clientsSnapshot = await getDocs(collection(db, "Clientes"));
      let clientDoc = null;

      clientsSnapshot.forEach((doc) => {
        if (doc.data().name === name) {
          clientDoc = doc;
        }
      });
      if (clientDoc) {
        await updateDoc(clientDoc.ref, {
          reservations: increment(-1),
        });
      }
      row.remove();
    });
  };

  const fetchClients = async () => {
    const clients = [];
    const snapshot = await getDocs(collection(db, "Clientes"));

    snapshot.forEach((doc) => {
      const client = { id: doc.id, ...doc.data() };
      clients.push(client);
    });

    return clients;
  };

  const populateClientList = async () => {
    const clients = await fetchClients();
    clientList.innerHTML = ""; // Clear existing options
    clients.forEach((client) => {
      const option = document.createElement("option");
      option.value = client.name; // Assuming the client document has a "name" field
      clientList.appendChild(option);
    });
  };

  await populateClientList();
  displayReservations();
});
