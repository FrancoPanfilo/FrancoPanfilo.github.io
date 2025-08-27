import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "../db.js";

const mobileNav = document.querySelector(".hamburger");
const navbar = document.querySelector(".menubar");

const toggleNav = () => {
  navbar.classList.toggle("active");
  mobileNav.classList.toggle("hamburger-active");
};
mobileNav.addEventListener("click", () => toggleNav());

function App() {
  const [seccion, setSeccion] = React.useState("verVentas");
  const [subcategorias, setSubcategorias] = React.useState([]);
  const [meses, setMeses] = React.useState([]);
  const [mesInicio, setMesInicio] = React.useState("");
  const [mesFinal, setMesFinal] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const categorias = {
    Palos: [
      "Drivers",
      "Maderas",
      "Híbridos",
      "Set de Hierros",
      "Wedges",
      "Putters",
    ],
    Bolsas: ["Carro", "Trípode"],
    Indumentaria: ["Remeras", "Buzos", "Gorros", "Cinturones", "Bottoms"],
    Zapatos: Array.from({ length: 11 }, (_, i) => `Talle ${35 + i}`),
    Guantes: ["Cabretta", "Normal"],
    Pelotas: ["Docenas", "Tubos"],
  };

  // Normalizar formato de mes
  const formatMonthKey = (month, year) => {
    const mesNombre = month.toLocaleString("es", { month: "long" });
    const mesAbreviado =
      mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1, 3).toLowerCase();
    return `${mesAbreviado}-${year}`;
  };

  // Cargar subcategorías y meses
  // Cargar subcategorías y meses
  React.useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "stock1"),
      async (snapshot) => {
        const subs = [];
        for (const docSnap of snapshot.docs) {
          const subData = { id: docSnap.id, ...docSnap.data(), ventas: {} };
          const ventasSnapshot = await getDocs(
            collection(db, "stock1", docSnap.id, "unidadesVendidas")
          );
          ventasSnapshot.forEach((ventaDoc) => {
            const ventaData = ventaDoc.data();
            subData.ventas[ventaData.mes] = ventaData.unidades;
          });
          subs.push(subData);
        }
        setSubcategorias(subs);
      }
    );

    // Generar meses desde Julio 2024 hasta el último mes terminado
    const mesesList = [];
    let date = new Date(2024, 6); // Julio 2024
    const today = new Date();

    // Calcula el último mes terminado:
    // Si hoy es agosto 26, el último mes terminado es julio.
    // Si hoy fuera agosto 1, el último mes terminado es julio.
    // Si hoy fuera septiembre 2, el último mes terminado es agosto.
    const lastCompletedMonth = new Date(today.getFullYear(), today.getMonth());
    lastCompletedMonth.setDate(0); // Esto hace que la fecha sea el último día del mes anterior

    while (date <= lastCompletedMonth) {
      mesesList.push(formatMonthKey(date, date.getFullYear()));
      date.setMonth(date.getMonth() + 1);
    }

    setMeses(mesesList);
    setMesInicio(mesesList[0]);
    setMesFinal(mesesList[mesesList.length - 1]);

    return () => unsubscribe();
  }, []);

  // Inicializar subcategorías en Firestore
  React.useEffect(() => {
    Object.entries(categorias).forEach(([cat, subs]) => {
      subs.forEach(async (sub) => {
        const docRef = doc(db, "stock1", sub);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          await setDoc(docRef, {
            categoria: cat,
            subcategoria: sub,
            stock: 0,
            fechaActualizacion: serverTimestamp(),
          });
        }
      });
    });
  }, []);

  // Función para resetear stock
  const resetStock = async () => {
    try {
      const batch = db.batch();
      subcategorias.forEach((sub) => {
        const docRef = doc(db, "stock1", sub.id);
        batch.update(docRef, {
          stock: 0,
          fechaActualizacion: serverTimestamp(),
        });
      });
      await batch.commit();
      await addDoc(collection(db, "historialCambios"), {
        subcategoria: "Todas",
        tipo: "Reset",
        unidades: 0,
        fecha: serverTimestamp(),
      });
      alert("Stock reseteado a 0");
      setShowModal(false);
    } catch (error) {
      alert("Error: " + error.message);
      setShowModal(false);
    }
  };

  // Formulario para registrar ventas
  function RegistrarVentas() {
    const [mes, setMes] = React.useState(meses[0] || "");
    const [ventasForm, setVentasForm] = React.useState(
      Object.keys(categorias).flatMap((cat) =>
        categorias[cat].map((sub) => ({ sub, unidades: 0 }))
      )
    );

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        for (const item of ventasForm) {
          const unidades = item.unidades;
          if (unidades > 0) {
            const ventaRef = doc(
              db,
              "stock1",
              item.sub,
              "unidadesVendidas",
              mes
            );
            const ventaDoc = await getDoc(ventaRef);
            if (ventaDoc.exists())
              throw new Error(`Venta ya registrada para ${item.sub} en ${mes}`);
            const stockDoc = await getDoc(doc(db, "stock1", item.sub));
            const currentStock = stockDoc.data().stock || 0;
            if (unidades > currentStock)
              throw new Error(`Stock insuficiente para ${item.sub}`);
            await setDoc(ventaRef, {
              mes,
              unidades,
              fecha: serverTimestamp(),
            });
            await updateDoc(doc(db, "stock1", item.sub), {
              stock: currentStock - unidades,
              fechaActualizacion: serverTimestamp(),
            });
            await addDoc(collection(db, "historialCambios"), {
              subcategoria: item.sub,
              tipo: "Venta",
              unidades: -unidades,
              mes,
              fecha: serverTimestamp(),
            });
          }
        }
        alert("Ventas registradas");
        setVentasForm(ventasForm.map((item) => ({ ...item, unidades: 0 })));
      } catch (error) {
        alert("Error: " + error.message);
      }
    };

    const handleUnidadesChange = (sub, value) => {
      setVentasForm(
        ventasForm.map((item) =>
          item.sub === sub ? { ...item, unidades: parseInt(value) || 0 } : item
        )
      );
    };

    return React.createElement(
      "div",
      null,
      React.createElement("h2", null, "Registrar Ventas por Mes"),
      React.createElement(
        "form",
        { onSubmit: handleSubmit },
        React.createElement("label", null, "Mes"),
        React.createElement(
          "select",
          { value: mes, onChange: (e) => setMes(e.target.value) },
          meses.map((m) =>
            React.createElement("option", { key: m, value: m }, m)
          )
        ),
        Object.entries(categorias).map(([cat, subs]) =>
          React.createElement(
            "div",
            { key: cat },
            React.createElement("h3", null, cat),
            subs.map((sub) =>
              React.createElement(
                "div",
                { key: sub },
                React.createElement("label", null, sub),
                React.createElement("input", {
                  type: "number",
                  min: "0",
                  value:
                    ventasForm.find((item) => item.sub === sub)?.unidades || 0,
                  onChange: (e) => handleUnidadesChange(sub, e.target.value),
                })
              )
            )
          )
        ),
        React.createElement("button", { type: "submit" }, "Registrar Ventas")
      )
    );
  }

  // Formulario para modificar stock
  function ModificarStock() {
    const [stockForm, setStockForm] = React.useState(
      Object.keys(categorias).flatMap((cat) =>
        categorias[cat].map((sub) => ({ sub, unidades: 0 }))
      )
    );

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        for (const item of stockForm) {
          const unidades = item.unidades;
          if (unidades > 0) {
            const docRef = doc(db, "stock1", item.sub);
            const docSnap = await getDoc(docRef);
            const currentStock = docSnap.data().stock || 0;
            await updateDoc(docRef, {
              stock: currentStock + unidades,
              fechaActualizacion: serverTimestamp(),
            });
            await addDoc(collection(db, "historialCambios"), {
              subcategoria: item.sub,
              tipo: "Ingreso",
              unidades,
              fecha: serverTimestamp(),
            });
          }
        }
        alert("Stock actualizado");
        setStockForm(stockForm.map((item) => ({ ...item, unidades: 0 })));
      } catch (error) {
        alert("Error: " + error.message);
      }
    };

    const handleUnidadesChange = (sub, value) => {
      setStockForm(
        stockForm.map((item) =>
          item.sub === sub ? { ...item, unidades: parseInt(value) || 0 } : item
        )
      );
    };

    return React.createElement(
      "div",
      null,
      React.createElement("h2", null, "Modificar Stock"),
      React.createElement(
        "form",
        { onSubmit: handleSubmit },
        Object.entries(categorias).map(([cat, subs]) =>
          React.createElement(
            "div",
            { key: cat },
            React.createElement("h3", null, cat),
            subs.map((sub) =>
              React.createElement(
                "div",
                { key: sub },
                React.createElement("label", null, sub),
                React.createElement("input", {
                  type: "number",
                  min: "0",
                  value:
                    stockForm.find((item) => item.sub === sub)?.unidades || 0,
                  onChange: (e) => handleUnidadesChange(sub, e.target.value),
                })
              )
            )
          )
        ),
        React.createElement("button", { type: "submit" }, "Actualizar Stock")
      )
    );
  }

  // Sección de estadísticas
  function Estadisticas() {
    const [expanded, setExpanded] = React.useState({});
    const pieChartRef = React.useRef(null);
    const barChartRef = React.useRef(null);

    const toggleCategoria = (cat) => {
      setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
    };

    const mesesFiltrados = meses.slice(
      meses.indexOf(mesInicio),
      meses.indexOf(mesFinal) + 1
    );

    // Calcular ventas totales por categoría en el rango de fechas
    const calcularVentasTotales = (cat) => {
      return subcategorias
        .filter((s) => s.categoria === cat)
        .reduce(
          (sum, s) =>
            sum +
            Object.entries(s.ventas || {})
              .filter(([mes]) => mesesFiltrados.includes(mes))
              .reduce((vSum, [, v]) => vSum + v, 0),
          0
        );
    };

    // Calcular ventas totales por subcategoría en el rango de fechas
    const calcularVentasTotalesSubcategoria = (sub) => {
      const subData = subcategorias.find((s) => s.id === sub);
      return Object.entries(subData?.ventas || {})
        .filter(([mes]) => mesesFiltrados.includes(mes))
        .reduce((sum, [, v]) => sum + v, 0);
    };

    // Total general de ventas
    const totalGeneral = subcategorias.reduce(
      (sum, s) =>
        sum +
        Object.entries(s.ventas || {})
          .filter(([mes]) => mesesFiltrados.includes(mes))
          .reduce((vSum, [, v]) => vSum + v, 0),
      0
    );

    // Datos para el gráfico de torta (porcentajes por categoría)
    const pieData = {
      labels: Object.keys(categorias),
      datasets: [
        {
          data: Object.keys(categorias).map((cat) =>
            calcularVentasTotales(cat)
          ),
          backgroundColor: [
            "rgba(26, 115, 232, 0.6)", // Azul
            "rgba(211, 47, 47, 0.6)", // Rojo
            "rgba(56, 142, 60, 0.6)", // Verde
            "rgba(255, 167, 38, 0.6)", // Amarillo
            "rgba(171, 71, 188, 0.6)", // Púrpura
            "rgba(66, 165, 245, 0.6)", // Celeste
          ],
          borderColor: [
            "rgba(26, 115, 232, 1)",
            "rgba(211, 47, 47, 1)",
            "rgba(56, 142, 60, 1)",
            "rgba(255, 167, 38, 1)",
            "rgba(171, 71, 188, 1)",
            "rgba(66, 165, 245, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };

    // Datos para el gráfico de barras (ventas por categoría y subcategorías expandidas)
    const barData = {
      labels: mesesFiltrados,
      datasets: Object.keys(categorias).flatMap((cat, index) => {
        const catData = {
          label: cat,
          data: mesesFiltrados.map((mes) =>
            subcategorias
              .filter((s) => s.categoria === cat)
              .reduce((sum, s) => sum + (s.ventas?.[mes] || 0), 0)
          ),
          backgroundColor: `rgba(${[26, 211, 56, 255, 171, 66][index % 6]}, ${
            [115, 47, 142, 167, 71, 165][index % 6]
          }, ${[232, 47, 60, 38, 188, 245][index % 6]}, 0.5)`,
          borderColor: `rgba(${[26, 211, 56, 255, 171, 66][index % 6]}, ${
            [115, 47, 142, 167, 71, 165][index % 6]
          }, ${[232, 47, 60, 38, 188, 245][index % 6]}, 1)`,
          borderWidth: 1,
        };
        const subData = expanded[cat]
          ? categorias[cat].map((sub) => ({
              label: sub,
              data: mesesFiltrados.map(
                (mes) =>
                  subcategorias.find((s) => s.id === sub)?.ventas?.[mes] || 0
              ),
              backgroundColor: `rgba(${
                [26, 211, 56, 255, 171, 66][index % 6]
              }, ${[115, 47, 142, 167, 71, 165][index % 6]}, ${
                [232, 47, 60, 38, 188, 245][index % 6]
              }, 0.3)`,
              borderColor: `rgba(${[26, 211, 56, 255, 171, 66][index % 6]}, ${
                [115, 47, 142, 167, 71, 165][index % 6]
              }, ${[232, 47, 60, 38, 188, 245][index % 6]}, 0.8)`,
              borderWidth: 1,
            }))
          : [];
        return [catData, ...subData];
      }),
    };

    // Renderizar gráficos
    React.useEffect(() => {
      const pieCtx = pieChartRef.current.getContext("2d");
      const pieChart = new Chart(pieCtx, {
        type: "pie",
        data: pieData,
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "top",
              labels: { font: { family: "Inter", size: 14 } },
            },
            title: {
              display: true,
              text: "Distribución de Ventas por Categoría",
              font: { family: "Inter", size: 18 },
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.raw;
                  const percentage = totalGeneral
                    ? ((value / totalGeneral) * 100).toFixed(2)
                    : 0;
                  return `${context.label}: ${value} unidades (${percentage}%)`;
                },
              },
            },
          },
        },
      });

      const barCtx = barChartRef.current.getContext("2d");
      const barChart = new Chart(barCtx, {
        type: "bar",
        data: barData,
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: "Unidades Vendidas" },
            },
            x: { title: { display: true, text: "Mes" } },
          },
          plugins: {
            legend: {
              position: "top",
              labels: { font: { family: "Inter", size: 14 } },
            },
            title: {
              display: true,
              text: "Ventas Mensuales por Categoría y Subcategoría",
              font: { family: "Inter", size: 18 },
            },
          },
        },
      });

      return () => {
        pieChart.destroy();
        barChart.destroy();
      };
    }, [mesesFiltrados, subcategorias, expanded]);

    return React.createElement(
      "div",
      { className: "estadisticas" },
      React.createElement("h2", null, "Estadísticas"),
      React.createElement(
        "div",
        { className: "filtros" },
        React.createElement(
          "select",
          { value: mesInicio, onChange: (e) => setMesInicio(e.target.value) },
          meses.map((mes) =>
            React.createElement("option", { key: mes, value: mes }, mes)
          )
        ),
        React.createElement(
          "select",
          {
            value: mesFinal,
            onChange: (e) => {
              if (meses.indexOf(e.target.value) >= meses.indexOf(mesInicio)) {
                setMesFinal(e.target.value);
              }
            },
          },
          meses.map((mes) =>
            React.createElement("option", { key: mes, value: mes }, mes)
          )
        )
      ),
      React.createElement(
        "div",
        { className: "controles-categorias" },
        Object.keys(categorias).map((cat) =>
          React.createElement(
            "button",
            {
              key: cat,
              className: expanded[cat]
                ? "categoria-btn active"
                : "categoria-btn",
              onClick: () => toggleCategoria(cat),
            },
            expanded[cat] ? `Ocultar ${cat}` : `Mostrar ${cat}`
          )
        )
      ),
      React.createElement(
        "div",
        { className: "chart-container" },
        React.createElement("canvas", { ref: pieChartRef })
      ),
      React.createElement(
        "div",
        { className: "chart-container" },
        React.createElement("canvas", { ref: barChartRef })
      )
    );
  }

  // Tabla de ventas
  function VerVentas() {
    const [expanded, setExpanded] = React.useState({});

    const toggleCategoria = (cat) => {
      setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
    };

    const mesesFiltrados = meses.slice(
      meses.indexOf(mesInicio),
      meses.indexOf(mesFinal) + 1
    );

    const formatMonthVertical = (mes) => {
      const [month, year] = mes.split("-");
      return `${month[0].toUpperCase()}<br />${month[1]}<br />${month[2]}
        <br />${year[2]}<br />${year[3]}`;
    };

    const calcularMesesStock = async (subcategoria) => {
      const sub = subcategorias.find((s) => s.id === subcategoria);
      if (!sub) return 0;
      const stock = sub.stock || 0;
      const ventasSnapshot = await getDocs(
        collection(db, "stock1", subcategoria, "unidadesVendidas")
      );
      const ventas = ventasSnapshot.docs.map((doc) => doc.data().unidades);
      const promedio =
        ventas.length > 0
          ? ventas.reduce((sum, val) => sum + val, 0) / meses.length
          : 0;
      return Math.floor(stock / (promedio || 1));
    };

    const calcularMesesStockCategoria = async (cat) => {
      const subs = categorias[cat];
      // Sumar el stock total de todas las subcategorías
      const stockTotal = subcategorias
        .filter((s) => s.categoria === cat)
        .reduce((sum, s) => sum + (s.stock || 0), 0);

      // Sumar todas las ventas históricas de las subcategorías
      let ventasTotales = 0;
      for (const sub of subs) {
        const ventasSnapshot = await getDocs(
          collection(db, "stock1", sub, "unidadesVendidas")
        );
        const ventasSub = ventasSnapshot.docs.map((doc) => doc.data().unidades);
        ventasTotales += ventasSub.reduce((sum, val) => sum + val, 0);
      }

      // Calcular el promedio de ventas mensuales
      const promedio = ventasTotales > 0 ? ventasTotales / meses.length : 0;

      // Calcular meses de stock
      return Math.floor(stockTotal / (promedio || 1));
    };
    const exportToExcel = async () => {
      try {
        const data = [];
        const headers = [
          "Tipo",
          `Categoría/<br />Subcategoría`,
          "Stock",
          "Ventas Totales",
          ...mesesFiltrados,
          `Meses de<br />Stock`,
        ];
        data.push(headers);

        for (const cat of Object.keys(categorias)) {
          // Fila de la categoría (siempre incluida)
          const stockCategoria = subcategorias
            .filter((s) => s.categoria === cat)
            .reduce((sum, s) => sum + (s.stock || 0), 0);

          const ventasTotalesCategoria = subcategorias
            .filter((s) => s.categoria === cat)
            .reduce(
              (sum, s) =>
                sum +
                Object.entries(s.ventas || {})
                  .filter(([mes]) => mesesFiltrados.includes(mes))
                  .reduce((vSum, [, v]) => vSum + v, 0),
              0
            );

          const mesesStockCat = await calcularMesesStockCategoria(cat);
          const rowCategoria = [
            "Categoría",
            cat,
            stockCategoria,
            ventasTotalesCategoria,
            ...mesesFiltrados.map((mes) =>
              subcategorias
                .filter((s) => s.categoria === cat)
                .reduce((sum, s) => sum + (s.ventas?.[mes] || 0), 0)
            ),
            mesesStockCat,
          ];
          data.push(rowCategoria);

          // Bucle para incluir siempre todas las subcategorías
          for (const sub of categorias[cat]) {
            const subData = subcategorias.find((s) => s.id === sub);
            const mesesStockSub = await calcularMesesStock(sub);

            const ventasTotalesSub = Object.entries(subData?.ventas || {})
              .filter(([mes]) => mesesFiltrados.includes(mes))
              .reduce((sum, [, v]) => sum + v, 0);

            const rowSub = [
              "Subcategoría",
              sub,
              subData?.stock || 0,
              ventasTotalesSub,
              ...mesesFiltrados.map((mes) => subData?.ventas?.[mes] || 0),
              mesesStockSub,
            ];
            data.push(rowSub);
          }
        }

        // Agregar la fila de totales generales al final
        const ventasTotalesGenerales = subcategorias.reduce(
          (sum, s) =>
            sum +
            Object.entries(s.ventas || {})
              .filter(([mes]) => mesesFiltrados.includes(mes))
              .reduce((vSum, [, v]) => vSum + v, 0),
          0
        );

        const totalesGenerales = [
          "Total General",
          "",
          subcategorias.reduce((sum, s) => sum + (s.stock || 0), 0),
          ventasTotalesGenerales,
          ...mesesFiltrados.map((mes) =>
            subcategorias.reduce((sum, s) => sum + (s.ventas?.[mes] || 0), 0)
          ),
          "",
        ];
        data.push(totalesGenerales);

        // Crear y estilizar la hoja de Excel
        const ws = XLSX.utils.aoa_to_sheet(data);

        ws["!cols"] = [
          { wch: 15 },
          { wch: 25 },
          { wch: 10 },
          { wch: 15 },
          ...mesesFiltrados.map(() => ({ wch: 10 })),
          { wch: 15 },
        ];

        data.forEach((row, i) => {
          if (i === 0) {
            row.forEach((_, colIndex) => {
              const cell = ws[XLSX.utils.encode_cell({ r: i, c: colIndex })];
              if (cell) {
                cell.s = {
                  font: { bold: true },
                  fill: { fgColor: { rgb: "C0C0C0" } },
                  alignment: { horizontal: "center" },
                };
              }
            });
          }
          if (row[0] === "Categoría") {
            row.forEach((_, colIndex) => {
              const cell = ws[XLSX.utils.encode_cell({ r: i, c: colIndex })];
              if (cell) {
                cell.s = {
                  font: { bold: true },
                  fill: { fgColor: { rgb: "DDEBF7" } },
                };
              }
            });
          }
          if (row[0] === "Total General") {
            row.forEach((_, colIndex) => {
              const cell = ws[XLSX.utils.encode_cell({ r: i, c: colIndex })];
              if (cell) {
                cell.s = {
                  font: { bold: true, color: { rgb: "FFFFFF" } },
                  fill: { fgColor: { rgb: "4472C4" } },
                };
              }
            });
          }
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte de Ventas");

        const today = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `reporte_ventas_${today}.xlsx`);

        alert("Reporte exportado exitosamente");
      } catch (error) {
        alert("Error al exportar a Excel: " + error.message);
      }
    };
    return React.createElement(
      "div",
      null,
      React.createElement("h2", null, "Ventas por Categoría"),
      React.createElement(
        "div",
        { className: "filtros" },
        React.createElement(
          "select",
          { value: mesInicio, onChange: (e) => setMesInicio(e.target.value) },
          meses.map((mes) =>
            React.createElement("option", { key: mes, value: mes }, mes)
          )
        ),
        React.createElement(
          "select",
          {
            value: mesFinal,
            onChange: (e) => {
              if (meses.indexOf(e.target.value) >= meses.indexOf(mesInicio)) {
                setMesFinal(e.target.value);
              }
            },
          },
          meses.map((mes) =>
            React.createElement("option", { key: mes, value: mes }, mes)
          )
        ),
        React.createElement(
          "button",
          { onClick: exportToExcel },
          "Exportar a Excel"
        )
      ),
      React.createElement(
        "table",
        null,
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement("th", null, "Categoría/Subcategoría"),
            React.createElement("th", null, "Stock"),
            mesesFiltrados.map((mes) =>
              React.createElement("th", {
                key: mes,
                dangerouslySetInnerHTML: { __html: formatMonthVertical(mes) },
              })
            ),
            React.createElement("th", null, "Meses de Stock")
          )
        ),
        React.createElement(
          "tbody",
          null,
          Object.keys(categorias).map((cat) =>
            React.createElement(
              React.Fragment,
              { key: cat },
              React.createElement(
                "tr",
                {
                  onClick: () => toggleCategoria(cat),
                  style: {
                    cursor: "pointer",
                    backgroundColor: "rgb(236, 228, 228)",
                  },
                },
                React.createElement(
                  "td",
                  null,
                  React.createElement("strong", null, cat)
                ),
                React.createElement(
                  "td",
                  null,
                  subcategorias
                    .filter((s) => s.categoria === cat)
                    .reduce((sum, s) => sum + (s.stock || 0), 0)
                ),
                mesesFiltrados.map((mes) =>
                  React.createElement(
                    "td",
                    { key: mes },
                    subcategorias
                      .filter((s) => s.categoria === cat)
                      .reduce((sum, s) => sum + (s.ventas?.[mes] || 0), 0)
                  )
                ),
                React.createElement(
                  "td",
                  null,
                  React.createElement(PromiseResolver, {
                    promise: calcularMesesStockCategoria(cat),
                  })
                )
              ),
              expanded[cat] &&
                categorias[cat].map((sub) =>
                  React.createElement(
                    "tr",
                    { key: sub, className: "subcategoria" },
                    React.createElement("td", null, sub),
                    React.createElement(
                      "td",
                      null,
                      subcategorias.find((s) => s.id === sub)?.stock || 0
                    ),
                    mesesFiltrados.map((mes) =>
                      React.createElement(
                        "td",
                        { key: mes },
                        subcategorias.find((s) => s.id === sub)?.ventas?.[
                          mes
                        ] || 0
                      )
                    ),
                    React.createElement(
                      "td",
                      null,
                      React.createElement(PromiseResolver, {
                        promise: calcularMesesStock(sub),
                      })
                    )
                  )
                )
            )
          )
        )
      )
    );
  }

  // Componente para resolver promesas en React
  function PromiseResolver({ promise }) {
    const [value, setValue] = React.useState(null);
    React.useEffect(() => {
      promise.then((result) => setValue(result));
    }, [promise]);
    return value !== null ? value : "Calculando...";
  }

  return React.createElement(
    "div",
    null,
    React.createElement(
      "nav",
      { className: "nave" },
      null,

      React.createElement(
        "button",
        { onClick: () => setSeccion("registrarVentas") },

        "Registrar Ventas"
      ),
      React.createElement(
        "button",
        { onClick: () => setSeccion("modificarStock") },
        "Modificar Stock"
      ),
      React.createElement(
        "button",
        { onClick: () => setSeccion("verVentas") },
        "Ver Ventas"
      ),
      React.createElement(
        "button",
        { onClick: () => setSeccion("estadisticas") },
        "Estadísticas"
      ),
      React.createElement(
        "button",
        { onClick: () => setShowModal(true) },
        "Resetear Stock"
      )
    ),
    React.createElement(
      "div",
      null,
      seccion === "registrarVentas" && React.createElement(RegistrarVentas),
      seccion === "modificarStock" && React.createElement(ModificarStock),
      seccion === "verVentas" && React.createElement(VerVentas),
      seccion === "estadisticas" && React.createElement(Estadisticas)
    ),
    showModal &&
      React.createElement(
        "div",
        { className: "modal" },
        React.createElement(
          "p",
          null,
          "¿Estás seguro de resetear el stock de todos los artículos a 0? Esto no afectará las unidades vendidas."
        ),
        React.createElement("button", { onClick: resetStock }, "Confirmar"),
        React.createElement(
          "button",
          { onClick: () => setShowModal(false) },
          "Cancelar"
        )
      )
  );
}

ReactDOM.render(React.createElement(App), document.getElementById("root"));
