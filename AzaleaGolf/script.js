// Importaciones de Firebase
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
  apiKey: "tu-api-key",
  authDomain: "tu-auth-domain",
  projectId: "tu-project-id",
  storageBucket: "tu-storage-bucket",
  messagingSenderId: "tu-messaging-sender-id",
  appId: "tu-app-id",
  measurementId: "tu-measurement-id",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", async () => {
  const reservationForm = document.getElementById("reservation-form");
  const reservationsTableBody = document.querySelector(
    "#reservations-table tbody"
  );
  const showAllButton = document.getElementById("show-all-btn");
  const sortClientsButton = document.getElementById("sort-clients-btn");

  // Función para buscar y filtrar las reservas
  const fetchReservations = async (showAll) => {
    const reservations = [];
    const snapshot = await getDocs(collection(db, "Reservas"));

    const today = new Date(); // Obtener la fecha actual
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)); // Establecer a las 00:00 horas

    snapshot.forEach((doc) => {
      const reservation = { id: doc.id, ...doc.data() };
      const reservationDate = new Date(reservation.date);

      // Filtrar por fecha si no se desea mostrar todas las reservas
      if (showAll || reservationDate >= startOfDay) {
        reservations.push(reservation);
      }
    });

    return reservations;
  };

  // Función para actualizar las reservas del cliente
  const updateCustomerReservations = async (name) => {
    const customerRef = doc(db, "Clientes", name);
    const docSnapshot = await getDoc(customerRef);

    if (docSnapshot.exists()) {
      const currentReservations = docSnapshot.data().reservations || 0;
      await updateDoc(customerRef, {
        reservations: increment(currentReservations + 1),
      });
    } else {
      await setDoc(customerRef, { name, reservations: 1 });
    }
  };

  // Función para añadir una reserva a la tabla de reservas
  const addReservationToTable = (reservation) => {
    const { id, name, date, time, guests, payment } = reservation;

    const dateObj = new Date(`${date}T${time}`);
    const formattedTime = dateObj.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const row = document.createElement("tr");
    row.dataset.id = id;
    row.innerHTML = `
      <td>${name}</td>
      <td>${formattedTime}</td>
      <td>${guests}</td>
      <td>${payment ? "Pagado" : "Pendiente"}</td>
      <td><button class="cancel-btn">Cancelar</button></td>
    `;
    reservationsTableBody.appendChild(row);

    // Listener para el botón de cancelar reserva
    row.querySelector(".cancel-btn").addEventListener("click", async () => {
      await deleteDoc(doc(db, "Reservas", id));
      row.remove();
    });
  };

  // Función para añadir encabezado de fecha a la tabla de reservas
  const addDateHeader = (date) => {
    const dateObj = new Date(date);
    const day = dateObj.toLocaleDateString("es-ES", { weekday: "long" });
    const formattedDate = dateObj.toLocaleDateString("es-ES");

    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
      <th colspan="7">${day} ${formattedDate}</th>
    `;
    reservationsTableBody.appendChild(headerRow);
  };

  // Función para renderizar las reservas en la tabla
  const renderReservations = async (showAll) => {
    reservationsTableBody.innerHTML = "";
    let currentDate = "";

    const reservations = await fetchReservations(showAll);
    reservations.forEach((reservation) => {
      const reservationDate = new Date(reservation.date);
      const formattedDate = reservationDate.toLocaleDateString("es-ES");

      if (reservation.date !== currentDate) {
        currentDate = reservation.date;
        addDateHeader(reservation.date);
      }

      addReservationToTable(reservation);
    });
  };

  // Listener para el formulario de reservas
  reservationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const guests = document.getElementById("guests").value;

    await addDoc(collection(db, "Reservas"), {
      name,
      date,
      time,
      guests: parseInt(guests),
      payment: false,
    });

    await updateCustomerReservations(name);
    await renderReservations(false);

    reservationForm.reset();
  });

  // Listener para mostrar todas las reservas
  showAllButton.addEventListener("click", () => {
    renderReservations(true);
  });

  // Listener para ordenar clientes por reservas
  sortClientsButton.addEventListener("click", async () => {
    const clientesRef = collection(db, "Clientes");
    const snapshot = await getDocs(clientesRef);

    const clientes = [];
    snapshot.forEach((doc) => {
      clientes.push({ id: doc.id, ...doc.data() });
    });

    clientes.sort((a, b) => b.reservations - a.reservations); // Ordenar por cantidad de reservas

    // Limpiar la tabla principal y mostrar clientes ordenados por reservas
    reservationsTableBody.innerHTML = "";
    clientes.forEach((cliente) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${cliente.name}</td>
        <td>${cliente.reservations}</td>
      `;
      reservationsTableBody.appendChild(row);
    });
  });

  // Mostrar reservas iniciales
  await renderReservations(false);
});
// Listener para el formulario de reservas

reservationForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value;
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const guests = document.getElementById("guests").value;

  await addDoc(collection(db, "Reservas"), {
    name,
    date,
    time,
    guests: parseInt(guests),
    payment: false,
  });

  await updateCustomerReservations(name);
  await renderReservations(false);

  reservationForm.reset();
});
// Obtener nombres de clientes existentes para sugerencias
const fetchClientNames = async () => {
  const clientesRef = collection(db, "Clientes");
  const snapshot = await getDocs(clientesRef);
  const names = snapshot.docs.map((doc) => doc.id);
  return names;
};

// Cargar nombres de clientes como opciones sugeridas
const loadClientNames = async () => {
  const names = await fetchClientNames();
  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    clientesList.appendChild(option);
  });
};

// Cargar nombres de clientes al iniciar
await loadClientNames();
