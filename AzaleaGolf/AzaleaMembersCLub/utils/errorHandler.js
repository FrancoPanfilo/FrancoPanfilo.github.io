/**
 * MANEJADOR DE ERRORES CENTRALIZADO
 *
 * Este módulo proporciona un sistema centralizado para manejar errores
 * en toda la aplicación. Incluye:
 * - Logging de errores
 * - Mostrar mensajes de error al usuario
 * - Manejo de errores de Firebase
 * - Errores de validación
 * - Errores de red
 */

import { errorMessages } from "../config.js";

/**
 * CLASE PRINCIPAL DE MANEJO DE ERRORES
 * Gestiona todos los errores de la aplicación de forma consistente
 */
class ErrorHandler {
  constructor() {
    // Configuración del manejador de errores
    this.config = {
      showNotifications: true, // Mostrar notificaciones al usuario
      logToConsole: true, // Log en consola para desarrollo
      logToServer: false, // Log en servidor (para producción)
    };

    // Inicializar el manejador
    this.init();
  }

  /**
   * INICIALIZAR EL MANEJADOR DE ERRORES
   * Configura los listeners globales para capturar errores no manejados
   */
  init() {
    // Capturar errores no manejados de JavaScript
    window.addEventListener("error", (event) => {
      this.handleError(event.error || event.message, "unhandled");
    });

    // Capturar promesas rechazadas no manejadas
    window.addEventListener("unhandledrejection", (event) => {
      this.handleError(event.reason, "promise");
    });

    // Capturar errores de recursos (imágenes, scripts, etc.)
    window.addEventListener(
      "error",
      (event) => {
        if (event.target && event.target !== window) {
          this.handleError(
            `Error loading resource: ${event.target.src || event.target.href}`,
            "resource"
          );
        }
      },
      true
    );
  }

  /**
   * MANEJAR ERRORES DE FIREBASE AUTH
   * Convierte códigos de error de Firebase en mensajes legibles
   *
   * @param {Error} error - Error de Firebase
   * @param {string} context - Contexto donde ocurrió el error
   * @returns {string} Mensaje de error traducido
   */
  handleFirebaseAuthError(error, context = "auth") {
    const errorCode = error.code;
    let message = "Error desconocido";

    // Mapear códigos de error de Firebase a mensajes en español
    switch (errorCode) {
      case "auth/user-not-found":
        message = errorMessages.auth.userNotFound;
        break;
      case "auth/wrong-password":
        message = errorMessages.auth.wrongPassword;
        break;
      case "auth/email-already-in-use":
        message = errorMessages.auth.emailAlreadyInUse;
        break;
      case "auth/weak-password":
        message = errorMessages.auth.weakPassword;
        break;
      case "auth/invalid-email":
        message = errorMessages.auth.invalidEmail;
        break;
      case "auth/network-request-failed":
        message = errorMessages.auth.networkError;
        break;
      case "auth/too-many-requests":
        message = "Demasiados intentos. Intenta más tarde.";
        break;
      case "auth/user-disabled":
        message = "Esta cuenta ha sido deshabilitada.";
        break;
      default:
        message = `Error de autenticación: ${error.message}`;
    }

    this.handleError(message, context);
    return message;
  }

  /**
   * MANEJAR ERRORES DE FIRESTORE
   * Maneja errores específicos de la base de datos
   *
   * @param {Error} error - Error de Firestore
   * @param {string} context - Contexto donde ocurrió el error
   * @returns {string} Mensaje de error traducido
   */
  handleFirestoreError(error, context = "firestore") {
    let message = "Error de base de datos";

    switch (error.code) {
      case "permission-denied":
        message = "No tienes permisos para realizar esta acción.";
        break;
      case "unavailable":
        message = "Servicio no disponible. Intenta más tarde.";
        break;
      case "not-found":
        message = "Datos no encontrados.";
        break;
      case "already-exists":
        message = "Los datos ya existen.";
        break;
      case "resource-exhausted":
        message = "Límite de recursos alcanzado.";
        break;
      default:
        message = `Error de base de datos: ${error.message}`;
    }

    this.handleError(message, context);
    return message;
  }

  /**
   * MANEJAR ERRORES DE VALIDACIÓN
   * Maneja errores de validación de formularios y datos
   *
   * @param {string} field - Campo que falló la validación
   * @param {string} rule - Regla de validación que falló
   * @param {string} context - Contexto de la validación
   */
  handleValidationError(field, rule, context = "validation") {
    const message = `Error de validación en ${field}: ${rule}`;
    this.handleError(message, context);
  }

  /**
   * MANEJAR ERRORES DE RED
   * Maneja errores de conexión y red
   *
   * @param {Error} error - Error de red
   * @param {string} context - Contexto donde ocurrió el error
   */
  handleNetworkError(error, context = "network") {
    let message = "Error de conexión";

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      message =
        "No se pudo conectar al servidor. Verifica tu conexión a internet.";
    } else if (error.name === "TimeoutError") {
      message = "La operación tardó demasiado. Intenta nuevamente.";
    } else {
      message = `Error de red: ${error.message}`;
    }

