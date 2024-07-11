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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  const reservationForm = document.getElementById("reservation-form");
  const reservationsTableBody = document.querySelector(
    "#reservations-table tbody"
  );
  const showAllButton = document.getElementById("show-all-btn");
  const sortClientsButton = document.getElementById("sort-clients-btn");
  const nameInput = document.getElementById("name");

  // Función para obtener los nombres de clientes de Firebase
  const fetchClientNames = async () => {
    const clientesRef = collection(db, "Clientes");
    const snapshot = await getDocs(clientesRef);
    const clientNames = snapshot.docs.map((doc) => doc.data().name);
    return clientNames;
  };

  // Función para inicializar el campo de nombre con sugerencias
  const initializeNameInput = async () => {
    const clientNames = await fetchClientNames();
    nameInput.setAttribute("list", "client-names");
    const datalist = document.createElement("datalist");
    datalist.id = "client-names";
    clientNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      datalist.appendChild(option);
    });
    document.body.appendChild(datalist);
  };

  // Llamar a la función para inicializar el campo de nombre con sugerencias
  initializeNameInput();

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
              payment ? "checked" : ""
            }></td>
            <td><button class="cancel-btn">Cancelar</button></td>
        `;
    reservationsTableBody.appendChild(row);

    row
      .querySelector(".payment-checkbox")
      .addEventListener("change", async (e) => {
        const paymentStatus = e.target.checked;
        await updateDoc(doc(db, "Reservas", id), {
          payment: paymentStatus,
        });
      });

    row.querySelector(".cancel-btn").addEventListener("click", async () => {
      await deleteDoc(doc(db, "Reservas", id));
      row.remove();
    });
  };

  const addDateHeader = (date) => {
    const dateObj = new Date(date);
    const day = dateObj.toLocaleDateString("es-ES", { weekday: "long" });
    const formattedDate = dateObj.toLocaleDateString("es-ES");

    const headerRow = document.createElement("tr");
    const headerCell = document.createElement("td");
    headerCell.colSpan = 7;
    headerCell.className = "date-header";
    headerCell.textContent = `${day} ${formattedDate}`;
    headerRow.appendChild(headerCell);
    reservationsTableBody.appendChild(headerRow);
  };

  const renderReservations = async (showAll) => {
    reservationsTableBody.innerHTML = "";
    let currentDate = "";

    const reservations = await fetchReservations(showAll);
    reservations
      .sort(
        (a, b) =>
          new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)
      )
      .forEach((reservation) => {
        if (reservation.date !== currentDate) {
          currentDate = reservation.date;
          addDateHeader(currentDate);
        }
        addReservationToTable(reservation);
      });
  };

  reservationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const guests = document.getElementById("guests").value;

    const docRef = await addDoc(collection(db, "Reservas"), {
      name,
      date,
      time,
      guests,
      payment: false,
    });

    await updateCustomerReservations(name);

    renderReservations(false); // Mostrar solo las reservas a partir de hoy

    reservationForm.reset();
  });

  showAllButton.addEventListener("click", () => {
    renderReservations(true); // Mostrar todas las reservas
  });

  sortClientsButton.addEventListener("click", async () => {
    const clientesRef = collection(db, "Clientes");
    const snapshot = await getDocs(clientesRef);

    const clientes = [];
    snapshot.forEach((doc) => {
      clientes.push({ id: doc.id, ...doc.data() });
    });

    clientes.sort((a, b) => b.reservations - a.reservations); // Ordenar por cantidad de reservas

    // Limpiar la tabla de reservas
    reservationsTableBody.innerHTML = "";

    // Agregar los clientes ordenados a la tabla
    clientes.forEach((cliente) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${cliente.name}</td>
        <td colspan="6">Reservas: ${cliente.reservations}</td>
      `;
      reservationsTableBody.appendChild(row);
    });

    sortClientsButton.classList.toggle("active");
    if (!sortClientsButton.classList.contains("active")) {
      renderReservations(false); // Mostrar la tabla de reservas por defecto
    }
  });

  renderReservations(false); // Mostrar inicialmente solo las reservas a partir de hoy
});
