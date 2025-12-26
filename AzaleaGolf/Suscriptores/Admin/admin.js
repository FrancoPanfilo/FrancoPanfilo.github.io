import {
  db,
  collection,
  getDocs,
  getDoc,
  updateDoc,
  doc,
} from "../../db.js";

// Almacenar datos de usuarios
let usersData = [];
let handicapChanges = {}; // Track changes for bulk update

// Rangos de handicap para estadísticas
const HANDICAP_RANGES = [
  { id: "0-5", label: "Scratch (0-5)", min: 0, max: 5 },
  { id: "6-10", label: "Bajo (6-10)", min: 6, max: 10 },
  { id: "11-15", label: "Medio-Bajo (11-15)", min: 11, max: 15 },
  { id: "16-20", label: "Medio (16-20)", min: 16, max: 20 },
  { id: "21-25", label: "Medio-Alto (21-25)", min: 21, max: 25 },
  { id: "26-30", label: "Alto (26-30)", min: 26, max: 30 },
  { id: "31-35", label: "Alto+ (31-35)", min: 31, max: 35 },
  { id: "36-40", label: "Principiante (36-40)", min: 36, max: 40 },
  { id: "41-54", label: "Iniciación (41-54)", min: 41, max: 54 },
];

// Inicializar al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  loadUsers();
  setupTabs();
  setupSearch();
  setupEditForm();
  setupBulkSave();
});

// Configurar tabs
function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;

      // Actualizar botones
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Actualizar contenido
      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
      });
      document.getElementById(`tab-${tabId}`).classList.add("active");

      // Cargar datos específicos del tab
      if (tabId === "handicaps") {
        renderHandicapGrid();
      } else if (tabId === "estadisticas") {
        renderStatistics();
      }
    });
  });
}

// Configurar búsqueda
function setupSearch() {
  const searchInput = document.getElementById("searchUser");
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filterUsersTable(searchTerm);
  });
}