    this.handleError(message, context);
  }

  /**
   * MANEJAR ERRORES DE EXPORTACIÓN
   * Maneja errores específicos de exportación de datos
   *
   * @param {Error} error - Error de exportación
   * @param {string} format - Formato de exportación (PDF, CSV)
   * @param {string} context - Contexto de la exportación
   */
  handleExportError(error, format, context = "export") {
    let message = "Error al exportar datos";

    switch (format.toLowerCase()) {
      case "pdf":
        message = errorMessages.export.pdfError;
        break;
      case "csv":
        message = errorMessages.export.csvError;
        break;
      default:
        message = `Error al exportar a ${format}: ${error.message}`;
    }

    this.handleError(message, context);
  }

  /**
   * MANEJAR ERRORES GENERALES
   * Método principal para manejar cualquier tipo de error
   *
   * @param {Error|string} error - Error a manejar
   * @param {string} context - Contexto donde ocurrió el error
   * @param {Object} options - Opciones adicionales
   */
  handleError(error, context = "general", options = {}) {
    // Obtener el mensaje de error
    const message = typeof error === "string" ? error : error.message;

    // Crear objeto de error estructurado
    const errorInfo = {
      message,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: error.stack || null,
      ...options,
    };

    // Log del error según configuración
    if (this.config.logToConsole) {
      console.error(`[${context.toUpperCase()}] ${message}`, errorInfo);
    }

    // Mostrar notificación al usuario si está habilitado
    if (this.config.showNotifications) {
      this.showNotification(message, context);
    }

    // Log en servidor (para producción)
    if (this.config.logToServer) {
      this.logToServer(errorInfo);
    }
  }

  /**
   * MOSTRAR NOTIFICACIÓN AL USUARIO
   * Crea y muestra una notificación visual del error
   *
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de notificación (error, warning, success)
   */
  showNotification(message, type = "error") {
    // Crear elemento de notificación
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;

    // Agregar estilos si no existen
    this.addNotificationStyles();

    // Agregar al DOM
    document.body.appendChild(notification);

    // Mostrar con animación
    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    // Configurar auto-eliminación
    const autoRemove = setTimeout(() => {
      this.removeNotification(notification);
    }, 5000);

    // Configurar botón de cerrar
    const closeButton = notification.querySelector(".notification-close");
    closeButton.addEventListener("click", () => {
      clearTimeout(autoRemove);
      this.removeNotification(notification);
    });
  }

  /**
   * ELIMINAR NOTIFICACIÓN
   * Remueve una notificación del DOM con animación
   *
   * @param {HTMLElement} notification - Elemento de notificación a eliminar
   */
  removeNotification(notification) {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  /**
   * AGREGAR ESTILOS DE NOTIFICACIÓN
   * Inyecta los estilos CSS necesarios para las notificaciones
   */
  addNotificationStyles() {
    if (document.getElementById("notification-styles")) {
      return; // Los estilos ya existen
    }

    const styles = document.createElement("style");
    styles.id = "notification-styles";
    styles.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 16px;
        min-width: 300px;
        max-width: 400px;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        border-left: 4px solid #e74c3c;
      }

      .notification.show {
        transform: translateX(0);
      }

      .notification-error {
        border-left-color: #e74c3c;
      }

      .notification-warning {
        border-left-color: #f39c12;
      }

      .notification-success {
        border-left-color: #27ae60;
      }

      .notification-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .notification-message {
        flex: 1;
        margin-right: 12px;
        line-height: 1.4;
        color: #333;
      }

      .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .notification-close:hover {
        color: #333;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * LOG EN SERVIDOR
   * Envía errores al servidor para análisis (para producción)
   *
   * @param {Object} errorInfo - Información del error
   */
  async logToServer(errorInfo) {
    try {
      // Aquí iría la lógica para enviar errores a un servicio de logging
      // como Sentry, LogRocket, o un endpoint personalizado
      console.log("Error logged to server:", errorInfo);
    } catch (error) {
      console.error("Failed to log error to server:", error);
    }
  }

  /**
   * CONFIGURAR EL MANEJADOR
   * Permite cambiar la configuración del manejador de errores
   *
   * @param {Object} config - Nueva configuración
   */
  configure(config) {
    this.config = { ...this.config, ...config };
  }
}

// Crear instancia global del manejador de errores
const errorHandler = new ErrorHandler();

// Exportar funciones de conveniencia
export const handleError = (error, context, options) =>
  errorHandler.handleError(error, context, options);
export const handleFirebaseAuthError = (error, context) =>
  errorHandler.handleFirebaseAuthError(error, context);
export const handleFirestoreError = (error, context) =>
  errorHandler.handleFirestoreError(error, context);
export const handleValidationError = (field, rule, context) =>
  errorHandler.handleValidationError(field, rule, context);
export const handleNetworkError = (error, context) =>
  errorHandler.handleNetworkError(error, context);
export const handleExportError = (error, format, context) =>
  errorHandler.handleExportError(error, format, context);
export const showNotification = (message, type) =>
  errorHandler.showNotification(message, type);
export const configureErrorHandler = (config) => errorHandler.configure(config);

// Exportar la instancia principal
export default errorHandler;
