import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  db,
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  arrayUnion,
  query,
  orderBy,
} from "../db.js";
const mobileNav = document.querySelector(".hamburger");
const navbar = document.querySelector(".menubar");

const toggleNav = () => {
  navbar.classList.toggle("active");
  mobileNav.classList.toggle("hamburger-active");
};
mobileNav.addEventListener("click", () => toggleNav());
// Botones para mostrar los modales
const nuevoAcuerdoBtn = document.getElementById("nuevoAcuerdoBtn");
const agregarVentaBtn = document.getElementById("agregarVentaBtn");

// Modales
const acuerdoModal = document.getElementById("acuerdoModal");
const ventaModal = document.getElementById("ventaModal");

// Botones de cierre de los modales
const closeAcuerdoModal = acuerdoModal.querySelector(".close");
const closeVentaModal = ventaModal.querySelector(".close");

// Mostrar y ocultar modales
nuevoAcuerdoBtn.onclick = function () {
  acuerdoModal.style.display = "block";
};

agregarVentaBtn.onclick = async function () {
  await fillAcuerdoSelect(); // Rellenar el select antes de abrir el modal
  ventaModal.style.display = "block";
};

closeAcuerdoModal.onclick = function () {
  acuerdoModal.style.display = "none";
};

closeVentaModal.onclick = function () {
  ventaModal.style.display = "none";
};

window.onclick = function (event) {
  if (event.target == acuerdoModal) {
    acuerdoModal.style.display = "none";
  } else if (event.target == ventaModal) {
    ventaModal.style.display = "none";
  }
};

// Función para obtener los acuerdos de Firebase y llenar el select
const fillAcuerdoSelect = async () => {
  const acuerdoSelect = document.getElementById("acuerdoSelect");
  acuerdoSelect.innerHTML = ""; // Limpiar opciones anteriores

  const querySnapshot = await getDocs(collection(db, "Acuerdos"));
  querySnapshot.forEach((doc) => {
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = doc.data().nombre;
    acuerdoSelect.appendChild(option);
  });
};

// Función para mostrar los acuerdos en la tabla con el total de ventas
async function showAcuerdos() {
  const acuerdosSnapshot = await getDocs(collection(db, "Acuerdos"));
  const acuerdosTableBody = document.getElementById("acuerdosTableBody");
  acuerdosTableBody.innerHTML = ""; // Limpiar la tabla antes de agregar nuevos datos

  acuerdosSnapshot.forEach((doc) => {
    const acuerdo = doc.data();
    const totalVentas = acuerdo.ventas.length;

    const row = document.createElement("tr");
    row.className = "filaPGA";
    row.innerHTML = `
      <td>${acuerdo.nombre}</td>
      <td>${totalVentas}</td>
    `;

    // Agregar evento de clic para mostrar las ventas en un acordeón
    row.addEventListener("click", () => {
      toggleVentasAcordeon(doc.id, acuerdo.ventas, acuerdo.porcentaje, row);
    });

    acuerdosTableBody.appendChild(row);
  });
}

// Funcionalidad del formulario para agregar acuerdos
document.getElementById("acuerdoForm").addEventListener("submit", async (e) => {
  e.preventDefault(); // Evita que el formulario se envíe de forma tradicional

  const nombre = document.getElementById("nombre").value;
  const porcentaje = parseFloat(document.getElementById("porcentaje").value);

  try {
    await addDoc(collection(db, "Acuerdos"), {
      nombre: nombre,
      porcentaje: porcentaje,
      ventas: [], // Array de ventas inicialmente vacío
    });
    alert("Acuerdo agregado exitosamente");
    e.target.reset();
    acuerdoModal.style.display = "none"; // Cierra el modal
    showAcuerdos(); // Actualizar la tabla después de agregar un acuerdo
  } catch (error) {
    console.error("Error al agregar el acuerdo: ", error);
    alert("Error al agregar el acuerdo");
  }
});

