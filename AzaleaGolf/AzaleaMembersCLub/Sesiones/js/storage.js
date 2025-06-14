// Estado global para tiros deseleccionados
let deselectedShots = new Map(); // Map<sessionId, Set<shotIndex>>

// Función para guardar los tiros deseleccionados
export function saveDeselectedShots(sessionId) {
  const deselected = new Set();
  currentData.forEach((_, index) => {
    if (!selectedShots.has(index)) {
      deselected.add(index);
    }
  });
  deselectedShots.set(sessionId, deselected);
  localStorage.setItem(
    "deselectedShots",
    JSON.stringify(Array.from(deselectedShots.entries()))
  );
}

// Función para cargar los tiros deseleccionados
export function loadDeselectedShots() {
  const saved = localStorage.getItem("deselectedShots");
  if (saved) {
    deselectedShots = new Map(JSON.parse(saved));
  }
}

// Función para obtener los tiros deseleccionados de una sesión
export function getDeselectedShots(sessionId) {
  return deselectedShots.get(sessionId) || new Set();
}

// Función para limpiar los tiros deseleccionados de una sesión
export function clearDeselectedShots(sessionId) {
  deselectedShots.delete(sessionId);
  localStorage.setItem(
    "deselectedShots",
    JSON.stringify(Array.from(deselectedShots.entries()))
  );
}

// Función para guardar preferencias del usuario
export function saveUserPreferences(preferences) {
  localStorage.setItem("userPreferences", JSON.stringify(preferences));
}

// Función para cargar preferencias del usuario
export function loadUserPreferences() {
  const saved = localStorage.getItem("userPreferences");
  return saved ? JSON.parse(saved) : {};
}

// Exportar el estado global
export { deselectedShots };
