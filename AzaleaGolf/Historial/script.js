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

  // Nuevas referencias para el modal mensual
  const statsBtn1 = document.getElementById("stats-btn1");
  const monthlyStatsModal = document.getElementById("monthly-stats-modal");
  const closeMonthlyModal = monthlyStatsModal.querySelector(".close");
  const monthlyChartContainer = document.getElementById(
    "monthly-chart-container"
  );
  const monthlyStartDateInput = document.getElementById("monthly-start-date");
  const monthlyEndDateInput = document.getElementById("monthly-end-date");
  const monthlyFilterBtn = document.getElementById("monthly-filter-btn");

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
    // Ordena la lista de clientes alfabéticamente
    clients.sort((a, b) => a.localeCompare(b));

    clientSelect.innerHTML = '<option value="">Todos</option>';

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

    const paymentCheckbox = row.querySelector(".payment-checkbox");
    paymentCheckbox.addEventListener("change", async (e) => {
      const clientsSnapshot = await getDocs(collection(db, "Clientes"));
      let clientDoc = null;

      clientsSnapshot.forEach((doc) => {
        if (doc.data().name === name) {
          clientDoc = doc;
        }
      });

      const sesiones = clientDoc.data().availableSessions;
      if (sesiones < 1) {
        let b = confirm("Confirmar pago");
        if (b) {
          e.target.checked = true;
          await updateDoc(doc(db, "Reservas", id), { payment: true });
          paymentCheckbox.disabled = true;
        } else {
          e.target.checked = false;
        }
      } else {
        let b = confirm("Desea Pagar usando cuponera?");
        if (b) {
          e.target.checked = true;
          await updateDoc(doc(db, "Clientes", clientDoc.id), {
            availableSessions: sesiones - 1,
          });
          await updateDoc(doc(db, "Reservas", id), { payment: true });
          paymentCheckbox.disabled = true;
        } else {
          let c = confirm("Confirmar pago");
          if (c) {
            e.target.checked = true;
            await updateDoc(doc(db, "Reservas", id), { payment: true });
            paymentCheckbox.disabled = true;
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
      const day = dateObj
        .toLocaleDateString("es-ES", { weekday: "long" })
        .substring(0, 3);
      const hour = dateObj.getHours();

      const key = `${day} ${hour}hs`;
      if (!dayHourCounts[key]) {
        dayHourCounts[key] = 0;
      }
      dayHourCounts[key]++;
    });
    chartContainer.innerHTML = `<canvas id="myChart"></canvas>`;

    const diasSemana = {
      lunes: 1,
      martes: 2,
      miércoles: 3,
      jueves: 4,
      viernes: 5,
      sábado: 6,
      domingo: 7,
    };

    const diasSemanaAbreviado = {
      lun: 1,
      mar: 2,
      mié: 3,
      jue: 4,
      vie: 5,
      sáb: 6,
      dom: 7,
    };

    function ordenarReservas(reservas) {
      return Object.entries(reservas).sort(([diaHoraA], [diaHoraB]) => {
        const [diaA, horaA] = diaHoraA.split(" ");
        const [diaB, horaB] = diaHoraB.split(" ");
        const horaAInt = parseInt(horaA.replace("hs", ""));
        const horaBInt = parseInt(horaB.replace("hs", ""));

        if (diasSemanaAbreviado[diaA] !== diasSemanaAbreviado[diaB]) {
          return diasSemanaAbreviado[diaA] - diasSemanaAbreviado[diaB];
        }
        return horaAInt - horaBInt;
      });
    }

    const reservasOrdenadas = ordenarReservas(dayHourCounts);
    const reservas = [
      ["lun 13hs", 0],
      ["lun 14hs", 0],
      ["lun 15hs", 0],
      ["lun 16hs", 0],
      ["lun 17hs", 0],
      ["lun 18hs", 0],
      ["lun 19hs", 0],
      ["mar 13hs", 0],
      ["mar 14hs", 0],
      ["mar 15hs", 0],
      ["mar 16hs", 0],
      ["mar 17hs", 0],
      ["mar 18hs", 0],
      ["mar 19hs", 0],
      ["mié 13hs", 0],
      ["mié 14hs", 0],
      ["mié 15hs", 0],
      ["mié 16hs", 0],
      ["mié 17hs", 0],
      ["mié 18hs", 0],
      ["mié 19hs", 0],
      ["jue 13hs", 0],
      ["jue 14hs", 0],
      ["jue 15hs", 0],
      ["jue 16hs", 0],
      ["jue 17hs", 0],
      ["jue 18hs", 0],
      ["jue 19hs", 0],
      ["vie 13hs", 0],
      ["vie 14hs", 0],
      ["vie 15hs", 0],
      ["vie 16hs", 0],
      ["vie 17hs", 0],
      ["vie 18hs", 0],
      ["vie 19hs", 0],
    ];

    function combinarReservas(reservas, reservasOrdenadas) {
      reservas.forEach((reserva) => {
        const reservaOrdenada = reservasOrdenadas.find(
          ([diaHoraOrdenada]) => diaHoraOrdenada === reserva[0]
        );
        if (reservaOrdenada) {
          reserva[1] = reservaOrdenada[1];
        }
      });
    }

    combinarReservas(reservas, reservasOrdenadas);

    const etiquetas = reservas.map(([diaHora]) => diaHora);
    const valores = reservas.map(([, cantidad]) => cantidad);

    const ctx = document.getElementById("myChart").getContext("2d");
    if (window.myChartInstance) {
      window.myChartInstance.destroy();
    }
    window.myChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: "Cantidad de Reservas",
            data: valores,
            fill: false,
            borderColor: "rgb(76, 175, 80)",
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: "Día y Hora",
              font: { size: 14, weight: "600" },
            },
          },
          y: {
            title: {
              display: true,
              text: "Reservas",
              font: { size: 14, weight: "600" },
            },
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              callback: function (value) {
                if (Number.isInteger(value)) {
                  return value;
                }
              },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
          title: {
            display: true,
            text: "Cantidad de Reservas por Día y Hora",
            font: { size: 18, weight: "bold" },
          },
        },
      },
    });
  };

  const displayMonthlyStats = (startDateStr, endDateStr) => {
    const monthlyCounts = {};
    const monthLabels = [];
    const monthlyValues = [];

    const startParts = startDateStr.split("-");
    const endParts = endDateStr.split("-");
    const start = new Date(
      parseInt(startParts[0]),
      parseInt(startParts[1]) - 1,
      1
    );
    const end = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, 1);

    const dateCursor = new Date(start);

    while (dateCursor <= end) {
      const monthYear = dateCursor.toLocaleString("es-ES", {
        month: "short",
        year: "numeric",
      });

      let count = 0;
      reservations.forEach((res) => {
        const resDate = new Date(res.date);
        if (
          resDate.getFullYear() === dateCursor.getFullYear() &&
          resDate.getMonth() === dateCursor.getMonth()
        ) {
          count++;
        }
      });

      monthLabels.push(monthYear);
      monthlyValues.push(count);

      dateCursor.setMonth(dateCursor.getMonth() + 1);
    }

    if (window.monthlyChartInstance) {
      window.monthlyChartInstance.destroy();
    }

    monthlyChartContainer.innerHTML = '<canvas id="monthly-chart"></canvas>';
    const ctx = document.getElementById("monthly-chart").getContext("2d");
    window.monthlyChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: "Reservas por Mes",
            data: monthlyValues,
            fill: false,
            borderColor: "rgb(76, 175, 80)",
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Cantidad de Reservas",
              font: { size: 14, weight: "600" },
            },
            ticks: {
              stepSize: 1,
            },
          },
          x: {
            title: {
              display: true,
              text: "Mes",
              font: { size: 14, weight: "600" },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
          title: {
            display: true,
            text: `Reservas de ${start.toLocaleString("es-ES", {
              month: "long",
              year: "numeric",
            })} a ${end.toLocaleString("es-ES", {
              month: "long",
              year: "numeric",
            })}`,
            font: { size: 18, weight: "bold" },
          },
        },
      },
    });
  };

  const populateMonthlyDateFilters = () => {
    const today = new Date();
    const startDateOptions = new Date(2024, 7, 1); // Agosto 2024

    monthlyStartDateInput.innerHTML = "";
    monthlyEndDateInput.innerHTML = "";

    const populateSelect = (selectElement, defaultValue) => {
      let dateCursor = new Date(startDateOptions);
      while (dateCursor <= today) {
        const option = document.createElement("option");
        const value = `${dateCursor.getFullYear()}-${String(
          dateCursor.getMonth() + 1
        ).padStart(2, "0")}`;
        option.value = value;
        option.textContent = dateCursor.toLocaleString("es-ES", {
          month: "long",
          year: "numeric",
        });

        const defaultValueMonth = `${defaultValue.getFullYear()}-${String(
          defaultValue.getMonth() + 1
        ).padStart(2, "0")}`;
        if (value === defaultValueMonth) {
          option.selected = true;
        }
        selectElement.appendChild(option);
        dateCursor.setMonth(dateCursor.getMonth() + 1);
      }
    };

    const defaultStartDate = new Date(2024, 7, 1); // Agosto 2024
    const defaultEndDate = new Date(today.getFullYear(), today.getMonth(), 1);

    populateSelect(monthlyStartDateInput, defaultStartDate);
    populateSelect(monthlyEndDateInput, defaultEndDate);
  };

  statsBtn1.addEventListener("click", () => {
    const defaultStartDate = monthlyStartDateInput.value;
    const defaultEndDate = monthlyEndDateInput.value;

    displayMonthlyStats(defaultStartDate, defaultEndDate);
    monthlyStatsModal.style.display = "block";
  });

  monthlyFilterBtn.addEventListener("click", () => {
    const startDate = monthlyStartDateInput.value;
    const endDate = monthlyEndDateInput.value;

    if (startDate > endDate) {
      alert("La fecha de inicio no puede ser posterior a la fecha de fin.");
      return;
    }
    displayMonthlyStats(startDate, endDate);
  });

  closeMonthlyModal.addEventListener("click", () => {
    monthlyStatsModal.style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target == monthlyStatsModal) {
      monthlyStatsModal.style.display = "none";
    }
  });

  await fetchReservations();
  displayReservations();
  populateMonthlyDateFilters();
});
