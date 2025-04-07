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
// Menú hamburguesa
const mobileNav = document.querySelector(".hamburger");
const navbar = document.querySelector(".menubar");
const toggleNav = () => {
  navbar.classList.toggle("active");
  mobileNav.classList.toggle("hamburger-active");
};
mobileNav.addEventListener("click", toggleNav);

let ventaSeleccionada = null;

// Habilitar/deshabilitar botones según selección
function actualizarBotones() {
  const botones = [
    "desvincularQrBtn",
    "eliminarVentaBtn",
    "restaurarVentaBtn",
    "editarVentaBtn",
  ];
  botones.forEach((id) => {
    document.getElementById(id).disabled = !ventaSeleccionada;
  });
}

// Buscar venta
document.getElementById("buscarBtn").addEventListener("click", async () => {
  const codigo = document.getElementById("buscarVenta").value.trim();
  if (!codigo) return alert("Ingresa un código");

  const ventasSnap = await getDocs(collection(db, "Ventas"));
  let ventaDoc = ventasSnap.docs.find((doc) => doc.data().codigo === codigo);
  if (!ventaDoc) {
    const ventasEliminadasSnap = await getDocs(
      collection(db, "VentasEliminadas")
    );
    ventaDoc = ventasEliminadasSnap.docs.find(
      (doc) => doc.data().codigo === codigo
    );
  }
  if (ventaDoc) {
    ventaSeleccionada = {
      id: ventaDoc.id,
      ...ventaDoc.data(),
      eliminada: !ventasSnap.docs.some((doc) => doc.data().codigo === codigo),
    };
    document.getElementById("ventaInfo").innerHTML = `
      <p><strong>Código:</strong> ${ventaSeleccionada.codigo}</p>
      <p><strong>Cliente:</strong> ${ventaSeleccionada.cliente}</p>
      <p><strong>Producto:</strong> ${ventaSeleccionada.producto}</p>
      <p><strong>Talle:</strong> ${ventaSeleccionada.talle}</p>
      <p><strong>Dirección:</strong> ${ventaSeleccionada.direccion}</p>
      <p><strong>Vínculo:</strong> ${
        ventaSeleccionada.vinculo || "Sin vincular"
      }</p>
      <p><strong>Estado:</strong> ${
        ventaSeleccionada.eliminada ? "Eliminada" : "Activa"
      }</p>
    `;
    actualizarBotones();
    document.getElementById("restaurarVentaBtn").disabled =
      !ventaSeleccionada.eliminada;
    document.getElementById("eliminarVentaBtn").disabled =
      ventaSeleccionada.eliminada;
  } else {
    alert("Venta no encontrada");
    ventaSeleccionada = null;
    document.getElementById("ventaInfo").innerHTML = "";
    actualizarBotones();
  }
});

// Desvincular QR
document
  .getElementById("desvincularQrBtn")
  .addEventListener("click", async () => {
    if (!ventaSeleccionada.vinculo) return alert("No hay QR para desvincular");
    if (confirm(`¿Desvincular QR de ${ventaSeleccionada.codigo}?`)) {
      try {
        await updateDoc(doc(db, "Ventas", ventaSeleccionada.id), {
          vinculo: "",
        });
        const qrSnap = await getDocs(collection(db, "QRs"));
        const qrDoc = qrSnap.docs.find(
          (d) => d.data().vinculado === ventaSeleccionada.codigo
        );
        if (qrDoc) await updateDoc(doc(db, "QRs", qrDoc.id), { vinculado: "" });
        alert("QR desvinculado");
        document.getElementById("buscarBtn").click();
      } catch (error) {
        console.error("Error al desvincular:", error);
      }
    }
  });

