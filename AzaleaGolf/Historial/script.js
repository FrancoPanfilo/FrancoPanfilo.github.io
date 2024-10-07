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
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const selectedClient = clientSelect.value;
    const dayHourCounts = {};
    const filteredReservations = reservations.filter((reservation) => {
      const reservationDate = new Date(reservation.date);
      const matchesClient =
        !selectedClient || reservation.name === selectedClient;
      const matchesDateRange =
        (!startDate || reservationDate >= new Date(startDate)) &&
        (!endDate || reservationDate <= new Date(endDate));
      return matchesClient && matchesDateRange;
    });
    filteredReservations.forEach((reservation) => {
      const dateObj = new Date(`${reservation.date}T${reservation.time}`);
      const day = dateObj.toLocaleDateString("es-ES", { weekday: "long" });
      const hour = dateObj.getHours();

      const key = `${day} ${hour}:00`;
      if (!dayHourCounts[key]) {
        dayHourCounts[key] = 0;
      }
      dayHourCounts[key]++;
    });
    chartContainer.innerHTML = `<div style="width: 80%; margin: 0 auto;">
        <canvas id="myChart"></canvas>
    </div>`;
    console.log(dayHourCounts);
    const diasSemana = {
      lunes: 1,
      martes: 2,
      miércoles: 3,
      jueves: 4,
      viernes: 5,
      sábado: 6,
      domingo: 7,
    };

    // Función para ordenar el array de reservas por día de la semana y hora
    function ordenarReservas(reservas) {
      return Object.entries(reservas).sort(([diaHoraA], [diaHoraB]) => {
        const [diaA, horaA] = diaHoraA.split(" ");
        const [diaB, horaB] = diaHoraB.split(" ");
        const [horaAInt, minutoA] = horaA.split(":").map(Number);
        const [horaBInt, minutoB] = horaB.split(":").map(Number);

        // Comparar por día y luego por hora
        if (diasSemana[diaA] !== diasSemana[diaB]) {
          return diasSemana[diaA] - diasSemana[diaB];
        }
        return horaAInt - horaBInt || minutoA - minutoB;
      });
    }

    // Obtener las reservas ordenadas
    const reservasOrdenadas = ordenarReservas(dayHourCounts);
    console.log(reservasOrdenadas);
    const reservas = [
      ["martes 13:00", 0],
      ["martes 14:00", 0],
      ["martes 15:00", 0],
      ["martes 16:00", 0],
      ["martes 17:00", 0],
      ["martes 18:00", 0],
      ["martes 19:00", 0],
      ["miércoles 13:00", 0],
      ["miércoles 14:00", 0],
      ["miércoles 15:00", 0],
      ["miércoles 16:00", 0],
      ["miércoles 17:00", 0],
      ["miércoles 18:00", 0],
      ["miércoles 19:00", 0],
      ["jueves 13:00", 0],
      ["jueves 14:00", 0],
      ["jueves 15:00", 0],
      ["jueves 16:00", 0],
      ["jueves 17:00", 0],
      ["jueves 18:00", 0],
      ["jueves 19:00", 0],
      ["viernes 13:00", 0],
      ["viernes 14:00", 0],
      ["viernes 15:00", 0],
      ["viernes 16:00", 0],
      ["viernes 17:00", 0],
      ["viernes 18:00", 0],
      ["viernes 19:00", 0],
      ["sábado 10:00", 0],
      ["sábado 11:00", 0],
      ["sábado 12:00", 0],
      ["sábado 13:00", 0],
    ];
    function combinarReservas(reservas, reservasOrdenadas) {
      reservas.forEach((reserva) => {
        const [diaHora, valorReserva] = reserva;
        const reservaOrdenada = reservasOrdenadas.find(
          ([diaHoraOrdenada]) => diaHoraOrdenada === diaHora
        );

        if (reservaOrdenada) {
          reserva[1] += reservaOrdenada[1]; // Sumar los valores
        }
      });
    }

    combinarReservas(reservas, reservasOrdenadas);

    // Extraer las etiquetas (día y hora) y los valores (cantidad de reservas)
    const etiquetas = reservas.map(([diaHora]) => diaHora);
    const valores = reservas.map(([, cantidad]) => cantidad);
    // Configuración del gráfico con Chart.js
    const ctx = document.getElementById("myChart").getContext("2d");
    const myChart = new Chart(ctx, {
      type: "line", // Puedes cambiar el tipo de gráfico a 'bar' si prefieres barras.
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: "Cantidad de Reservas",
            fillColor: "rgba(220,220,220,0.2)",
            strokeColor: "rgba(220,220,220,1)",
            pointColor: "rgba(220,220,220,1)",
            pointStrokeColor: "#fff",
            pointHighlightFill: "#fff",
            pointHighlightStroke: "rgba(220,220,220,1)",
            data: valores,
          },
        ],
      },
      options: {
        scales: {
          x: {
            title: {
              display: true,
              text: "Día y Hora",
            },
          },
          y: {
            title: {
              display: true,
              text: "Reservas",
            },
            beginAtZero: true,
            ticks: {
              stepSize: 1, // Controla el intervalo de los valores en el eje Y
              callback: function (value) {
                if (Number.isInteger(value)) {
                  return value; // Solo muestra los valores enteros
                }
              },
            },
          },
        },
      },
    });
  };

  await fetchReservations();
  displayReservations();
});
