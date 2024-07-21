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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const mobileNav = document.querySelector(".hamburger");
const navbar = document.querySelector(".menubar");

const toggleNav = () => {
  navbar.classList.toggle("active");
  mobileNav.classList.toggle("hamburger-active");
};
mobileNav.addEventListener("click", () => toggleNav());
console.log("object");

document.addEventListener("DOMContentLoaded", async () => {
  const reservationsTableBody = document.querySelector(
    "#reservations-table tbody"
  );

  const fetchReservations = async () => {
    const reservations = [];
    const snapshot = await getDocs(collection(db, "Reservas"));

    snapshot.forEach((doc) => {
      const reservation = { id: doc.id, ...doc.data() };
      reservations.push(reservation);
    });

    return reservations;
  };

  const displayReservations = async () => {
    reservationsTableBody.innerHTML = "";
    const reservations = await fetchReservations();

    const sortedReservations = reservations.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const groupedReservations = groupReservationsByDate(sortedReservations);

    for (const [date, reservations] of Object.entries(groupedReservations)) {
      const dateObj = new Date(`${date}T00:00:00`);
      const day = dateObj.toLocaleDateString("es-ES", { weekday: "long" });
      const formattedDate = dateObj.toLocaleDateString("es-ES");

      const dayHeaderRow = document.createElement("tr");
      dayHeaderRow.classList.add("day-header");
      dayHeaderRow.innerHTML = `<td colspan="5">${day} ${formattedDate}</td>`;
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
    const { name, date, time, guests } = reservation;

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
        <td>${day}</td>
        <td>${formattedDate}</td>
        <td>${formattedTime}</td>
        <td>${guests}</td>
      `;
    reservationsTableBody.appendChild(row);
  };

  await displayReservations();
});