// Eliminar venta (mover a VentasEliminadas)
document
  .getElementById("eliminarVentaBtn")
  .addEventListener("click", async () => {
    if (!ventaSeleccionada) return alert("Selecciona una venta");
    if (
      confirm(
        `¿Eliminar venta ${ventaSeleccionada.codigo}? Esta acción afectará contadores y relaciones.`
      )
    ) {
      try {
        if (ventaSeleccionada.vinculo) {
          const qrSnap = await getDocs(collection(db, "QRs"));
          const qrDoc = qrSnap.docs.find(
            (d) => d.data().vinculado === ventaSeleccionada.codigo
          );
          if (qrDoc)
            await updateDoc(doc(db, "QRs", qrDoc.id), { vinculado: "" });
          await updateDoc(doc(db, "Ventas", ventaSeleccionada.id), {
            vinculo: "",
          });
        }

        const clientesSnap = await getDocs(collection(db, "Clientes"));
        const clienteDoc = clientesSnap.docs.find(
          (doc) =>
            doc.data().compras &&
            doc.data().compras.includes(ventaSeleccionada.codigo)
        );
        if (clienteDoc) {
          const nuevasCompras = clienteDoc
            .data()
            .compras.filter((c) => c !== ventaSeleccionada.codigo);
          await updateDoc(doc(db, "Clientes", clienteDoc.id), {
            compras: nuevasCompras,
            cantCompras: clienteDoc.data().cantCompras - 1,
          });
        }

        const productosSnap = await getDocs(collection(db, "Productos"));
        const productoDoc = productosSnap.docs.find(
          (doc) => doc.data().nombre === ventaSeleccionada.producto
        );
        if (productoDoc) {
          await updateDoc(doc(db, "Productos", productoDoc.id), {
            ventas: productoDoc.data().ventas - 1,
          });
        }

        const contadorDoc = doc(db, "Contadores", "Contadores");
        const contadorSnap = await getDoc(contadorDoc);
        if (contadorSnap.exists()) {
          await updateDoc(contadorDoc, {
            venta: contadorSnap.data().venta - 1,
          });
        }

        await setDoc(
          doc(db, "VentasEliminadas", ventaSeleccionada.id),
          ventaSeleccionada
        );
        await deleteDoc(doc(db, "Ventas", ventaSeleccionada.id));

        alert("Venta movida a eliminadas y contadores actualizados");
        ventaSeleccionada = null;
        document.getElementById("ventaInfo").innerHTML = "";
        actualizarBotones();
      } catch (error) {
        console.error("Error al eliminar venta:", error);
        alert("Error al eliminar. Revisa la consola.");
      }
    }
  });

// Restaurar venta
document
  .getElementById("restaurarVentaBtn")
  .addEventListener("click", async () => {
    if (!ventaSeleccionada || !ventaSeleccionada.eliminada)
      return alert("Selecciona una venta eliminada");
    if (confirm(`¿Restaurar venta ${ventaSeleccionada.codigo}?`)) {
      try {
        await setDoc(
          doc(db, "Ventas", ventaSeleccionada.id),
          ventaSeleccionada
        );

        const clientesSnap = await getDocs(collection(db, "Clientes"));
        const clienteDoc = clientesSnap.docs.find(
          (doc) => doc.data().codigo === ventaSeleccionada.cliente.slice(0, 4)
        );
        if (clienteDoc) {
          const comprasActuales = clienteDoc.data().compras || [];
          await updateDoc(doc(db, "Clientes", clienteDoc.id), {
            compras: [...comprasActuales, ventaSeleccionada.codigo],
            cantCompras: clienteDoc.data().cantCompras + 1,
          });
        }

        const productosSnap = await getDocs(collection(db, "Productos"));
        const productoDoc = productosSnap.docs.find(
          (doc) => doc.data().nombre === ventaSeleccionada.producto
        );
        if (productoDoc) {
          await updateDoc(doc(db, "Productos", productoDoc.id), {
            ventas: productoDoc.data().ventas + 1,
          });
        }

        const contadorDoc = doc(db, "Contadores", "Contadores");
        const contadorSnap = await getDoc(contadorDoc);
        if (contadorSnap.exists()) {
          await updateDoc(contadorDoc, {
            venta: contadorSnap.data().venta + 1,
          });
        }

        await deleteDoc(doc(db, "VentasEliminadas", ventaSeleccionada.id));

        alert("Venta restaurada correctamente");
        document.getElementById("buscarBtn").click();
      } catch (error) {
        console.error("Error al restaurar venta:", error);
        alert("Error al restaurar. Revisa la consola.");
      }
    }
  });

