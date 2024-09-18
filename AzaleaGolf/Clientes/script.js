import { db, collection, increment, getDocs, updateDoc, doc } from "../db.js";

const mobileNav = document.querySelector(".hamburger");
const navbar = document.querySelector(".menubar");
mobileNav.addEventListener("click", () => toggleNav());
console.log("object");

document.addEventListener("DOMContentLoaded", () => {});

const toggleNav = () => {
  navbar.classList.toggle("active");
  mobileNav.classList.toggle("hamburger-active");
  console.log("hola");
};

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
    const { id, name, email, availableSessions, reservations } = client;

    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${name}</td>
        <td contenteditable="true" class="editable">${email}</td>
        <td>${availableSessions}</td>
        <td>${reservations}</td>
        <td>
          <button class="save-btn" data-id="${id}">Guardar</button>
        </td>
      `;
    clientsTableBody.appendChild(row);

    // Añadir evento al botón de guardar
    row.querySelector(".save-btn").addEventListener("click", async () => {
      const newEmail = row.querySelector(".editable").innerText;
      await updateEmail(id, newEmail);
    });
  };

  const updateEmail = async (id, newEmail) => {
    try {
      const clientDoc = doc(db, "Clientes", id);
      await updateDoc(clientDoc, { email: newEmail });
      alert("Email actualizado exitosamente");
    } catch (error) {
      console.error("Error actualizando el email: ", error);
      alert("Error actualizando el email");
    }
  };

  await displayClients();
});
document.addEventListener("DOMContentLoaded", function () {
  const openModalBtn = document.getElementById("openModalBtn");
  const modal = document.createElement("div");
  modal.classList.add("modal");

  const modalContent = document.createElement("div");
  modalContent.classList.add("modal-content");
  modalContent.innerHTML = `
      <span class="close">&times;</span>
 <div class="container">
        <h1>Agregar Cuponera</h1>
        <form id="coupon-form">
          <label for="coupon-name">Nombre del Cliente:</label>
          <input
            type="text"
            id="coupon-name"
            name="coupon-name"
            required
            list="client-names"
          />
          <datalist id="client-names"></datalist>

          <label for="sessions">Número de Sesiones:</label>
          <input type="number" id="sessions" name="sessions" min="1" required />

          <button type="submit">Confirmar</button>
        </form>
        <button id="back-btn">Volver</button>
      </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  const closeModalBtn = modalContent.querySelector(".close");

  openModalBtn.addEventListener("click", function () {
    modal.style.display = "block";
    document.body.classList.add("modal-open");
  });

  closeModalBtn.addEventListener("click", function () {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  });

  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
      document.body.classList.remove("modal-open");
    }
  });
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
