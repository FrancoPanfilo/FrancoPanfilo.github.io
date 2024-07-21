import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  increment,
  setDoc,
  getDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCaoKajIMiN3Y8AtPz5X2brHm0YOsFqiuo",
  authDomain: "azalea-92a39.firebaseapp.com",
  projectId: "azalea-92a39",
  storageBucket: "azalea-92a39.appspot.com",
  messagingSenderId: "564234531814",
  appId: "1:564234531814:web:ba8f9c434cd576b01e5c27",
  measurementId: "G-MX1L41XYVE",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const mobileNav = document.querySelector(".hamburger");
const navbar = document.querySelector(".menubar");

const toggleNav = () => {
  navbar.classList.toggle("active");
  mobileNav.classList.toggle("hamburger-active");
};
mobileNav.addEventListener("click", () => toggleNav());
console.log("object");

document.addEventListener("DOMContentLoaded", () => {
  const couponForm = document.getElementById("coupon-form");
  const backButton = document.getElementById("back-btn");
  const couponNameInput = document.getElementById("coupon-name");
  const fetchClientNames = async () => {
    const clientesRef = collection(db, "Clientes");
    const snapshot = await getDocs(clientesRef);
    const clientNames = snapshot.docs.map((doc) => doc.data().name);
    return clientNames;
  };

  const initializeNameInput = async (inputElement) => {
    const clientNames = await fetchClientNames();
    inputElement.setAttribute("list", "client-names");
    const datalist = document.getElementById("client-names");
    datalist.innerHTML = "";
    clientNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      datalist.appendChild(option);
    });
  };

  // Inicializar el campo de nombre con sugerencias
  initializeNameInput(couponNameInput);

  couponForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("ola");
    const formData = new FormData(couponForm);
    const name = formData.get("coupon-name");
    const sessions = parseInt(formData.get("sessions"));

    const clientsSnapshot = await getDocs(collection(db, "Clientes"));
    let clientDoc = null;

    clientsSnapshot.forEach((doc) => {
      if (doc.data().name === name) {
        clientDoc = doc;
      }
    });
    if (clientDoc) {
      await updateDoc(
        clientDoc.ref,
        {
          availableSessions: increment(sessions),
        },
        { merge: true }
      );
      alert("Cuponera ingresada exitosamente");
    } else {
      await setDoc(clientDoc.ref, {
        name,
        availableSessions: sessions,
        reservations: 0,
      });
      alert("Cliente agregado y cuponera ingresada exitosamente");
    }

    couponForm.reset();
  });

  backButton.addEventListener("click", () => {
    window.location.href = "../index.html"; // Ajusta según la ruta de tu página principal
  });
});
