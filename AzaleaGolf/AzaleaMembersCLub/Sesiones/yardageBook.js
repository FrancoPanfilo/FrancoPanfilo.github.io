// Funciones para crear el YardageBook
import { auth, db } from "../firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Función para crear el YardageBook
export async function createYardageBook(
  selectedSessionIndices,
  deselectedShotsMap
) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No hay usuario autenticado");
    }

    // Obtener todas las sesiones del usuario
    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error("No se encontraron datos del usuario");
    }

    const userData = userDoc.data();
    const allSessions = userData.Sesiones || [];

    if (allSessions.length === 0) {
      throw new Error("No hay sesiones disponibles");
    }

    // Filtrar solo las sesiones seleccionadas
    const selectedSessions = allSessions.filter((_, index) =>
      selectedSessionIndices.has(index)
    );

    if (selectedSessions.length === 0) {
      throw new Error("No se seleccionaron sesiones válidas");
    }

    // Procesar cada sesión seleccionada
    const processedSessions = selectedSessions.map((session, sessionIndex) => {
      // Obtener los datos de la sesión
      const sessionData = session.data || [];
      if (!Array.isArray(sessionData)) {
        console.warn(`La sesión ${sessionIndex} no tiene datos válidos`);
        return {
          fecha: session.fecha,
          shots: [],
        };
      }

      // Obtener los índices de tiros deseleccionados para esta sesión
      const deselectedShotsForSession =
        deselectedShotsMap.get(sessionIndex) || new Set();

      // Filtrar los tiros, excluyendo los deseleccionados
      const filteredShots = sessionData.filter(
        (_, shotIndex) => !deselectedShotsForSession.has(shotIndex)
      );

      return {
        fecha: session.fecha,
        shots: filteredShots,
        stats: session.stats || {},
      };
    });

    // Filtrar sesiones que no tienen tiros
    const validSessions = processedSessions.filter(
      (session) => session.shots.length > 0
    );

    if (validSessions.length === 0) {
      throw new Error("No hay tiros válidos en las sesiones seleccionadas");
    }

    // Aquí irá la lógica para crear el YardageBook con las sesiones procesadas
    console.log("Sesiones procesadas para el YardageBook:", validSessions);

    // TODO: Implementar la generación del YardageBook
    return validSessions;
  } catch (error) {
    console.error("Error al crear el YardageBook:", error);
    throw error;
  }
}
