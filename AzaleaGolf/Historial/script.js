import {
  db,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  increment,
  setDoc,
  getDoc,
  doc,
} from "../db.js";

const mobileNav = document.querySelector(".hamburger");
const navbar = document.querySelector(".menubar");

const toggleNav = () => {
  navbar.classList.toggle("active");
  mobileNav.classList.toggle("hamburger-active");
};
mobileNav.addEventListener("click", () => toggleNav());

document.addEventListener("DOMContentLoaded", async () => {
  const reservationsTableBody = document.querySelector(
    "#reservations-table tbody"
  );
  const startDateInput = document.getElementById("start-date");
  const endDateInput = document.getElementById("end-date");
  const filterBtn = document.getElementById("filter-btn");
  const clientSelect = document.getElementById("client-select");
  const statsBtn = document.getElementById("stats-btn");
  const statsModal = document.getElementById("stats-modal");
  const closeModal = statsModal.querySelector(".close");
  const chartContainer = document.getElementById("chart-container");

  let reservations = [];

  const fetchReservations = async () => {
    reservations = [];
    const snapshot = await getDocs(collection(db, "Reservas"));

    snapshot.forEach((doc) => {
      const reservation = { id: doc.id, ...doc.data() };
      reservations.push(reservation);
    });

    populateClientSelect(reservations);
    return reservations;
  };

  const populateClientSelect = (reservations) => {
    const clients = [
      ...new Set(reservations.map((reservation) => reservation.name)),
    ];
    clientSelect.innerHTML = '<option value="">Todos</option>'; // Reiniciar opciones

    clients.forEach((client) => {
      const option = document.createElement("option");
      option.value = client;
      option.textContent = client;
      clientSelect.appendChild(option);
    });
  };

  const displayReservations = (startDate, endDate, selectedClient) => {
    reservationsTableBody.innerHTML = "";

    const filteredReservations = reservations.filter((reservation) => {
      const reservationDate = new Date(reservation.date);
      const matchesClient =
        !selectedClient || reservation.name === selectedClient;
      const matchesDateRange =
        (!startDate || reservationDate >= new Date(startDate)) &&
        (!endDate || reservationDate <= new Date(endDate));
      return matchesClient && matchesDateRange;
    });

    // Ordenar por fecha y luego por hora
    const sortedReservations = filteredReservations.sort((a, b) => {
      const dateComparison = new Date(a.date) - new Date(b.date);
      if (dateComparison === 0) {
        return (
          new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)
        );
      }
      return dateComparison;
    });

    const groupedReservations = groupReservationsByDate(sortedReservations);

    for (const [date, reservations] of Object.entries(groupedReservations)) {
      const dateObj = new Date(`${date}T00:00:00`);
      const day = dateObj.toLocaleDateString("es-ES", { weekday: "long" });
      const formattedDate = dateObj.toLocaleDateString("es-ES");

      const dayHeaderRow = document.createElement("tr");
      dayHeaderRow.classList.add("day-header");
      dayHeaderRow.innerHTML = `
        <td colspan="6">
          ${day} ${formattedDate}
        </td>
      `;
      reservationsTableBody.appendChild(dayHeaderRow);

      reservations.forEach((reservation) => addReservationToTable(reservation));
    }
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
    row.innerHTML = `
      <td>${name}</td>
      <td>${formattedTime}</td>
      <td>${guests}</td>
      <td><input type="checkbox" class="payment-checkbox" ${
        payment ? "checked disabled" : ""
      }></td>`;
    reservationsTableBody.appendChild(row);

    // Añadir evento para el checkbox de pago
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
  };

  filterBtn.addEventListener("click", () => {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const selectedClient = clientSelect.value;
    displayReservations(startDate, endDate, selectedClient);
  });

  statsBtn.addEventListener("click", () => {
    displayStats();
    statsModal.style.display = "block";
  });

  closeModal.addEventListener("click", () => {
    statsModal.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target == statsModal) {
      statsModal.style.display = "none";
    }
  });

  const displayStats = () => {
    const dayHourCounts = {};

    reservations.forEach((reservation) => {
      const dateObj = new Date(`${reservation.date}T${reservation.time}`);
      const day = dateObj.toLocaleDateString("es-ES", { weekday: "long" });
      const hour = dateObj.getHours();

      const key = `${day} ${hour}:00`;
      if (!dayHourCounts[key]) {
        dayHourCounts[key] = 0;
      }
      dayHourCounts[key]++;
    });

    chartContainer.innerHTML = ""; // Limpiar contenido previo

    Object.keys(dayHourCounts)
      .sort()
      .forEach((key) => {
        const barLength =
          (dayHourCounts[key] / Math.max(...Object.values(dayHourCounts))) *
          100;
        const bar = document.createElement("div");
        bar.classList.add("chart-bar");
        bar.innerHTML = `
          <span>${key}</span>
          <div class="bar" style="width: ${barLength}%;">${dayHourCounts[key]}</div>`;
        chartContainer.appendChild(bar);
      });
  };

  await fetchReservations();
  displayReservations();
});
