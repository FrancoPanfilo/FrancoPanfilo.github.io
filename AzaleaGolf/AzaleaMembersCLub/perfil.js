/**
 * PERFIL DE USUARIO - AZALEA GOLF SIMULATOR
 * Lógica para la página de perfil del usuario
 */

import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// Inicialización cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    await loadUserProfile(user.uid);
    setupSaveButton(user.uid);
    setupLogoutButton();
  });
});

/**
 * Cargar datos del perfil del usuario
 */
async function loadUserProfile(userId) {
  try {
    const userRef = doc(db, "Simulador", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error("Usuario no encontrado");
      return;
    }

    const data = userDoc.data();

    // Información no editable
    document.getElementById("displayName").textContent =
      `${data.nombre || ""} ${data.apellido || ""}`.trim() || "--";
    document.getElementById("displayEmail").textContent = data.email || "--";
    document.getElementById("displayMemberSince").textContent = formatDate(
      data.fechaRegistro
    );

    // Campos editables
    if (
      data.handicap?.current !== null &&
      data.handicap?.current !== undefined
    ) {
      document.getElementById("handicapInput").value = data.handicap.current;
    }

    if (data.fechaNacimiento) {
      document.getElementById("fechaNacimiento").value = data.fechaNacimiento;
    }

    if (data.manoDominante) {
      const radio = document.querySelector(
        `input[name="manoDominante"][value="${data.manoDominante}"]`
      );
      if (radio) radio.checked = true;
    }

    // Historial de handicap
    renderHandicapHistory(data.handicap?.history || []);
  } catch (error) {
    console.error("Error cargando perfil:", error);
    showNotification("Error al cargar el perfil", "error");
  }
}

/**
 * Renderizar historial de handicap
 */
function renderHandicapHistory(history) {
  const container = document.getElementById("handicapHistory");

  if (!history || !history.length) {
    container.innerHTML = '<p class="no-history">Sin historial disponible</p>';
    return;
  }

  // Mostrar últimos 10 en orden inverso (más reciente primero)
  container.innerHTML = history
    .slice(-10)
    .reverse()
    .map((item) => {
      const badge =
        item.updatedBy === "admin"
          ? '<span class="history-badge">Admin</span>'
          : "";
      return `
        <div class="history-item">
          <span class="history-value">${item.value.toFixed(1)}</span>
          <span class="history-date">
            ${formatDate(item.date)}${badge}
          </span>
        </div>
      `;
    })
    .join("");
}

/**
 * Configurar botón de guardar
 */
function setupSaveButton(userId) {
  const saveBtn = document.getElementById("saveProfileBtn");

  saveBtn.addEventListener("click", async () => {
    const handicapInput = document.getElementById("handicapInput").value;
    const fechaNacimiento = document.getElementById("fechaNacimiento").value;
    const manoDominante = document.querySelector(
      'input[name="manoDominante"]:checked'
    )?.value;

    // Validar handicap si se ingresó
    if (handicapInput !== "") {
      const handicapValue = parseFloat(handicapInput);
      if (isNaN(handicapValue) || handicapValue < 0 || handicapValue > 54) {
        showNotification("El handicap debe estar entre 0 y 54", "error");
        return;
      }
    }

    try {
      // Deshabilitar botón mientras guarda
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

      const userRef = doc(db, "Simulador", userId);
      const userDoc = await getDoc(userRef);
      const currentData = userDoc.data();

      const updates = {
        fechaNacimiento: fechaNacimiento || null,
        manoDominante: manoDominante || null,
      };

      // Actualizar handicap con historial si cambió
      if (handicapInput !== "") {
        const newHandicap = parseFloat(handicapInput);
        const currentHandicap = currentData.handicap?.current;

        // Solo agregar al historial si el valor cambió
        if (currentHandicap !== newHandicap) {
          const historyEntry = {
            value: newHandicap,
            date: new Date().toISOString(),
            updatedBy: "user",
          };

          updates["handicap"] = {
            current: newHandicap,
            lastUpdated: new Date().toISOString(),
            history: [...(currentData.handicap?.history || []), historyEntry],
          };
        }
      }

      await updateDoc(userRef, updates);

      // Feedback visual
      saveBtn.innerHTML = '<i class="fas fa-check"></i> Guardado';
      showNotification("Perfil actualizado correctamente", "success");

      // Recargar datos después de un momento
      setTimeout(() => {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
        saveBtn.disabled = false;
        loadUserProfile(userId);
      }, 1500);
    } catch (error) {
      console.error("Error guardando perfil:", error);
      showNotification("Error al guardar el perfil", "error");
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
      saveBtn.disabled = false;
    }
  });
}

/**
 * Configurar botón de logout
 */
function setupLogoutButton() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        window.location.href = "index.html";
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
      }
    });
  }
}

/**
 * Formatear fecha ISO a formato legible
 */
function formatDate(isoDate) {
  if (!isoDate) return "--";
  try {
    return new Date(isoDate).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

/**
 * Mostrar notificación
 */
function showNotification(message, type = "info") {
  // Remover notificación existente si hay
  const existing = document.querySelector(".profile-notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = `profile-notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: ${
      type === "error" ? "#e74c3c" : type === "success" ? "#27ae60" : "#3498db"
    };
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  const icon =
    type === "error"
      ? "fa-exclamation-circle"
      : type === "success"
      ? "fa-check-circle"
      : "fa-info-circle";

  notification.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  document.body.appendChild(notification);

  // Auto-remover después de 3 segundos
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Agregar estilos de animación
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
