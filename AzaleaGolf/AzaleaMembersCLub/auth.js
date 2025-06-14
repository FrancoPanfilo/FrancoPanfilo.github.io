import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { auth, db } from "./firebase.js";

// Configurar persistencia de sesión
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error al configurar la persistencia:", error);
});

// Función para verificar la ruta actual
function isLoginPage() {
  return window.location.pathname.includes("login.html");
}

function isRegisterPage() {
  return window.location.pathname.includes("register.html");
}

function isSessionsPage() {
  return window.location.pathname.includes("Sesiones/index.html");
}

// Función para obtener el usuario actual de Firestore
async function getCurrentUserData() {
  const user = auth.currentUser;
  if (!user) return null;

  const userDocRef = doc(db, "Simulador", user.uid);
  const userDoc = await getDoc(userDocRef);
  return userDoc.exists() ? userDoc.data() : null;
}

// Verificar si el usuario está autenticado
onAuthStateChanged(auth, (user) => {
  console.log("Estado de autenticación cambiado:", user);
  if (user) {
    console.log("Usuario autenticado:", user.email);
    // Solo redirigir si está en la página de login
    if (isLoginPage()) {
      window.location.href = "Sesiones/index.html";
    }
  } else {
    console.log("No hay usuario autenticado");
    if (isSessionsPage()) {
      window.location.href = "../login.html";
    }
  }
});

// Manejar el formulario de registro
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("nombre").value;
    const apellido = document.getElementById("apellido").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const errorMessage = document.getElementById("errorMessage");

    try {
      // Validar que las contraseñas coincidan
      if (password !== confirmPassword) {
        errorMessage.textContent = "Las contraseñas no coinciden.";
        return;
      }

      console.log("Iniciando registro de usuario...");

      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      console.log("Usuario creado en Firebase Auth con UID:", user.uid);

      // Crear documento del usuario en Firestore
      const userData = {
        nombre,
        apellido,
        email,
        fechaRegistro: new Date().toISOString(),
        Sesiones: [],
      };

      // Guardar en la colección Simulador usando el UID de Firebase Auth
      const userDocRef = doc(db, "Simulador", user.uid);
      await setDoc(userDocRef, userData);

      console.log("Documento creado en Firestore para el usuario:", user.uid);

      // Mostrar mensaje de éxito
      errorMessage.style.color = "green";
      errorMessage.textContent = "¡Registro exitoso! Redirigiendo...";

      // Esperar un momento para que el usuario vea el mensaje
      setTimeout(() => {
        // Redirigir a la página de sesiones
        window.location.href = "Sesiones/index.html";
      }, 2000);
    } catch (error) {
      console.error("Error en el registro:", error);
      let mensaje = "Error al registrar usuario. ";
      switch (error.code) {
        case "auth/email-already-in-use":
          mensaje += "Este correo electrónico ya está registrado.";
          break;
        case "auth/invalid-email":
          mensaje += "El correo electrónico no es válido.";
          break;
        case "auth/weak-password":
          mensaje += "La contraseña es demasiado débil.";
          break;
        default:
          mensaje += "Por favor, intente nuevamente.";
      }
      errorMessage.style.color = "red";
      errorMessage.textContent = mensaje;
    }
  });
}

// Manejar el formulario de login
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorMessage = document.getElementById("errorMessage");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // La redirección se maneja automáticamente por onAuthStateChanged
    } catch (error) {
      console.error("Error de autenticación:", error);
      let mensaje = "Error al iniciar sesión. ";
      switch (error.code) {
        case "auth/invalid-email":
          mensaje += "El correo electrónico no es válido.";
          break;
        case "auth/user-disabled":
          mensaje += "Esta cuenta ha sido deshabilitada.";
          break;
        case "auth/user-not-found":
          mensaje += "No existe una cuenta con este correo electrónico.";
          break;
        case "auth/wrong-password":
          mensaje += "La contraseña es incorrecta.";
          break;
        default:
          mensaje += "Por favor, intente nuevamente.";
      }
      errorMessage.textContent = mensaje;
    }
  });
}

// Manejar el cierre de sesión
const logoutButton = document.querySelector(".logout");
if (logoutButton) {
  logoutButton.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = "../login.html";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  });
}

// Exportar funciones y objetos necesarios
export { auth, getCurrentUserData };
