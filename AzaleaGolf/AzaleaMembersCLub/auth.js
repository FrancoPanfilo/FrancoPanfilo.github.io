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
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Importaciones locales
import { auth, db } from "./firebase.js";

// Función para mostrar notificaciones
function showNotification(message, type = "error") {
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

// Función para manejar errores de Firebase Auth
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

  showNotification(message, "error");
  return message;
}

// Función para manejar errores de Firestore
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

  showNotification(message, "error");
  return message;
}

// Función para guardar en caché
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
    // console.warn("Error al guardar en caché:", error);
  }
}

// Función para obtener del caché
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
    // console.warn("Error al obtener del caché:", error);
  }
  return null;
}

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

// Función para validar formularios
function validateForm(formData, rules) {
  const errors = [];

  for (const [field, value] of Object.entries(formData)) {
    const rule = rules[field];
    if (!rule) continue;

    if (rule.required && (!value || value.trim().length === 0)) {
      errors.push(rule.requiredMessage || `${field} es requerido`);
      continue;
    }

    if (!value || value.trim().length === 0) continue;

    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${field} debe tener al menos ${rule.minLength} caracteres`);
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${field} no puede exceder ${rule.maxLength} caracteres`);
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(
        rule.patternMessage || `${field} no tiene el formato correcto`
      );
    }

    if (rule.type === "email" && !validateEmail(value).isValid) {
      errors.push("El correo electrónico no es válido");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Función para validación en tiempo real
function setupRealTimeValidation(form, rules) {
  if (!form) return;

  const fields = form.querySelectorAll("input, select, textarea");

  fields.forEach((field) => {
    const fieldName = field.name || field.id;
    const rule = rules[fieldName];

    if (!rule) return;

    field.addEventListener("blur", () => {
      validateField(field, rule);
    });

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

  if (errorElement) {
    errorElement.textContent = "";
    errorElement.style.display = "none";
  }

  let isValid = true;
  let errorMessage = "";

  if (rule.required && (!value || value.trim().length === 0)) {
    isValid = false;
    errorMessage = rule.requiredMessage || "Este campo es requerido";
  } else if (
    rule.minLength &&
    value.length > 0 &&
    value.length < rule.minLength
  ) {
    isValid = false;
    errorMessage = `Debe tener al menos ${rule.minLength} caracteres`;
  } else if (rule.maxLength && value.length > rule.maxLength) {
    isValid = false;
    errorMessage = `No puede exceder ${rule.maxLength} caracteres`;
  } else if (rule.pattern && value.length > 0 && !rule.pattern.test(value)) {
    isValid = false;
    errorMessage = rule.patternMessage || "Formato incorrecto";
  } else if (
    rule.type === "email" &&
    value.length > 0 &&
    !validateEmail(value).isValid
  ) {
    isValid = false;
    errorMessage = "El correo electrónico no es válido";
  }

  if (!isValid && errorMessage) {
    if (errorElement) {
      errorElement.textContent = errorMessage;
      errorElement.style.display = "block";
    } else {
      const newErrorElement = document.createElement("div");
      newErrorElement.className = "error-message";
      newErrorElement.style.cssText =
        "color: red; font-size: 12px; margin-top: 4px;";
      newErrorElement.textContent = errorMessage;
      field.parentNode.appendChild(newErrorElement);
    }

    field.classList.add("error");
  } else {
    field.classList.remove("error");
  }

  return isValid;
}

// Configurar persistencia de sesión
async function configurePersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    // console.log("✅ Persistencia de sesión configurada correctamente");
  } catch (error) {
    // console.error("❌ Error al configurar persistencia:", error);
    handleFirebaseAuthError(error, "persistence");
  }
}

// Verificar página actual
function isLoginPage() {
  return window.location.pathname.includes("login.html");
}

function isRegisterPage() {
  return window.location.pathname.includes("register.html");
}

function isSessionsPage() {
  return window.location.pathname.includes("Sesiones/index.html");
}

function isHomePage() {
  return (
    window.location.pathname.includes("index.html") ||
    window.location.pathname === "/" ||
    window.location.pathname === ""
  );
}

// Obtener datos del usuario actual
async function getCurrentUserData(uid = null) {
  try {
    const user = uid || auth.currentUser;
    if (!user) {
      // console.log("❌ No hay usuario autenticado");
      return null;
    }

    if (!user.uid || typeof user.uid !== "string" || user.uid.trim() === "") {
      // console.error("❌ UID de usuario inválido:", user.uid);
      return null;
    }

    // console.log("🔍 Buscando datos para usuario:", user.uid);

    const cachedData = getCachedUserData(user.uid);
    if (cachedData) {
      // console.log("📦 Datos de usuario obtenidos del caché");
      return cachedData;
    }

    // console.log("💾 Obteniendo datos de Firestore...");
    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      cacheUserData(user.uid, userData);
      // console.log("✅ Datos de usuario obtenidos de Firestore");
      return userData;
    } else {
      // console.log("⚠️ No se encontró documento para el usuario:", user.uid);
      return null;
    }
  } catch (error) {
    // console.error("❌ Error al obtener datos del usuario:", error);
    handleFirestoreError(error, "getUserData");
    return null;
  }
}

