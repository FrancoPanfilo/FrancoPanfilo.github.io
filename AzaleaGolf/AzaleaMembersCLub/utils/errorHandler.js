import { errorMessages } from "../config.js";

class ErrorHandler {
  constructor() {
    this.config = {
      showNotifications: true,
      logToConsole: true,
      logToServer: false,
    };

    this.init();
  }

  init() {
    window.addEventListener("error", (event) => {
      this.handleError(event.error || event.message, "unhandled");
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.handleError(event.reason, "promise");
    });

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

  handleFirebaseAuthError(error, context = "auth") {
    const errorCode = error.code;
    let message = "Error desconocido";

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

  handleValidationError(field, rule, context = "validation") {
    const message = `Error de validación en ${field}: ${rule}`;
    this.handleError(message, context);
  }

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

  handleError(error, context = "general", options = {}) {
    const message = typeof error === "string" ? error : error.message;

    const errorInfo = {
      message,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: error.stack || null,
      ...options,
    };

    if (this.config.logToConsole) {
      }] ${message}`, errorInfo);
    }

    if (this.config.showNotifications) {
      this.showNotification(message, context);
    }

    if (this.config.logToServer) {
      this.logToServer(errorInfo);
    }
  }

  showNotification(message, type = "error") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;

    this.addNotificationStyles();

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    const autoRemove = setTimeout(() => {
      this.removeNotification(notification);
    }, 5000);

    const closeButton = notification.querySelector(".notification-close");
    closeButton.addEventListener("click", () => {
      clearTimeout(autoRemove);
      this.removeNotification(notification);
    });
  }

  removeNotification(notification) {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  addNotificationStyles() {
    if (document.getElementById("notification-styles")) {
      return;
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

  async logToServer(errorInfo) {
    try {
      
    } catch (error) {
      
    }
  }

  configure(config) {
    this.config = { ...this.config, ...config };
  }
}

const errorHandler = new ErrorHandler();

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

export default errorHandler;
