/**
 * SISTEMA DE CACHÉ
 *
 * Este módulo proporciona un sistema de caché en memoria y localStorage
 * para mejorar el performance de la aplicación.
 *
 * Características:
 * - Caché en memoria para acceso rápido
 * - Persistencia en localStorage
 * - Expiración automática
 * - Límite de tamaño configurable
 * - Limpieza automática
 */

import { appConfig } from "../config.js";

/**
 * CLASE PRINCIPAL DE CACHÉ
 * Gestiona el almacenamiento y recuperación de datos en caché
 */
class CacheManager {
  constructor() {
    // Caché en memoria (Map para acceso O(1))
    this.memoryCache = new Map();

    // Configuración del caché
    this.config = {
      maxSize: appConfig.cache.maxCacheSize,
      defaultTTL: appConfig.cache.sessionTimeout, // Tiempo de vida por defecto
      cleanupInterval: 5 * 60 * 1000, // Limpiar cada 5 minutos
    };

    // Inicializar el sistema de caché
    this.init();
  }

  /**
   * INICIALIZAR EL SISTEMA DE CACHÉ
   * Configura la limpieza automática y carga datos del localStorage
   */
  init() {
    // Cargar datos del localStorage al iniciar
    this.loadFromStorage();

    // Configurar limpieza automática
    setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    // Limpiar al cerrar la página
    window.addEventListener("beforeunload", () => {
      this.saveToStorage();
    });
  }

  /**
   * GUARDAR DATO EN CACHÉ
   * Almacena un dato con clave, valor y tiempo de expiración opcional
   *
   * @param {string} key - Clave única del dato
   * @param {any} value - Valor a almacenar
   * @param {number} ttl - Tiempo de vida en milisegundos (opcional)
   * @returns {boolean} True si se guardó correctamente
   */
  set(key, value, ttl = this.config.defaultTTL) {
    try {
      // Verificar límite de tamaño
      if (this.memoryCache.size >= this.config.maxSize) {
        this.evictOldest();
      }

      // Crear entrada de caché con metadatos
      const cacheEntry = {
        value: value,
        timestamp: Date.now(),
        ttl: ttl,
        expiresAt: Date.now() + ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
      };

      // Guardar en memoria
      this.memoryCache.set(key, cacheEntry);

      // Guardar en localStorage (solo datos serializables)
      this.saveToStorage();

      return true;
    } catch (error) {
      console.error("Error al guardar en caché:", error);
      return false;
    }
  }

  /**
   * OBTENER DATO DEL CACHÉ
   * Recupera un dato del caché si existe y no ha expirado
   *
   * @param {string} key - Clave del dato a recuperar
   * @returns {any|null} Valor almacenado o null si no existe/expirado
   */
  get(key) {
    try {
      const entry = this.memoryCache.get(key);

      if (!entry) {
        return null;
      }

      // Verificar si ha expirado
      if (Date.now() > entry.expiresAt) {
        this.delete(key);
        return null;
      }

      // Actualizar estadísticas de acceso
      entry.accessCount++;
      entry.lastAccessed = Date.now();

      return entry.value;
    } catch (error) {
      console.error("Error al obtener del caché:", error);
      return null;
    }
  }

  /**
   * VERIFICAR SI EXISTE UNA CLAVE EN CACHÉ
   * Verifica si una clave existe y no ha expirado
   *
   * @param {string} key - Clave a verificar
   * @returns {boolean} True si existe y no ha expirado
   */
  has(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return false;
    }

    // Verificar expiración
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * ELIMINAR DATO DEL CACHÉ
   * Remueve una entrada específica del caché
   *
   * @param {string} key - Clave del dato a eliminar
   * @returns {boolean} True si se eliminó correctamente
   */
  delete(key) {
    try {
      const deleted = this.memoryCache.delete(key);
      if (deleted) {
        this.saveToStorage();
      }
      return deleted;
    } catch (error) {
      console.error("Error al eliminar del caché:", error);
      return false;
    }
  }