// Funcionalidad del formulario de ventas
document.getElementById("ventaForm").addEventListener("submit", async (e) => {
  e.preventDefault(); // Evita que el formulario se envíe de forma tradicional

  const acuerdoId = document.getElementById("acuerdoSelect").value;
  const cliente = document.getElementById("cliente").value;
  const monto = parseFloat(document.getElementById("monto").value);
  const descripcion = document.getElementById("descripcion").value;
  const pagado = false;

  try {
    const acuerdoRef = doc(db, "Acuerdos", acuerdoId);
    await updateDoc(acuerdoRef, {
      ventas: arrayUnion({ cliente, monto, descripcion, pagado }),
    });
    alert("Venta agregada exitosamente");
    ventaModal.style.display = "none"; // Cierra el modal
    showAcuerdos(); // Actualizar la tabla para reflejar los cambios
    e.target.reset(); // Limpiar el formulario de ventas
  } catch (error) {
    console.error("Error al agregar la venta: ", error);
    alert("Error al agregar la venta");
  }
});

// Función para cargar los acuerdos cuando se carga la página
window.onload = function () {
  showAcuerdos();
};

// Función para mostrar y ocultar el acordeón con las ventas de un acuerdo
function toggleVentasAcordeon(acuerdoId, ventas, porcentaje, rowElement) {
  // Comprobar si ya hay un acordeón abierto
  const existingAcordeon = document.querySelector(
    `.ventas-acordeon[data-acuerdo-id="${acuerdoId}"]`
  );

  if (existingAcordeon) {
    // Si el acordeón está abierto, cerrarlo
    existingAcordeon.remove();
    return;
  }

  // Si había otro acordeón abierto, cerrarlo
  const openAcordeon = document.querySelector(".ventas-acordeon");
  if (openAcordeon) {
    openAcordeon.remove();
  }

  // Crear un nuevo contenedor para el acordeón
  if (ventas.length != 0) {
    const ventasContainer = document.createElement("div");
    ventasContainer.classList.add("ventas-acordeon");
    ventasContainer.setAttribute("data-acuerdo-id", acuerdoId);

    // Crear la lista de ventas
    const ventasList = document.createElement("table");
    ventasList.className = "ListaVentas";
    ventasList.innerHTML = `<thead>
    <tr>
      <th>Cliente</th>
      <th>Monto</th>
      <th>Comision</th>
      <th>Descripcion</th>
      <th>Pago</th>
    </tr>
  </thead>`;
    ventas.forEach((venta, index) => {
      const ventaItem = document.createElement("tr");

      // Calcular la comisión
      const comision = (venta.monto * porcentaje) / 100;

      ventaItem.innerHTML = `
      <tr>
        <td>${venta.cliente}</td>
        <td>${venta.monto.toFixed(0)} U$S</td>
        <td>${comision.toFixed(1)} U$S</td>
        <td>${venta.descripcion}</td>
        <td><input type="checkbox"${venta.pagado ? "checked disabled" : ""} ${
        venta.pagado ? "checked" : ""
      } data-acuerdo-id="${acuerdoId}" data-venta-index="${index}" /></td>
      </tr>
      `;

      // Añadir un evento de cambio al checkbox para actualizar el estado "pagado" en Firebase
      const boton = ventaItem.querySelector('input[type="checkbox"]');
      boton.addEventListener("change", async function () {
        const checked = this.checked;
        const acuerdoRef = doc(db, "Acuerdos", acuerdoId);
        const acuerdoDoc = await getDoc(acuerdoRef);
        const ventasActuales = acuerdoDoc.data().ventas;
        // Actualizar el estado de la venta
        ventasActuales[index].pagado = checked;
        boton.disabled = true;
        try {
          await updateDoc(acuerdoRef, { ventas: ventasActuales });
          alert("Estado de pago actualizado correctamente.");
        } catch (error) {
          console.error("Error al actualizar el estado de pago:", error);
          alert("Error al actualizar el estado de pago.");
        }
      });

      ventasList.appendChild(ventaItem);
    });

    ventasContainer.appendChild(ventasList);

    // Insertar el acordeón después de la fila de acuerdo
    rowElement.insertAdjacentElement("afterend", ventasContainer);
  } else {
    alert("No tiene ventas registradas");
  }
}
// Tareas

