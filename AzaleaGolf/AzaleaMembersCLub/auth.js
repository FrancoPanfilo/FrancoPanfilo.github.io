/**
 * SISTEMA DE AUTENTICACIÓN
 *
 * Este módulo maneja toda la lógica de autenticación de la aplicación:
 * - Registro de usuarios
 * - Inicio de sesión
 * - Cierre de sesión
 * - Verificación de estado de autenticación
 * - Redirección automática
 * - Persistencia de sesión
 */

// Importaciones de Firebase
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// Importaciones de Firestore
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Importaciones locales
import { auth, db } from "./firebase.js";

/**
 * FUNCIONES SIMPLIFICADAS DE MANEJO DE ERRORES
 * Versiones simplificadas para evitar dependencias circulares
 */

// Función simplificada para mostrar notificaciones
function showNotification(message, type = "error") {
  console.log(`[${type.toUpperCase()}] ${message}`);

  // Crear notificación simple si es posible
  if (typeof window !== "undefined") {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${
        type === "error"
          ? "#e74c3c"
          : type === "success"
          ? "#27ae60"
          : "#f39c12"
      };
      color: white;
      padding: 16px;
      border-radius: 8px;
      z-index: 10000;
      max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
}

// Función simplificada para manejar errores de Firebase Auth
function handleFirebaseAuthError(error, context = "auth") {
  let message = "Error de autenticación";

  switch (error.code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      message = "Credenciales incorrectas. Verifica tu email y contraseña.";
      break;
    case "auth/email-already-in-use":
      message = "Este correo electrónico ya está registrado.";
      break;
    case "auth/weak-password":
      message = "La contraseña debe tener al menos 6 caracteres.";
      break;
    case "auth/invalid-email":
      message = "El correo electrónico no es válido.";
      break;
    case "auth/too-many-requests":
      message = "Demasiados intentos fallidos. Intenta más tarde.";
      break;
    case "auth/user-disabled":
      message = "Esta cuenta ha sido deshabilitada.";
      break;
    default:
      message = error.message || "Error de autenticación";
  }

  console.error(`[${context.toUpperCase()}] ${message}`, error);
  showNotification(message, "error");
  return message;
}

// Función simplificada para manejar errores de Firestore
function handleFirestoreError(error, context = "firestore") {
  let message = "Error de base de datos";

  switch (error.code) {
    case "permission-denied":
      message = "No tienes permisos para realizar esta acción.";
      break;
    case "unavailable":
      message = "Servicio no disponible. Intenta más tarde.";
      break;
    default:
      message = error.message || "Error de base de datos";
  }

  console.error(`[${context.toUpperCase()}] ${message}`, error);
  showNotification(message, "error");
  return message;
}

/**
 * FUNCIONES SIMPLIFICADAS DE CACHÉ
 * Versiones simplificadas para evitar dependencias
 */

// Función simplificada para guardar en caché
function cacheUserData(userId, userData) {
  try {
    localStorage.setItem(
      `user_${userId}`,
      JSON.stringify({
        data: userData,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.warn("Error al guardar en caché:", error);
  }
}

// Función simplificada para obtener del caché
function getCachedUserData(userId) {
  try {
    const cached = localStorage.getItem(`user_${userId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      const now = Date.now();
      const cacheAge = 30 * 60 * 1000; // 30 minutos

      if (now - parsed.timestamp < cacheAge) {
        return parsed.data;
      } else {
        localStorage.removeItem(`user_${userId}`);
      }
    }
  } catch (error) {
    console.warn("Error al obtener del caché:", error);
  }
  return null;
}

/**
 * FUNCIONES SIMPLIFICADAS DE VALIDACIÓN
 * Versiones simplificadas para evitar dependencias
 */

// Validación simple de email
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  return {
    isValid,
    message: isValid ? "" : "El correo electrónico no es válido",
  };
}

// Validación simple de contraseña
function validatePassword(password) {
  const isValid = password && password.length >= 6;
  return {
    isValid,
    message: isValid ? "" : "La contraseña debe tener al menos 6 caracteres",
  };
}

// Validación simple de confirmación de contraseña
function validatePasswordConfirmation(password, confirmPassword) {
  const isValid = password === confirmPassword;
  return {
    isValid,
    message: isValid ? "" : "Las contraseñas no coinciden",
  };
}

// Validación simple de nombre
function validateName(name) {
  const isValid = name && name.trim().length >= 2 && name.trim().length <= 50;
  return {
    isValid,
    message: isValid ? "" : "El nombre debe tener entre 2 y 50 caracteres",
  };
}

/**
 * VALIDACIÓN DE FORMULARIOS
 * Funciones para validar formularios en tiempo real
 */

// Función simplificada para validar formularios
function validateForm(formData, rules) {
  const errors = [];

  for (const [field, value] of Object.entries(formData)) {
    const rule = rules[field];
    if (!rule) continue;

    // Validación requerida
    if (rule.required && (!value || value.trim().length === 0)) {
      errors.push(rule.requiredMessage || `${field} es requerido`);
      continue;
    }

    // Si no es requerido y está vacío, continuar
    if (!value || value.trim().length === 0) continue;

    // Validación de longitud mínima
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${field} debe tener al menos ${rule.minLength} caracteres`);
    }

    // Validación de longitud máxima
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${field} no puede exceder ${rule.maxLength} caracteres`);
    }

    // Validación de patrón
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(
        rule.patternMessage || `${field} no tiene el formato correcto`
      );
    }

    // Validación de tipo email
    if (rule.type === "email" && !validateEmail(value).isValid) {
      errors.push("El correo electrónico no es válido");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Función simplificada para validación en tiempo real
function setupRealTimeValidation(form, rules) {
  if (!form) return;

  // Obtener todos los campos del formulario
  const fields = form.querySelectorAll("input, select, textarea");

  fields.forEach((field) => {
    const fieldName = field.name || field.id;
    const rule = rules[fieldName];

    if (!rule) return;

    // Validar al perder el foco
    field.addEventListener("blur", () => {
      validateField(field, rule);
    });

    // Validar al escribir (con debounce)
    let timeout;
    field.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        validateField(field, rule);
      }, 300);
    });
  });
}

// Función para validar un campo individual
function validateField(field, rule) {
  const value = field.value;
  const errorElement =
    field.parentNode.querySelector(".error-message") ||
    field.parentNode.querySelector("[data-error]");

  // Limpiar error anterior
  if (errorElement) {
    errorElement.textContent = "";
    errorElement.style.display = "none";
  }

  // Validar campo
  let isValid = true;
  let errorMessage = "";

  // Validación requerida
  if (rule.required && (!value || value.trim().length === 0)) {
    isValid = false;
    errorMessage = rule.requiredMessage || "Este campo es requerido";
  }
  // Validación de longitud mínima
  else if (
    rule.minLength &&
    value.length > 0 &&
    value.length < rule.minLength
  ) {
    isValid = false;
    errorMessage = `Debe tener al menos ${rule.minLength} caracteres`;
  }
  // Validación de longitud máxima
  else if (rule.maxLength && value.length > rule.maxLength) {
    isValid = false;
    errorMessage = `No puede exceder ${rule.maxLength} caracteres`;
  }
  // Validación de patrón
  else if (rule.pattern && value.length > 0 && !rule.pattern.test(value)) {
    isValid = false;
    errorMessage = rule.patternMessage || "Formato incorrecto";
  }
  // Validación de email
  else if (
    rule.type === "email" &&
    value.length > 0 &&
    !validateEmail(value).isValid
  ) {
    isValid = false;
    errorMessage = "El correo electrónico no es válido";
  }

  // Mostrar error si existe
  if (!isValid && errorMessage) {
    if (errorElement) {
      errorElement.textContent = errorMessage;
      errorElement.style.display = "block";
    } else {
      // Crear elemento de error si no existe
      const newErrorElement = document.createElement("div");
      newErrorElement.className = "error-message";
      newErrorElement.style.cssText =
        "color: red; font-size: 12px; margin-top: 4px;";
      newErrorElement.textContent = errorMessage;
      field.parentNode.appendChild(newErrorElement);
    }

    // Agregar clase de error al campo
    field.classList.add("error");
  } else {
    // Remover clase de error
    field.classList.remove("error");
  }

  return isValid;
}

/**
 * CONFIGURAR PERSISTENCIA DE SESIÓN
 * Configura Firebase para mantener la sesión activa entre recargas
 */
async function configurePersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log("✅ Persistencia de sesión configurada correctamente");
  } catch (error) {
    console.error("❌ Error al configurar persistencia:", error);
    handleFirebaseAuthError(error, "persistence");
  }
}

/**
 * VERIFICAR PÁGINA ACTUAL
 * Determina en qué página se encuentra el usuario
 */

// Función para verificar si estamos en la página de login
function isLoginPage() {
  return window.location.pathname.includes("login.html");
}

// Función para verificar si estamos en la página de registro
function isRegisterPage() {
  return window.location.pathname.includes("register.html");
}

// Función para verificar si estamos en la página de sesiones
function isSessionsPage() {
  return window.location.pathname.includes("Sesiones/index.html");
}

// Función para verificar si estamos en la página principal
function isHomePage() {
  return (
    window.location.pathname.includes("index.html") ||
    window.location.pathname === "/" ||
    window.location.pathname === ""
  );
}

/**
 * OBTENER DATOS DEL USUARIO ACTUAL
 * Recupera los datos del usuario desde Firestore o caché
 *
 * @param {string} uid - ID único del usuario
 * @returns {Promise<Object|null>} Datos del usuario o null si no existe
 */
async function getCurrentUserData(uid = null) {
  try {
    const user = uid || auth.currentUser;
    if (!user) {
      console.log("❌ No hay usuario autenticado");
      return null;
    }

    // Validar que el UID sea válido
    if (!user.uid || typeof user.uid !== "string" || user.uid.trim() === "") {
      console.error("❌ UID de usuario inválido:", user.uid);
      return null;
    }

    console.log("🔍 Buscando datos para usuario:", user.uid);

    // Intentar obtener del caché primero
    const cachedData = getCachedUserData(user.uid);
    if (cachedData) {
      console.log("📦 Datos de usuario obtenidos del caché");
      return cachedData;
    }

    // Si no está en caché, obtener de Firestore
    console.log("💾 Obteniendo datos de Firestore...");
    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Guardar en caché para futuras consultas
      cacheUserData(user.uid, userData);

      console.log("✅ Datos de usuario obtenidos de Firestore");
      return userData;
    } else {
      console.log("⚠️ No se encontró documento para el usuario:", user.uid);
      return null;
    }
  } catch (error) {
    console.error("❌ Error al obtener datos del usuario:", error);

    // Manejar errores específicos de Firestore
    if (error.code === "permission-denied") {
      console.error("❌ Permisos insuficientes para acceder a los datos");
    } else if (error.code === "unavailable") {
      console.error("❌ Servicio de Firestore no disponible");
    } else if (error.message && error.message.includes("indexOf")) {
      console.error("❌ Error en la ruta del documento - UID inválido");
    }

    handleFirestoreError(error, "getUserData");
    return null;
  }
}

/**
 * MANEJAR CAMBIOS DE ESTADO DE AUTENTICACIÓN
 * Escucha cambios en el estado de autenticación y redirige según corresponda
 */
function setupAuthStateListener() {
  onAuthStateChanged(auth, async (user) => {
    console.log(
      "🔄 Estado de autenticación cambiado:",
      user ? "Usuario autenticado" : "No autenticado"
    );

    if (user) {
      console.log("👤 Usuario autenticado:", user.email);

      // Obtener datos del usuario
      const userData = await getCurrentUserData(user.uid);

      // Actualizar interfaz según la página
      updateUIForAuthenticatedUser(user, userData);

      // Redirigir si está en páginas de autenticación
      if (isLoginPage() || isRegisterPage()) {
        console.log("🔄 Redirigiendo usuario autenticado a sesiones");
        window.location.href = "Sesiones/index.html";
      }
    } else {
      console.log("🚪 No hay usuario autenticado");

      // Actualizar interfaz para usuario no autenticado
      updateUIForUnauthenticatedUser();

      // Redirigir si está en páginas protegidas
      if (isSessionsPage()) {
        console.log("🔄 Redirigiendo usuario no autenticado a login");
        window.location.href = "../login.html";
      }
    }
  });
}

/**
 * ACTUALIZAR INTERFAZ PARA USUARIO AUTENTICADO
 * Modifica la interfaz cuando hay un usuario logueado
 *
 * @param {Object} user - Objeto de usuario de Firebase
 * @param {Object} userData - Datos del usuario desde Firestore
 */
function updateUIForAuthenticatedUser(user, userData) {
  // Buscar elementos de la interfaz
  const authButton = document.querySelector(".auth-button");
  const guestContent = document.getElementById("guestContent");
  const userContent = document.getElementById("userContent");

  if (!authButton) return;

  // Obtener nombre completo del usuario
  const fullName = userData
    ? `${userData.nombre} ${userData.apellido}`
    : user.email;

  // Crear o actualizar información del usuario
  let userInfo = document.querySelector(".user-info");
  if (!userInfo) {
    userInfo = document.createElement("span");
    userInfo.className = "user-info";
    authButton.parentElement.insertBefore(userInfo, authButton);
  }
  userInfo.textContent = `Bienvenido, ${fullName}`;

  // Actualizar botón de autenticación
  authButton.textContent = "Cerrar Sesión";
  authButton.href = "#";
  authButton.classList.add("logout");

  // Configurar evento de cierre de sesión
  authButton.onclick = async (e) => {
    e.preventDefault();
    await handleLogout();
  };

  // Mostrar/ocultar contenido según la página
  if (guestContent && userContent) {
    guestContent.style.display = "none";
    userContent.style.display = "block";
  }

  // Cargar resumen de rendimiento si está en la página principal
  if (isHomePage() && userData) {
    loadPerformanceSummary(userData);
  }
}

/**
 * ACTUALIZAR INTERFAZ PARA USUARIO NO AUTENTICADO
 * Modifica la interfaz cuando no hay usuario logueado
 */
function updateUIForUnauthenticatedUser() {
  const authButton = document.querySelector(".auth-button");
  const guestContent = document.getElementById("guestContent");
  const userContent = document.getElementById("userContent");

  if (!authButton) return;

  // Remover información del usuario
  const userInfo = document.querySelector(".user-info");
  if (userInfo) {
    userInfo.remove();
  }

  // Actualizar botón de autenticación
  authButton.textContent = "Iniciar Sesión";
  authButton.href = "login.html";
  authButton.classList.remove("logout");
  authButton.onclick = null;

  // Mostrar/ocultar contenido según la página
  if (guestContent && userContent) {
    guestContent.style.display = "block";
    userContent.style.display = "none";
  }
}

/**
 * CARGAR RESUMEN DE RENDIMIENTO
 * Carga y muestra estadísticas del usuario en la página principal
 *
 * @param {Object} userData - Datos del usuario
 */
function loadPerformanceSummary(userData) {
  try {
    const sessions = userData.Sesiones || [];
    const totalSessions = sessions.length;
    const totalShots = sessions.reduce(
      (sum, session) => sum + (session.stats?.shotCount || 0),
      0
    );
    const lastSession =
      sessions.length > 0
        ? new Date(sessions[0].fecha).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "No hay sesiones";

    // Actualizar elementos en el DOM
    const totalSessionsElement = document.getElementById("totalSessions");
    const totalShotsElement = document.getElementById("totalShots");
    const lastSessionElement = document.getElementById("lastSession");

    if (totalSessionsElement) totalSessionsElement.textContent = totalSessions;
    if (totalShotsElement) totalShotsElement.textContent = totalShots;
    if (lastSessionElement) lastSessionElement.textContent = lastSession;
  } catch (error) {
    console.error("❌ Error al cargar resumen de rendimiento:", error);
  }
}

/**
 * MANEJAR FORMULARIO DE LOGIN
 * Procesa el formulario de inicio de sesión
 */
function setupLoginForm() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  // Configurar validación en tiempo real
  const validationRules = {
    email: {
      required: true,
      type: "email",
      requiredMessage: "El correo electrónico es requerido",
    },
    password: {
      required: true,
      requiredMessage: "La contraseña es requerida",
    },
  };

  setupRealTimeValidation(loginForm, validationRules);

  // Manejar envío del formulario
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Mostrar indicador de carga
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = "Iniciando sesión...";
    submitButton.disabled = true;

    try {
      // Obtener datos del formulario
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const errorMessage = document.getElementById("errorMessage");

      // Validar formulario
      const formData = { email, password };
      const validation = validateForm(formData, validationRules);

      if (!validation.isValid) {
        throw new Error(validation.errors[0]);
      }

      // Limpiar mensajes de error anteriores
      errorMessage.textContent = "";
      errorMessage.style.color = "";

      // Intentar iniciar sesión
      await signInWithEmailAndPassword(auth, email, password);

      // Mostrar mensaje de éxito
      showNotification("¡Inicio de sesión exitoso!", "success");

      // La redirección se maneja automáticamente por onAuthStateChanged
    } catch (error) {
      console.error("❌ Error en el login:", error);

      // Manejar error específico de Firebase Auth
      const errorMessage = handleFirebaseAuthError(error, "login");

      // Mostrar mensaje de error en el formulario
      const errorElement = document.getElementById("errorMessage");
      if (errorElement) {
        errorElement.style.color = "red";
        errorElement.textContent = errorMessage;
      }
    } finally {
      // Restaurar botón
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  });
}

/**
 * MANEJAR FORMULARIO DE REGISTRO
 * Procesa el formulario de registro de usuarios
 */
function setupRegisterForm() {
  const registerForm = document.getElementById("registerForm");
  if (!registerForm) return;

  // Configurar validación en tiempo real
  const validationRules = {
    nombre: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      requiredMessage: "El nombre es requerido",
      patternMessage: "El nombre solo puede contener letras",
    },
    apellido: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      requiredMessage: "El apellido es requerido",
      patternMessage: "El apellido solo puede contener letras",
    },
    email: {
      required: true,
      type: "email",
      requiredMessage: "El correo electrónico es requerido",
    },
    password: {
      required: true,
      minLength: 6,
      requiredMessage: "La contraseña es requerida",
    },
    confirmPassword: {
      required: true,
      requiredMessage: "Confirma tu contraseña",
    },
  };

  setupRealTimeValidation(registerForm, validationRules);

  // Manejar envío del formulario
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Mostrar indicador de carga
    const submitButton = registerForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = "Creando cuenta...";
    submitButton.disabled = true;

    try {
      // Obtener datos del formulario
      const nombre = document.getElementById("nombre").value.trim();
      const apellido = document.getElementById("apellido").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      const errorMessage = document.getElementById("errorMessage");

      // Validar formulario
      const formData = { nombre, apellido, email, password, confirmPassword };
      const validation = validateForm(formData, validationRules);

      if (!validation.isValid) {
        throw new Error(validation.errors[0]);
      }

      // Validar confirmación de contraseña
      const passwordValidation = validatePasswordConfirmation(
        password,
        confirmPassword
      );
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.message);
      }

      // Limpiar mensajes de error anteriores
      errorMessage.textContent = "";
      errorMessage.style.color = "";

      console.log("🚀 Iniciando registro de usuario...");

      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      console.log("✅ Usuario creado en Firebase Auth con UID:", user.uid);

      // Crear documento del usuario en Firestore
      const userData = {
        nombre,
        apellido,
        email,
        fechaRegistro: new Date().toISOString(),
        Sesiones: [],
        ultimaActividad: new Date().toISOString(),
      };

      // Guardar en la colección Simulador usando el UID de Firebase Auth
      const userDocRef = doc(db, "Simulador", user.uid);
      await setDoc(userDocRef, userData);

      console.log(
        "✅ Documento creado en Firestore para el usuario:",
        user.uid
      );

      // Mostrar mensaje de éxito
      errorMessage.style.color = "green";
      errorMessage.textContent = "¡Registro exitoso! Redirigiendo...";

      showNotification("¡Cuenta creada exitosamente!", "success");

      // Esperar un momento para que el usuario vea el mensaje
      setTimeout(() => {
        // Redirigir a la página de sesiones
        window.location.href = "Sesiones/index.html";
      }, 2000);
    } catch (error) {
      console.error("❌ Error en el registro:", error);

      // Manejar error específico de Firebase Auth
      const errorMessage = handleFirebaseAuthError(error, "register");

      // Mostrar mensaje de error en el formulario
      const errorElement = document.getElementById("errorMessage");
      if (errorElement) {
        errorElement.style.color = "red";
        errorElement.textContent = errorMessage;
      }
    } finally {
      // Restaurar botón
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  });
}

/**
 * MANEJAR CIERRE DE SESIÓN
 * Procesa el cierre de sesión del usuario
 */
async function handleLogout() {
  try {
    // Mostrar indicador de carga
    const logoutButton = document.querySelector(".auth-button");
    const originalText = logoutButton.textContent;
    logoutButton.textContent = "Cerrando sesión...";
    logoutButton.disabled = true;

    // Cerrar sesión en Firebase
    await signOut(auth);

    // Mostrar notificación
    showNotification("Sesión cerrada exitosamente", "success");

    // La redirección se maneja automáticamente por onAuthStateChanged
  } catch (error) {
    console.error("❌ Error al cerrar sesión:", error);
    handleFirebaseAuthError(error, "logout");
  } finally {
    // Restaurar botón
    const logoutButton = document.querySelector(".auth-button");
    if (logoutButton) {
      logoutButton.textContent = "Cerrar Sesión";
      logoutButton.disabled = false;
    }
  }
}

/**
 * CONFIGURAR BOTÓN DE CIERRE DE SESIÓN
 * Configura el botón de cerrar sesión en páginas protegidas
 */
function setupLogoutButton() {
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", async (e) => {
      e.preventDefault();
      await handleLogout();
    });
  }
}

/**
 * INICIALIZAR SISTEMA DE AUTENTICACIÓN
 * Configura todos los componentes del sistema de autenticación
 */
async function initializeAuth() {
  try {
    console.log("🔧 Inicializando sistema de autenticación...");

    // Configurar persistencia
    await configurePersistence();

    // Configurar listener de estado de autenticación
    setupAuthStateListener();

    // Configurar formularios según la página
    if (isLoginPage()) {
      setupLoginForm();
    } else if (isRegisterPage()) {
      setupRegisterForm();
    } else if (isSessionsPage()) {
      setupLogoutButton();
    }

    console.log("✅ Sistema de autenticación inicializado correctamente");
  } catch (error) {
    console.error("❌ Error al inicializar sistema de autenticación:", error);
    // Assuming handleError is defined elsewhere or will be added.
    // For now, just log the error.
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAuth);
} else {
  initializeAuth();
}

// Exportar funciones para uso en otros módulos
export {
  getCurrentUserData,
  handleLogout,
  isLoginPage,
  isRegisterPage,
  isSessionsPage,
  isHomePage,
  auth, // Exportar auth para uso en otros módulos
};
