import {
  db,
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  increment,
  doc,
  addDoc,
  arrayUnion,
  getDoc,
  query,
  where,
  deleteDoc,
  setDoc,
} from "./../db.js";
async function agregarCliente(nombre, precio) {
  try {
    // Crea un nuevo documento en la colección 'QRs' con los datos proporcionados
    const docRef = await addDoc(collection(db, "Productos"), {
      nombre: nombre,
      precio: precio,
      ventas: 0,
    });
    cargarClientes();
    alert("Producto cargado correctamente");
    document.getElementById("link").value = "";
    document.getElementById("link1").value = "";
  } catch (err) {
    console.error("Error", err);
  }
}

// tabla

async function cargarClientes() {
  const qrCollection = collection(db, "Productos");
  const qrSnapshot = await getDocs(qrCollection);
  const qrList = qrSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  qrList.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const tableBody = document.querySelector("#qrTable tbody");
  tableBody.innerHTML = ""; // Limpiar la tabla antes de llenar

  qrList.forEach((qr) => {
    const row = document.createElement("tr");

    // Crear celdas para cada campo
    row.innerHTML = `
        <td>${qr.nombre}</td>
        <td>${qr.precio}</td>
        <td>${qr.ventas}</td>

      `;

    tableBody.appendChild(row);
  });
}
// Cargar los QR dinámicos al cargar la página
cargarClientes();
document.getElementById("boton").addEventListener("click", () => {
  const link = document.getElementById("link").value;
  const link1 = document.getElementById("link1").value;
  agregarCliente(link, link1);
});
