/**
 * CONFIGURACIÓN DE FIREBASE
 *
 * Este archivo contiene la configuración de Firebase para la aplicación.
 * IMPORTANTE: En producción, estas credenciales deben estar en variables de entorno.
 *
 * Para mayor seguridad, considera usar:
 * - Variables de entorno (.env) con un bundler como Webpack o Vite
 * - Firebase Functions para operaciones sensibles
 * - Reglas de seguridad estrictas en Firestore
 */

// Configuración de Firebase - En producción, usar variables de entorno
// Para usar variables de entorno, necesitas un bundler como Webpack o Vite
// y configurar el archivo .env en la raíz del proyecto
export const firebaseConfig = {
  // Clave de API de Firebase (identifica tu proyecto)
  apiKey: "AIzaSyCaoKajIMiN3Y8AtPz5X2brHm0YOsFqiuo",

  // Dominio de autenticación de Firebase
  authDomain: "azalea-92a39.firebaseapp.com",

  // ID del proyecto de Firebase
  projectId: "azalea-92a39",

  // Bucket de almacenamiento de Firebase
  storageBucket: "azalea-92a39.appspot.com",

  // ID del remitente de mensajes
  messagingSenderId: "564234531814",

  // ID de la aplicación de Firebase
  appId: "1:564234531814:web:ba8f9c434cd576b01e5c27",

  // ID de medición de Google Analytics
  measurementId: "G-MX1L41XYVE",
};

/**
 * CONFIGURACIÓN DE LA APLICACIÓN
 * Configuraciones generales de la aplicación
 */
export const appConfig = {
  // Nombre de la aplicación
  appName: "Azalea Golf Simulator",

  // Versión de la aplicación
  version: "1.0.0",

  // Configuración de paginación
  pagination: {
    sessionsPerPage: 10, // Número de sesiones por página
    shotsPerPage: 50, // Número de tiros por página
  },

  // Configuración de exportación
  export: {
    maxShotsPerExport: 1000, // Máximo número de tiros para exportar
    supportedFormats: ["csv", "pdf"], // Formatos soportados
  },

  // Configuración de caché
  cache: {
    sessionTimeout: 30 * 60 * 1000, // 30 minutos en milisegundos
    maxCacheSize: 100, // Máximo número de elementos en caché
  },
};

/**
 * MENSAJES DE ERROR
 * Mensajes centralizados para errores comunes
 */
export const errorMessages = {
  // Errores de autenticación
  auth: {
    userNotFound: "Usuario no encontrado. Verifica tu correo electrónico.",
    wrongPassword: "Contraseña incorrecta. Intenta nuevamente.",
    emailAlreadyInUse: "Este correo electrónico ya está registrado.",
    weakPassword: "La contraseña debe tener al menos 6 caracteres.",
    invalidEmail: "El correo electrónico no es válido.",
    networkError: "Error de conexión. Verifica tu internet.",
  },

  // Errores de datos
  data: {
    loadError: "Error al cargar los datos. Intenta recargar la página.",
    saveError: "Error al guardar los datos. Intenta nuevamente.",
    deleteError: "Error al eliminar los datos. Intenta nuevamente.",
    invalidData: "Los datos proporcionados no son válidos.",
  },

  // Errores de exportación
  export: {
    pdfError: "Error al generar el PDF. Intenta nuevamente.",
    csvError: "Error al generar el CSV. Intenta nuevamente.",
    tooManyShots: "Demasiados tiros seleccionados para exportar.",
  },
};

/**
 * VALIDACIONES
 * Reglas de validación para formularios y datos
 */
export const validations = {
  // Validación de email
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Ingresa un correo electrónico válido",
  },

  // Validación de contraseña
  password: {
    minLength: 6,
    message: "La contraseña debe tener al menos 6 caracteres",
  },

  // Validación de nombre
  name: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
    message: "El nombre debe tener entre 2 y 50 caracteres, solo letras",
  },
};

/**
 * INSTRUCCIONES PARA USAR VARIABLES DE ENTORNO
 *
 * Para usar variables de entorno en producción:
 *
 * 1. Instalar un bundler como Webpack o Vite:
 *    npm install --save-dev webpack webpack-cli dotenv-webpack
 *
 * 2. Crear archivo .env en la raíz del proyecto:
 *    FIREBASE_API_KEY=tu_api_key_aqui
 *    FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
 *    FIREBASE_PROJECT_ID=tu_proyecto
 *    FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
 *    FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
 *    FIREBASE_APP_ID=tu_app_id
 *    FIREBASE_MEASUREMENT_ID=tu_measurement_id
 *
 * 3. Configurar webpack.config.js:
 *    const Dotenv = require('dotenv-webpack');
 *
 *    module.exports = {
 *      plugins: [
 *        new Dotenv()
 *      ]
 *    };
 *
 * 4. Modificar firebaseConfig para usar process.env:
 *    apiKey: process.env.FIREBASE_API_KEY,
 *    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
 *    // ... etc
 *
 * 5. Agregar .env al .gitignore para no subir credenciales
 */
