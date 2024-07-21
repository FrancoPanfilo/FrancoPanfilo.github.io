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
document.addEventListener("DOMContentLoaded", async () => {
  const clientsTableBody = document.querySelector("#clients-table tbody");

  const fetchClients = async () => {
    const clients = [];
    const snapshot = await getDocs(collection(db, "Clientes"));

    snapshot.forEach((doc) => {
      const client = { id: doc.id, ...doc.data() };
      clients.push(client);
    });

    return clients;
  };

  const displayClients = async () => {
    clientsTableBody.innerHTML = "";
    const clients = await fetchClients();

    clients.forEach((client) => addClientToTable(client));
  };

  const addClientToTable = (client) => {
    const { availableSessions, name, email, reservations } = client;

    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${name}</td>

        <td>${email}</td>
        <td>${availableSessions}</td>
        <td>${reservations}</td>
      `;
    clientsTableBody.appendChild(row);
  };

  await displayClients();
});