// Manejar cambios de estado de autenticación
function setupAuthStateListener() {
  onAuthStateChanged(auth, async (user) => {
    // console.log(
    //   "🔄 Estado de autenticación cambiado:",
    //   user ? "Usuario autenticado" : "No autenticado"
    // );

    if (user) {
      // console.log("👤 Usuario autenticado:", user.email);
      // console.log("🔑 UID del usuario:", user.uid);
      const userData = await getCurrentUserData();
      updateUIForAuthenticatedUser(user, userData);

      if (isLoginPage() || isRegisterPage()) {
        // console.log("🔄 Redirigiendo usuario autenticado a sesiones");
        window.location.href = "Sesiones/index.html";
      }
    } else {
      // console.log("🚪 No hay usuario autenticado");
      updateUIForUnauthenticatedUser();

      if (isSessionsPage()) {
        // console.log("🔄 Redirigiendo usuario no autenticado a login");
        window.location.href = "../login.html";
      }
    }
  });
}

// Actualizar interfaz para usuario autenticado
function updateUIForAuthenticatedUser(user, userData) {
  const authButton = document.querySelector(".auth-button");
  const guestContent = document.getElementById("guestContent");
  const userContent = document.getElementById("userContent");

  if (!authButton) return;

  const fullName = userData
    ? `${userData.nombre} ${userData.apellido}`
    : user.email;

  let userInfo = document.querySelector(".user-info");
  if (!userInfo) {
    userInfo = document.createElement("span");
    userInfo.className = "user-info";
    authButton.parentElement.insertBefore(userInfo, authButton);
  }
  userInfo.textContent = `Bienvenido, ${fullName}`;

  authButton.textContent = "Cerrar Sesión";
  authButton.href = "#";
  authButton.classList.add("logout");

  authButton.onclick = async (e) => {
    e.preventDefault();
    await handleLogout();
  };

  if (guestContent && userContent) {
    guestContent.style.display = "none";
    userContent.style.display = "block";
  }

  if (isHomePage() && userData) {
    loadPerformanceSummary(userData);
  }
}

// Actualizar interfaz para usuario no autenticado
function updateUIForUnauthenticatedUser() {
  const authButton = document.querySelector(".auth-button");
  const guestContent = document.getElementById("guestContent");
  const userContent = document.getElementById("userContent");

  if (!authButton) return;

  const userInfo = document.querySelector(".user-info");
  if (userInfo) {
    userInfo.remove();
  }

  authButton.textContent = "Iniciar Sesión";
  authButton.href = "login.html";
  authButton.classList.remove("logout");
  authButton.onclick = null;

  if (guestContent && userContent) {
    guestContent.style.display = "block";
    userContent.style.display = "none";
  }
}

// Cargar resumen de rendimiento
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

    const totalSessionsElement = document.getElementById("totalSessions");
    const totalShotsElement = document.getElementById("totalShots");
    const lastSessionElement = document.getElementById("lastSession");

    if (totalSessionsElement) totalSessionsElement.textContent = totalSessions;
    if (totalShotsElement) totalShotsElement.textContent = totalShots;
    if (lastSessionElement) lastSessionElement.textContent = lastSession;
  } catch (error) {
    // console.error("❌ Error al cargar resumen de rendimiento:", error);
  }
}

// Manejar formulario de login
function setupLoginForm() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

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

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = "Iniciando sesión...";
    submitButton.disabled = true;

    try {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const errorMessage = document.getElementById("errorMessage");

      const formData = { email, password };
      const validation = validateForm(formData, validationRules);

      if (!validation.isValid) {
        throw new Error(validation.errors[0]);
      }

      errorMessage.textContent = "";
      errorMessage.style.color = "";

      await signInWithEmailAndPassword(auth, email, password);
      showNotification("¡Inicio de sesión exitoso!", "success");
    } catch (error) {
      // console.error("❌ Error en el login:", error);
      const errorMessage = handleFirebaseAuthError(error, "login");
      const errorElement = document.getElementById("errorMessage");
      if (errorElement) {
        errorElement.style.color = "red";
        errorElement.textContent = errorMessage;
      }
    } finally {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  });
}

