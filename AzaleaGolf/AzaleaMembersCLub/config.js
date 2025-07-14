// Configuración de Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyCaoKajIMiN3Y8AtPz5X2brHm0YOsFqiuo",
  authDomain: "azalea-92a39.firebaseapp.com",
  projectId: "azalea-92a39",
  storageBucket: "azalea-92a39.appspot.com",
  messagingSenderId: "564234531814",
  appId: "1:564234531814:web:ba8f9c434cd576b01e5c27",
  measurementId: "G-MX1L41XYVE",
};

// Configuración de la aplicación
export const appConfig = {
  appName: "Azalea Golf Simulator",
  version: "1.0.0",
  pagination: {
    sessionsPerPage: 10,
    shotsPerPage: 50,
  },
  export: {
    maxShotsPerExport: 1000,
    supportedFormats: ["csv", "pdf"],
  },
  cache: {
    sessionTimeout: 30 * 60 * 1000,
    maxCacheSize: 100,
  },
};

// Mensajes de error
export const errorMessages = {
  auth: {
    userNotFound: "Usuario no encontrado. Verifica tu correo electrónico.",
    wrongPassword: "Contraseña incorrecta. Intenta nuevamente.",
    emailAlreadyInUse: "Este correo electrónico ya está registrado.",
    weakPassword: "La contraseña debe tener al menos 6 caracteres.",
    invalidEmail: "El correo electrónico no es válido.",
    networkError: "Error de conexión. Verifica tu internet.",
  },
  data: {
    loadError: "Error al cargar los datos. Intenta recargar la página.",
    saveError: "Error al guardar los datos. Intenta nuevamente.",
    deleteError: "Error al eliminar los datos. Intenta nuevamente.",
    invalidData: "Los datos proporcionados no son válidos.",
  },
  export: {
    pdfError: "Error al generar el PDF. Intenta nuevamente.",
    csvError: "Error al generar el CSV. Intenta nuevamente.",
    tooManyShots: "Demasiados tiros seleccionados para exportar.",
  },
};

// Validaciones
export const validations = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Ingresa un correo electrónico válido",
  },
  password: {
    minLength: 6,
    message: "La contraseña debe tener al menos 6 caracteres",
  },
  name: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
    message: "El nombre debe tener entre 2 y 50 caracteres, solo letras",
  },
};
