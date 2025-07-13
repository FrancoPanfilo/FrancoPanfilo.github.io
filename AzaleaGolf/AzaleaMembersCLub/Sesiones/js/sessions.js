// Importaciones
import { auth, db } from "../../firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { displayShotsTable } from "./shots.js";
import { loadDeselectedShots } from "./storage.js";

// Variables globales
let currentData = [];
let currentSort = { column: null, ascending: true };
let currentFilter = null;
let selectedShots = new Set();
let clubVisibility = {};

// Función principal para cargar sesiones
export async function loadSessions() {
  const user = auth.currentUser;
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const sessionsList = document.getElementById("sessionsList");
  const titleElement = document.getElementById("userTitle");
  sessionsList.innerHTML = "";

  try {
    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const sessions = userData.Sesiones || [];

      // Actualizar título
      titleElement.textContent = `Sesiones de ${userData.nombre} ${userData.apellido}`;

      if (sessions.length === 0) {
        sessionsList.innerHTML = "<p>No hay sesiones disponibles.</p>";
        return;
      }

      // Ordenar sesiones por fecha (más reciente primero)
      sessions.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      // Cargar tiros deseleccionados
      loadDeselectedShots();

      // Mostrar cada sesión
      sessions.forEach((session, index) => {
        const sessionItem = document.createElement("div");
        sessionItem.className = "session-item";
        sessionItem.innerHTML = `
          <p><strong>Fecha:</strong> ${session.fecha}</p>
          <p><strong>Cantidad de tiros:</strong> ${session.stats.shotCount}</p>
          <p><strong>Duración:</strong> ${session.stats.sessionTime}</p>
        `;

        sessionItem.addEventListener("click", () => {
          document
            .querySelectorAll(".session-item")
            .forEach((item) => item.classList.remove("active"));
          sessionItem.classList.add("active");

          currentData = session.datos;
          currentSort = { column: null, ascending: true };
          currentFilter = null;

          // Cargar tiros deseleccionados para esta sesión
          const deselected = deselectedShots.get(session.fecha) || new Set();
          selectedShots = new Set(
            currentData
              .map((_, i) => (!deselected.has(i) ? i : null))
              .filter((i) => i !== null)
          );

          clubVisibility = {};
          currentData.forEach((row) => {
            clubVisibility[row["club name"]] = false;
          });

          displayShotsTable(currentData, index);
        });

        sessionsList.appendChild(sessionItem);
      });
    } else {
      sessionsList.innerHTML = "<p>No se encontraron datos del usuario.</p>";
    }
  } catch (error) {
    console.error("Error al cargar sesiones:", error);
    sessionsList.innerHTML = "<p>Error al cargar las sesiones.</p>";
  }
}

// Exportar variables y funciones necesarias
export {
  currentData,
  currentSort,
  currentFilter,
  selectedShots,
  clubVisibility,
};