// Manejar formulario de registro
function setupRegisterForm() {
  const registerForm = document.getElementById("registerForm");
  if (!registerForm) return;

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

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitButton = registerForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = "Creando cuenta...";
    submitButton.disabled = true;

    try {
      const nombre = document.getElementById("nombre").value.trim();
      const apellido = document.getElementById("apellido").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      const errorMessage = document.getElementById("errorMessage");

      const formData = { nombre, apellido, email, password, confirmPassword };
      const validation = validateForm(formData, validationRules);

      if (!validation.isValid) {
        throw new Error(validation.errors[0]);
      }

      const passwordValidation = validatePasswordConfirmation(
        password,
        confirmPassword
      );
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.message);
      }

      errorMessage.textContent = "";
      errorMessage.style.color = "";

      // === 1. Crear usuario en Firebase Auth ===
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // === 2. Guardar datos en Firestore con reintentos ===
      const userData = {
        nombre,
        apellido,
        email,
        fechaRegistro: new Date().toISOString(),
        Sesiones: [],
        ultimaActividad: new Date().toISOString(),
      };

      await saveUserWithRetry(user.uid, userData);

      // === 3. Verificar que el documento existe (polling) ===
      const userCreatedInDB = await waitForUserInFirestore(user.uid, 10, 800);

      const errorElement = document.getElementById("errorMessage");

      if (userCreatedInDB) {
        errorElement.style.color = "green";
        errorElement.textContent = "¡Registro exitoso! Redirigiendo...";
        showNotification("¡Cuenta creada exitosamente!", "success");

        setTimeout(() => {
          window.location.href = "Sesiones/index.html";
        }, 1500);
      } else {
        // FALLO PARCIAL: Auth OK, pero Firestore no sincronizó
        errorElement.style.color = "red";
        errorElement.textContent =
          "Cuenta creada, pero datos no guardados. Inicia sesión e intenta de nuevo.";
        showNotification(
          "Error: datos no guardados. Intenta iniciar sesión.",
          "error"
        );
      }
    } catch (error) {
      const errorMsg = handleFirebaseAuthError(error, "register");
      const errorElement = document.getElementById("errorMessage");
      if (errorElement) {
        errorElement.style.color = "red";
        errorElement.textContent = errorMsg;
      }
    } finally {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  });
}

// === FUNCIÓN AUXILIAR: Guardar con reintentos ===
async function saveUserWithRetry(uid, userData, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const userDocRef = doc(db, "Simulador", uid);
      await setDoc(userDocRef, userData);
      console.log(`Documento guardado en intento ${i + 1}`);
      return true;
    } catch (error) {
      console.warn(`Reintento ${i + 1}/${maxRetries} fallido:`, error.message);
      if (i === maxRetries - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// === FUNCIÓN AUXILIAR: Polling con backoff exponencial ===
async function waitForUserInFirestore(uid, maxAttempts = 10, baseDelay = 800) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const userDocRef = doc(db, "Simulador", uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        console.log(`Usuario encontrado en Firestore (intento #${attempt})`);
        return true;
      }

      const delay = baseDelay * Math.pow(1.5, attempt - 1);
      console.log(
        `Intento ${attempt}/${maxAttempts}: no encontrado. Esperando ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      console.warn(`Error en polling (intento ${attempt}):`, error.message);
      const delay = baseDelay * Math.pow(1.5, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error(
    "Usuario NO encontrado en Firestore después de todos los intentos"
  );
  return false;
}

// Manejar cierre de sesión
async function handleLogout() {
  try {
    const logoutButton = document.querySelector(".auth-button");
    const originalText = logoutButton.textContent;
    logoutButton.textContent = "Cerrando sesión...";
    logoutButton.disabled = true;

    await signOut(auth);
    showNotification("Sesión cerrada exitosamente", "success");
  } catch (error) {
    // console.error("❌ Error al cerrar sesión:", error);
    handleFirebaseAuthError(error, "logout");
  } finally {
    const logoutButton = document.querySelector(".auth-button");
    if (logoutButton) {
      logoutButton.textContent = "Cerrar Sesión";
      logoutButton.disabled = false;
    }
  }
}

// Configurar botón de cierre de sesión
function setupLogoutButton() {
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", async (e) => {
      e.preventDefault();
      await handleLogout();
    });
  }
}

// Inicializar sistema de autenticación
async function initializeAuth() {
  try {
    // console.log("🔧 Inicializando sistema de autenticación...");

    await configurePersistence();
    setupAuthStateListener();

    if (isLoginPage()) {
      setupLoginForm();
    } else if (isRegisterPage()) {
      setupRegisterForm();
    } else if (isSessionsPage()) {
      setupLogoutButton();
    }

    // console.log("✅ Sistema de autenticación inicializado correctamente");
  } catch (error) {
    // console.error("❌ Error al inicializar sistema de autenticación:", error);
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
  auth,
};