// Cargar usuarios desde Firebase
async function loadUsers() {
  try {
    const usersRef = collection(db, "Simulador");
    const snapshot = await getDocs(usersRef);

    usersData = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    // Ordenar por nombre
    usersData.sort((a, b) => {
      const nameA = `${a.nombre || ""} ${a.apellido || ""}`.toLowerCase();
      const nameB = `${b.nombre || ""} ${b.apellido || ""}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    renderUsersTable();
  } catch (error) {
    console.error("Error cargando usuarios:", error);
    document.getElementById("usersTableBody").innerHTML =
      '<tr><td colspan="7" class="loading">Error al cargar usuarios</td></tr>';
  }
}

// Renderizar tabla de usuarios
function renderUsersTable(filteredUsers = null) {
  const tbody = document.getElementById("usersTableBody");
  const users = filteredUsers || usersData;

  if (users.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="loading">No se encontraron usuarios</td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map((user) => {
      const handicap = user.handicap?.current;
      const handicapDisplay =
        handicap !== null && handicap !== undefined
          ? `<span class="handicap-cell">${handicap.toFixed(1)}</span>`
          : '<span class="no-data">Sin asignar</span>';

      const fechaNac = user.fechaNacimiento
        ? formatDate(user.fechaNacimiento)
        : '<span class="no-data">-</span>';

      const mano = user.manoDominante
        ? user.manoDominante === "derecha"
          ? "Diestro"
          : "Zurdo"
        : '<span class="no-data">-</span>';

      const sesiones = user.Sesiones?.length || 0;

      return `
        <tr>
          <td>${user.nombre || ""} ${user.apellido || ""}</td>
          <td>${user.email || '<span class="no-data">-</span>'}</td>
          <td>${handicapDisplay}</td>
          <td>${fechaNac}</td>
          <td>${mano}</td>
          <td>${sesiones}</td>
          <td>
            <button class="btn-edit" onclick="openEditModal('${user.uid}')">
              Editar
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

// Filtrar tabla de usuarios
function filterUsersTable(searchTerm) {
  if (!searchTerm) {
    renderUsersTable();
    return;
  }

  const filtered = usersData.filter((user) => {
    const fullName = `${user.nombre || ""} ${user.apellido || ""}`.toLowerCase();
    const email = (user.email || "").toLowerCase();
    return fullName.includes(searchTerm) || email.includes(searchTerm);
  });

  renderUsersTable(filtered);
}

// Renderizar grid de handicaps
function renderHandicapGrid() {
  const grid = document.getElementById("handicapGrid");
  handicapChanges = {};

  // Filtrar solo usuarios reales (excluir pruebas)
  const realUsers = usersData.filter(
    (u) =>
      u.nombre &&
      !u.nombre.toLowerCase().includes("prueba") &&
      !u.apellido?.toLowerCase().includes("prueba")
  );

  grid.innerHTML = realUsers
    .map((user) => {
      const handicap = user.handicap?.current;
      const handicapValue =
        handicap !== null && handicap !== undefined ? handicap : "";

      return `
        <div class="handicap-item" data-uid="${user.uid}">
          <span class="user-name">${user.nombre} ${user.apellido || ""}</span>
          <input
            type="number"
            min="0"
            max="54"
            step="0.1"
            value="${handicapValue}"
            data-original="${handicapValue}"
            placeholder="-"
            onchange="trackHandicapChange('${user.uid}', this)"
          />
        </div>
      `;
    })
    .join("");
}

// Rastrear cambios de handicap
window.trackHandicapChange = function (uid, input) {
  const original = input.dataset.original;
  const newValue = input.value;
  const item = input.closest(".handicap-item");

  if (newValue !== original) {
    handicapChanges[uid] = newValue === "" ? null : parseFloat(newValue);
    item.classList.add("modified");
  } else {
    delete handicapChanges[uid];
    item.classList.remove("modified");
  }

  updateSaveButtonState();
};

// Actualizar estado del botón guardar
function updateSaveButtonState() {
  const saveBtn = document.getElementById("saveAllHandicaps");
  const changeCount = Object.keys(handicapChanges).length;
  saveBtn.disabled = changeCount === 0;
  saveBtn.textContent =
    changeCount > 0
      ? `Guardar ${changeCount} Cambio${changeCount > 1 ? "s" : ""}`
      : "Guardar Todos los Cambios";
}

// Configurar guardado masivo
function setupBulkSave() {
  document.getElementById("saveAllHandicaps").addEventListener("click", async () => {
    const status = document.getElementById("handicapStatus");
    const saveBtn = document.getElementById("saveAllHandicaps");

    if (Object.keys(handicapChanges).length === 0) return;

    saveBtn.disabled = true;
    status.textContent = "Guardando...";
    status.className = "status-message";

    try {
      for (const [uid, newHandicap] of Object.entries(handicapChanges)) {
        const userRef = doc(db, "Simulador", uid);
        const userDoc = await getDoc(userRef);
        const currentData = userDoc.data();

        if (newHandicap === null) {
          // Limpiar handicap
          await updateDoc(userRef, {
            handicap: {
              current: null,
              lastUpdated: new Date().toISOString(),
              history: currentData.handicap?.history || [],
            },
          });
        } else {
          // Actualizar handicap
          const historyEntry = {
            value: newHandicap,
            date: new Date().toISOString(),
            updatedBy: "admin",
          };

          await updateDoc(userRef, {
            handicap: {
              current: newHandicap,
              lastUpdated: new Date().toISOString(),
              history: [...(currentData.handicap?.history || []), historyEntry],
            },
          });
        }

        // Actualizar datos locales
        const userIndex = usersData.findIndex((u) => u.uid === uid);
        if (userIndex !== -1) {
          usersData[userIndex].handicap = {
            ...usersData[userIndex].handicap,
            current: newHandicap,
          };
        }
      }

      status.textContent = `✓ ${Object.keys(handicapChanges).length} handicap(s) actualizados`;
      status.className = "status-message success";

      // Limpiar cambios y actualizar UI
      handicapChanges = {};
      renderHandicapGrid();
      updateSaveButtonState();
    } catch (error) {
      console.error("Error guardando handicaps:", error);
      status.textContent = "✗ Error al guardar: " + error.message;
      status.className = "status-message error";
      saveBtn.disabled = false;
    }
  });
}

// Renderizar estadísticas
function renderStatistics() {
  // Filtrar usuarios reales
  const realUsers = usersData.filter(
    (u) =>
      u.nombre &&
      !u.nombre.toLowerCase().includes("prueba") &&
      !u.apellido?.toLowerCase().includes("prueba")
  );

  // Estadísticas generales
  const totalUsers = realUsers.length;
  const withHandicap = realUsers.filter(
    (u) => u.handicap?.current !== null && u.handicap?.current !== undefined
  ).length;
  const totalSessions = realUsers.reduce(
    (sum, u) => sum + (u.Sesiones?.length || 0),
    0
  );

  const handicaps = realUsers
    .filter((u) => u.handicap?.current !== null && u.handicap?.current !== undefined)
    .map((u) => u.handicap.current);

  const avgHandicap =
    handicaps.length > 0
      ? (handicaps.reduce((a, b) => a + b, 0) / handicaps.length).toFixed(1)
      : "-";

  document.getElementById("statTotalUsers").textContent = totalUsers;
  document.getElementById("statWithHandicap").textContent = withHandicap;
  document.getElementById("statTotalSessions").textContent = totalSessions;
  document.getElementById("statAvgHandicap").textContent = avgHandicap;

  // Distribución por rango
  const distribution = HANDICAP_RANGES.map((range) => {
    const count = handicaps.filter(
      (h) => h >= range.min && h <= range.max
    ).length;
    return { ...range, count };
  });

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  document.getElementById("handicapDistribution").innerHTML = distribution
    .map(
      (range) => `
      <div class="distribution-row">
        <span class="distribution-label">${range.label}</span>
        <div class="distribution-bar-container">
          <div class="distribution-bar" style="width: ${(range.count / maxCount) * 100}%"></div>
        </div>
        <span class="distribution-count">${range.count}</span>
      </div>
    `
    )
    .join("");
}

// Modal de edición
window.openEditModal = function (uid) {
  const user = usersData.find((u) => u.uid === uid);
  if (!user) return;

  document.getElementById("editUserId").value = uid;
  document.getElementById("editNombre").value = user.nombre || "";
  document.getElementById("editApellido").value = user.apellido || "";
  document.getElementById("editEmail").value = user.email || "";
  document.getElementById("editHandicap").value =
    user.handicap?.current !== null && user.handicap?.current !== undefined
      ? user.handicap.current
      : "";
  document.getElementById("editFechaNacimiento").value =
    user.fechaNacimiento || "";

  // Mano dominante
  const manoRadios = document.querySelectorAll('input[name="editMano"]');
  manoRadios.forEach((radio) => {
    radio.checked = radio.value === user.manoDominante;
  });

  document.getElementById("editUserModal").style.display = "flex";
};

window.closeEditModal = function () {
  document.getElementById("editUserModal").style.display = "none";
};

// Configurar formulario de edición
function setupEditForm() {
  document.getElementById("editUserForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const uid = document.getElementById("editUserId").value;
    const handicapValue = document.getElementById("editHandicap").value;
    const fechaNacimiento = document.getElementById("editFechaNacimiento").value;
    const manoRadio = document.querySelector('input[name="editMano"]:checked');

    try {
      const userRef = doc(db, "Simulador", uid);
      const userDoc = await getDoc(userRef);
      const currentData = userDoc.data();

      const updates = {
        fechaNacimiento: fechaNacimiento || null,
        manoDominante: manoRadio?.value || null,
      };

      // Actualizar handicap si cambió
      if (handicapValue !== "") {
        const newHandicap = parseFloat(handicapValue);
        if (newHandicap >= 0 && newHandicap <= 54) {
          const historyEntry = {
            value: newHandicap,
            date: new Date().toISOString(),
            updatedBy: "admin",
          };

          updates.handicap = {
            current: newHandicap,
            lastUpdated: new Date().toISOString(),
            history: [...(currentData.handicap?.history || []), historyEntry],
          };
        }
      }

      await updateDoc(userRef, updates);

      // Actualizar datos locales
      const userIndex = usersData.findIndex((u) => u.uid === uid);
      if (userIndex !== -1) {
        usersData[userIndex] = { ...usersData[userIndex], ...updates };
      }

      closeEditModal();
      renderUsersTable();
      alert("Usuario actualizado correctamente");
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      alert("Error al actualizar: " + error.message);
    }
  });
}

// Utilidades
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Mobile nav toggle
const mobileNav = document.querySelector(".hamburger");
const navbar = document.querySelector(".menubar");
if (mobileNav) {
  mobileNav.addEventListener("click", () => {
    navbar.classList.toggle("active");
    mobileNav.classList.toggle("hamburger-active");
  });
}
