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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rsc = collection(db, "Posibles reservas");

async function agregarReserva(reserva) {
  // Referencia a la subcolección "posibles_reservas" dentro de "Reservas sin confirmar"

  try {
    // Añadir el documento de reserva a la subcolección
    const docRef = await addDoc(rsc, {
      day: reserva.day,
      time: reserva.time,
      date: reserva.date,
      name: reserva.name,
      phone: reserva.phone,
    });
    console.log("Documento añadido con ID: ", docRef.id);
    alert("Reserva realizada correctamente.");
  } catch (e) {
    console.error("Error al añadir el documento: ", e);
    alert(
      "Hubo un error al procesar la reserva. Por favor, intenta nuevamente."
    );
  }
}
document.addEventListener("DOMContentLoaded", function () {
  const accordionHeaders = document.querySelectorAll(".accordion-header");

  accordionHeaders.forEach((header) => {
    header.addEventListener("click", function () {
      const accordionItem = this.parentElement;
      const accordionContent =
        accordionItem.querySelector(".accordion-content");
      const isExpanded = accordionItem.classList.contains("active");

      // Cerrar todos los acordeones activos
      const allAccordionItems = document.querySelectorAll(".accordion-item");
      allAccordionItems.forEach((item) => {
        if (item !== accordionItem && item.classList.contains("active")) {
          item.classList.remove("active");
          const contentToClose = item.querySelector(".accordion-content");
          contentToClose.style.display = "none";
        }
      });

      // Toggle active class para expandir/cerrar el acordeón clickeado
      accordionItem.classList.toggle("active");

      // Toggle display para el contenido
      if (isExpanded) {
        accordionContent.style.display = "none";
      } else {
        accordionContent.style.display = "block";
      }
    });
  });
});
// Clase Reserva
// Clase Reserva
// Clase Reserva
class Reserva {
  constructor(day, time, name, phone, date) {
    this.day = day;
    this.time = time;
    this.name = name;
    this.phone = phone;
    this.date = date;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const accordionHeaders = document.querySelectorAll(".accordion-header");
  const modal = document.getElementById("myModal");
  const modalClose = modal.querySelector(".close");
  const timeSlots = document.querySelectorAll(".time-slot");
  const reservationForm = document.getElementById("reservationForm");
  const weekStartDateElem = document.getElementById("weekStartDate");
  const weekEndDateElem = document.getElementById("weekEndDate");

  let selectedDay = "";
  let selectedTime = "";

  // Mostrar modal al hacer clic en un horario
  timeSlots.forEach((slot) => {
    slot.addEventListener("click", function () {
      selectedDay = this.closest(".accordion-item")
        .querySelector(".accordion-header")
        .textContent.trim();
      selectedTime = this.getAttribute("data-time");
      modal.style.display = "block";
    });
  });

  // Cerrar modal al hacer clic en el botón de cerrar
  modalClose.addEventListener("click", function () {
    modal.style.display = "none";
  });

  // Cerrar modal si se hace clic fuera de él
  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });

  // Manejar envío del formulario de reserva
  reservationForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (name !== "" && phone !== "") {
      // Calcular la fecha de la reserva
      const weekStartDate = new Date(
        weekStartDateElem.textContent.split("/").reverse().join("/")
      );
      const dayOffset = getDayOffset(selectedDay);
      const reservationDate = new Date(weekStartDate);
      reservationDate.setDate(weekStartDate.getDate() + dayOffset);
      const formattedDate = formatDate(reservationDate);

      // Crear objeto de reserva
      const reserva = new Reserva(
        selectedDay,
        selectedTime,
        name,
        phone,
        formattedDate
      );
      console.log(reserva); // Mostrar objeto reserva en consola
      agregarReserva(reserva);
      // Aquí podrías enviar los datos a un servidor o realizar otras acciones

      // Cerrar el modal después de confirmar
      modal.style.display = "none";

      // Limpiar el formulario para futuras reservas
      reservationForm.reset();
    } else {
      alert("Por favor, ingresa nombre y teléfono.");
    }
  });

  // Función para obtener el offset del día
  function getDayOffset(day) {
    switch (day) {
      case "Lunes":
        return 0;
      case "Martes":
        return 1;
      case "Miércoles":
        return 2;
      case "Jueves":
        return 3;
      case "Viernes":
        return 4;
      case "Sábado":
        return 5;
      case "Domingo":
        return 6;
      default:
        return 0;
    }
  }

  // Función para formatear la fecha
  function formatDate(date) {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}`;
  }

  // Manejadores para los botones de cambiar semana (Opcional)
  const prevWeekBtn = document.getElementById("prevWeekBtn");
  const nextWeekBtn = document.getElementById("nextWeekBtn");

  prevWeekBtn.addEventListener("click", function () {
    changeWeek(-1);
  });

  nextWeekBtn.addEventListener("click", function () {
    changeWeek(1);
  });

  function changeWeek(offset) {
    const currentStartDate = new Date(
      weekStartDateElem.textContent.split("/").reverse().join("/")
    );
    currentStartDate.setDate(currentStartDate.getDate() + offset * 7);
    const newStartDate = new Date(currentStartDate);
    const newEndDate = new Date(currentStartDate);
    newEndDate.setDate(newStartDate.getDate() + 6);

    const formatDate = (date) => {
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      return `${day}/${month}`;
    };

    weekStartDateElem.textContent = formatDate(newStartDate);
    weekEndDateElem.textContent = formatDate(newEndDate);
  }

  // Inicializar fechas de la semana
  displayWeekDates();

  function displayWeekDates() {
    const weekStartAndEndDates = getWeekStartAndEndDates();
    weekStartDateElem.textContent = weekStartAndEndDates.start;
    weekEndDateElem.textContent = weekStartAndEndDates.end;
  }

  function getWeekStartAndEndDates() {
    const currentDate = new Date();
    const currentDayOfWeek = currentDate.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() + distanceToMonday);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return {
      start: formatDate(startDate),
      end: formatDate(endDate),
    };
  }
});