  /**
   * LIMPIAR TODO EL CACHÉ
   * Elimina todas las entradas del caché
   */
  clear() {
    try {
      this.memoryCache.clear();
      this.saveToStorage();
    } catch (error) {
      console.error("Error al limpiar caché:", error);
    }
  }

  /**
   * OBTENER ESTADÍSTICAS DEL CACHÉ
   * Retorna información sobre el estado del caché
   *
   * @returns {Object} Estadísticas del caché
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalAccessCount = 0;

    // Contar entradas expiradas y acceso total
    this.memoryCache.forEach((entry) => {
      if (now > entry.expiresAt) {
        expiredCount++;
      }
      totalAccessCount += entry.accessCount;
    });

    return {
      size: this.memoryCache.size,
      maxSize: this.config.maxSize,
      expiredCount,
      totalAccessCount,
      memoryUsage: this.getMemoryUsage(),
      hitRate: this.calculateHitRate(),
    };
  }

  /**
   * LIMPIEZA AUTOMÁTICA
   * Elimina entradas expiradas y mantiene el tamaño del caché
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    // Identificar entradas expiradas
    this.memoryCache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    // Eliminar entradas expiradas
    keysToDelete.forEach((key) => {
      this.delete(key);
    });

    // Si aún excede el tamaño máximo, eliminar las más antiguas
    if (this.memoryCache.size > this.config.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * ELIMINAR ENTRADAS MÁS ANTIGUAS
   * Elimina las entradas menos accedidas cuando se excede el límite
   */
  evictOldest() {
    const entries = Array.from(this.memoryCache.entries());

    // Ordenar por último acceso (más antiguas primero)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Eliminar las entradas más antiguas hasta estar bajo el límite
    const toDelete = entries.slice(
      0,
      this.memoryCache.size - this.config.maxSize + 1
    );
    toDelete.forEach(([key]) => {
      this.delete(key);
    });
  }

  /**
   * GUARDAR EN LOCALSTORAGE
   * Persiste datos serializables en localStorage
   */
  saveToStorage() {
    try {
      const serializableData = {};

      this.memoryCache.forEach((entry, key) => {
        // Solo guardar datos que se pueden serializar
        if (this.isSerializable(entry.value)) {
          serializableData[key] = {
            value: entry.value,
            timestamp: entry.timestamp,
            ttl: entry.ttl,
            expiresAt: entry.expiresAt,
            accessCount: entry.accessCount,
            lastAccessed: entry.lastAccessed,
          };
        }
      });

      localStorage.setItem("app_cache", JSON.stringify(serializableData));
    } catch (error) {
      console.error("Error al guardar caché en localStorage:", error);
    }
  }

  /**
   * CARGAR DESDE LOCALSTORAGE
   * Recupera datos del localStorage al iniciar la aplicación
   */
  loadFromStorage() {
    try {
      const cachedData = localStorage.getItem("app_cache");
      if (cachedData) {
        const data = JSON.parse(cachedData);
        const now = Date.now();

        // Solo cargar entradas que no han expirado
        Object.entries(data).forEach(([key, entry]) => {
          if (now < entry.expiresAt) {
            this.memoryCache.set(key, entry);
          }
        });
      }
    } catch (error) {
      console.error("Error al cargar caché desde localStorage:", error);
      // Limpiar datos corruptos
      localStorage.removeItem("app_cache");
    }
  }