// Exportar a JSON
document
  .getElementById("exportarJsonBtn")
  .addEventListener("click", async () => {
    try {
      const colecciones = [
        "Ventas",
        "Clientes",
        "Productos",
        "QRs",
        "Contadores",
        "VentasEliminadas",
      ];
      const datos = {};
      for (const col of colecciones) {
        const snapshot = await getDocs(collection(db, col));
        datos[col] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      }
      const json = JSON.stringify(datos, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "base_de_datos_limitless.json";
      a.click();
      URL.revokeObjectURL(url);
      alert("Base de datos exportada correctamente");
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("Error al exportar la base de datos. Revisa la consola.");
    }
  });

// Editar venta
document.getElementById("editarVentaBtn").addEventListener("click", () => {
  if (!ventaSeleccionada || ventaSeleccionada.eliminada)
    return alert("Selecciona una venta activa para editar");
  const modal = document.getElementById("editarModal");
  document.getElementById("editCliente").value = ventaSeleccionada.cliente;
  document.getElementById("editProducto").value = ventaSeleccionada.producto;
  document.getElementById("editTalle").value = ventaSeleccionada.talle;
  document.getElementById("editDireccion").value = ventaSeleccionada.direccion;
  modal.style.display = "block";
});

document
  .getElementById("guardarEdicionBtn")
  .addEventListener("click", async () => {
    try {
      const nuevosDatos = {
        cliente: document.getElementById("editCliente").value,
        producto: document.getElementById("editProducto").value,
        talle: document.getElementById("editTalle").value,
        direccion: document.getElementById("editDireccion").value,
      };
      await updateDoc(doc(db, "Ventas", ventaSeleccionada.id), nuevosDatos);
      alert("Venta actualizada correctamente");
      document.getElementById("editarModal").style.display = "none";
      document.getElementById("buscarBtn").click();
    } catch (error) {
      console.error("Error al editar venta:", error);
      alert("Error al guardar los cambios. Revisa la consola.");
    }
  });

document.getElementById("cerrarModalBtn").addEventListener("click", () => {
  document.getElementById("editarModal").style.display = "none";
});

// Generar reporte
document
  .getElementById("generarReporteBtn")
  .addEventListener("click", async () => {
    try {
      const ventasSnap = await getDocs(collection(db, "Ventas"));
      const reporte = {
        totalVentas: ventasSnap.size,
        pagadas: ventasSnap.docs.filter((doc) => doc.data().pagado).length,
        enviadas: ventasSnap.docs.filter((doc) => doc.data().enviado).length,
        entregadas: ventasSnap.docs.filter((doc) => doc.data().entregado)
          .length,
      };
      const json = JSON.stringify(reporte, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reporte_ventas.json";
      a.click();
      URL.revokeObjectURL(url);
      alert("Reporte generado correctamente");
    } catch (error) {
      console.error("Error al generar reporte:", error);
      alert("Error al generar el reporte. Revisa la consola.");
    }
  });

// Calcular dinero entrado y por entrar
async function actualizarDinero() {
  try {
    const ventasSnap = await getDocs(collection(db, "Ventas"));
    const productosSnap = await getDocs(collection(db, "Productos"));

    let dineroEntrado = 0;
    let dineroPorEntrar = 0;

    ventasSnap.forEach((venta) => {
      const producto = productosSnap.docs.find(
        (p) => p.data().nombre === venta.data().producto
      );
      const precio = producto ? producto.data().precio || 0 : 0; // Asumiendo campo 'precio' en Productos
      if (venta.data().pagado) {
        dineroEntrado += parseFloat(precio);
      } else {
        dineroPorEntrar += parseFloat(precio);
      }
    });

    document.getElementById(
      "dineroEntrado"
    ).textContent = `$${dineroEntrado.toFixed(0)}`;
    document.getElementById(
      "dineroPorEntrar"
    ).textContent = `$${dineroPorEntrar.toFixed(0)}`;
  } catch (error) {
    console.error("Error al calcular dinero:", error);
    alert("Error al actualizar el resumen financiero.");
  }
}

document
  .getElementById("actualizarDineroBtn")
  .addEventListener("click", actualizarDinero);
document.addEventListener("DOMContentLoaded", actualizarDinero);