document.addEventListener("DOMContentLoaded", () => {
  // Botón para abrir el modal de nueva tarea
  const botonModalTareas = document.getElementById("botonModalTareas");
  botonModalTareas.addEventListener("click", showNewTaskModal);

  // Botón para agregar una nueva tarea
  const botonAgregarTarea = document.getElementById("botonAgregarTarea");
  botonAgregarTarea.addEventListener("click", addTask);
  const botonAgregarSubTarea = document.getElementById("botonAgregarTarea");
  botonAgregarSubTarea.addEventListener("click", () => {
    addSubTask();
    console.log("object");
  });
  // Botón para cerrar el modal de nueva tarea
  const botonCancelarTarea = document.getElementById("botonCancelarTarea");
  botonCancelarTarea.addEventListener("click", hideNewTaskModal);

  // Cargar las tareas iniciales
  loadTasks();
});
let task;
// Función para mostrar el modal de nueva tarea
function showNewTaskModal() {
  document.getElementById("newTaskModal").style.display = "block";
}
function showNewSubTaskModal(id) {
  task = id;
  document.getElementById("newSubTaskModal").style.display = "block";
}
// Función para ocultar el modal de nueva tarea
function hideNewTaskModal() {
  document.getElementById("newTaskModal").style.display = "none";
}
function hideNewSubTaskModal() {
  document.getElementById("newSubTaskModal").style.display = "none";
}
// Función para agregar una nueva tarea a Firestore
async function addTask() {
  const empresa = document.getElementById("newTaskEmpresa").value;
  const fechaLimite = document.getElementById("newTaskFecha").value;
  const descripcion = document.getElementById("newTaskDescripcion").value;

  await addDoc(collection(db, "tareas"), { empresa, fechaLimite, descripcion });
  hideNewTaskModal();
  loadTasks();
}
async function addSubTask() {
  const titulo = document.getElementById("newSubTaskEmpresa").value;
  const fechaLimite = document.getElementById("newSubTaskFecha").value;
  const descripcion = document.getElementById("newSubTaskDescripcion").value;

  if (titulo) {
    await addDoc(collection(db, `tareas/${task}/subtareas`), {
      titulo,
      descripcion,
      fechaLimite,
      realizada: false,
    });
  }
  console.log("llega");
  hideNewSubTaskModal();
  loadTasks();
}
// Función para cargar tareas
async function loadTasks() {
  const tasksBody = document.getElementById("Tareas");
  const tasksSnapshot = await getDocs(
    query(collection(db, "tareas"), orderBy("fechaLimite"))
  );
  tasksSnapshot.forEach((taskDoc) => {
    const taskData = taskDoc.data();
    const taskRow = document.createElement("table");
    taskRow.classList = "tablas";

    taskRow.innerHTML = `
    <caption>${taskData.empresa} para ${taskData.fechaLimite}</caption>
    `;

    taskRow.onclick = () => toggleSubtasks(taskDoc.id);
    tasksBody.appendChild(taskRow);

    const subtasksRow = document.createElement("tr");
    subtasksRow.classList.add("subtasks-row");
    subtasksRow.id = `subtasks-${taskDoc.id}`;
    tasksBody.appendChild(subtasksRow);
    taskRow.innerHTML += `<div id="${taskDoc.id}Boton"><img src="mas.png"/></div>`;
    const mas = document.getElementById(`${taskDoc.id}Boton`);
    console.log(mas);
    mas.addEventListener("click", () => showNewSubTaskModal(`${taskDoc.id}`));
  });
}
function toggleSubtasks(taskId) {
  const subtasksRow = document.getElementById(`subtasks-${taskId}`);
  if (subtasksRow.style.display === "none") {
    loadSubtasks(taskId);
    subtasksRow.style.display = "table-row";
  } else {
    subtasksRow.style.display = "none";
  }
}

async function loadSubtasks(taskId) {
  const subtasksRow = document.getElementById(`subtasks-${taskId}`);
  const subtasksSnapshot = await getDocs(
    collection(db, `tareas/${taskId}/subtareas`)
  );

  subtasksRow.innerHTML = `<td colspan='3'><ul id='subtasksList'></ul><button onclick='showNewSubtaskModal(\"" +
    taskId +
    "\")'>Agregar Subtarea</button></td>`;

  subtasksSnapshot.forEach((subtaskDoc) => {
    const subtaskData = subtaskDoc.data();
    const subtaskItem = document.createElement("li");
    subtaskItem.innerHTML = `
      ${subtaskData.titulo}: ${subtaskData.descripcion || ""}
      <button onclick='markSubtaskCompleted("${taskId}", "${
      subtaskDoc.id
    }")'>Marcar como Realizada</button>
    `;
    subtasksRow.querySelector("#subtasksList").appendChild(subtaskItem);
  });
}

async function markSubtaskCompleted(taskId, subtaskId) {
  const subtaskRef = doc(db, `tareas/${taskId}/subtareas/${subtaskId}`);
  await updateDoc(subtaskRef, { realizada: true });
  loadSubtasks(taskId);
}