  /**
   * VERIFICAR SI UN VALOR ES SERIALIZABLE
   * Determina si un valor se puede guardar en localStorage
   *
   * @param {any} value - Valor a verificar
   * @returns {boolean} True si es serializable
   */
  isSerializable(value) {
    try {
      JSON.stringify(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * CALCULAR USO DE MEMORIA
   * Estima el uso de memoria del caché
   *
   * @returns {string} Uso de memoria en formato legible
   */
  getMemoryUsage() {
    try {
      const data = JSON.stringify(Array.from(this.memoryCache.entries()));
      const bytes = new Blob([data]).size;

      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch {
      return "N/A";
    }
  }

  /**
   * CALCULAR TASA DE ACIERTO
   * Calcula la tasa de acierto del caché
   *
   * @returns {number} Tasa de acierto (0-1)
   */
  calculateHitRate() {
    // Esta es una implementación simplificada
    // En una aplicación real, necesitarías trackear hits y misses
    return 0.8; // Valor estimado
  }

  /**
   * CONFIGURAR EL CACHÉ
   * Permite cambiar la configuración del caché
   *
   * @param {Object} config - Nueva configuración
   */
  configure(config) {
    this.config = { ...this.config, ...config };
  }
}

// Crear instancia global del caché
const cacheManager = new CacheManager();

/**
 * FUNCIONES DE CONVENIENCIA PARA CACHÉ
 * Funciones simplificadas para uso común
 */

/**
 * Guardar dato en caché con clave simple
 * @param {string} key - Clave del dato
 * @param {any} value - Valor a guardar
 * @param {number} ttl - Tiempo de vida (opcional)
 */
export const cacheSet = (key, value, ttl) => cacheManager.set(key, value, ttl);

/**
 * Obtener dato del caché
 * @param {string} key - Clave del dato
 * @returns {any} Valor almacenado o null
 */
export const cacheGet = (key) => cacheManager.get(key);

/**
 * Verificar si existe dato en caché
 * @param {string} key - Clave del dato
 * @returns {boolean} True si existe
 */
export const cacheHas = (key) => cacheManager.has(key);

/**
 * Eliminar dato del caché
 * @param {string} key - Clave del dato
 * @returns {boolean} True si se eliminó
 */
export const cacheDelete = (key) => cacheManager.delete(key);

/**
 * Limpiar todo el caché
 */
export const cacheClear = () => cacheManager.clear();

/**
 * Obtener estadísticas del caché
 * @returns {Object} Estadísticas
 */
export const cacheStats = () => cacheManager.getStats();

/**
 * CACHÉ CON FUNCIÓN DE FALLBACK
 * Intenta obtener del caché, si no existe ejecuta la función y guarda el resultado
 *
 * @param {string} key - Clave del caché
 * @param {Function} fetchFunction - Función que obtiene los datos
 * @param {number} ttl - Tiempo de vida (opcional)
 * @returns {Promise<any>} Datos del caché o de la función
 */
export async function cacheWithFallback(key, fetchFunction, ttl) {
  // Intentar obtener del caché
  const cached = cacheGet(key);
  if (cached !== null) {
    return cached;
  }

  // Si no está en caché, ejecutar la función
  try {
    const data = await fetchFunction();
    cacheSet(key, data, ttl);
    return data;
  } catch (error) {
    console.error("Error en cacheWithFallback:", error);
    throw error;
  }
}

/**
 * CACHÉ PARA DATOS DE SESIONES
 * Funciones específicas para el caché de sesiones de golf
 */

/**
 * Guardar sesión en caché
 * @param {string} sessionId - ID de la sesión
 * @param {Object} sessionData - Datos de la sesión
 */
export const cacheSession = (sessionId, sessionData) => {
  const key = `session_${sessionId}`;
  // Las sesiones se guardan por 1 hora
  return cacheSet(key, sessionData, 60 * 60 * 1000);
};

/**
 * Obtener sesión del caché
 * @param {string} sessionId - ID de la sesión
 * @returns {Object|null} Datos de la sesión
 */
export const getCachedSession = (sessionId) => {
  const key = `session_${sessionId}`;
  return cacheGet(key);
};

/**
 * CACHÉ PARA DATOS DE USUARIO
 * Funciones específicas para el caché de datos de usuario
 */

/**
 * Guardar datos de usuario en caché
 * @param {string} userId - ID del usuario
 * @param {Object} userData - Datos del usuario
 */
export const cacheUserData = (userId, userData) => {
  const key = `user_${userId}`;
  // Los datos de usuario se guardan por 30 minutos
  return cacheSet(key, userData, 30 * 60 * 1000);
};

/**
 * Obtener datos de usuario del caché
 * @param {string} userId - ID del usuario
 * @returns {Object|null} Datos del usuario
 */
export const getCachedUserData = (userId) => {
  const key = `user_${userId}`;
  return cacheGet(key);
};

// Exportar la instancia principal
export default cacheManager;
