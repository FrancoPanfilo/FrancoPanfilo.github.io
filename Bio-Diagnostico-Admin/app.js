const firebaseConfig = {
  apiKey: "AIzaSyCaoKajIMiN3Y8AtPz5X2brHm0YOsFqiuo",
  authDomain: "azalea-92a39.firebaseapp.com",
  projectId: "azalea-92a39",
  storageBucket: "azalea-92a39.appspot.com",
  messagingSenderId: "564234531814",
  appId: "1:564234531814:web:ba8f9c434cd576b01e5c27",
  measurementId: "G-MX1L41XYVE",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function App() {
  const [seccion, setSeccion] = React.useState('verVentas');
  const [subcategorias, setSubcategorias] = React.useState([]);
  const [meses, setMeses] = React.useState([]);
  const [mesInicio, setMesInicio] = React.useState('');
  const [mesFinal, setMesFinal] = React.useState('');
  const [showModal, setShowModal] = React.useState(false);
  const categorias = {
    Palos: ['Drivers', 'Maderas', 'Híbridos', 'Set de Hierros', 'Wedges', 'Putters'],
    Bolsas: ['Carro', 'Trípode'],
    Indumentaria: ['Remeras', 'Buzos', 'Gorros', 'Cinturones', 'Bottoms'],
    Zapatos: Array.from({ length: 11 }, (_, i) => `Talle ${35 + i}`),
    Guantes: ['Cabretta', 'Normal'],
    Pelotas: ['Docenas', 'Tubos']
  };

  // Normalizar formato de mes
  const formatMonthKey = (month, year) => {
    const mesNombre = month.toLocaleString('es', { month: 'long' });
    const mesAbreviado = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1, 3).toLowerCase();
    return `${mesAbreviado}-${year}`;
  };

  // Cargar subcategorías y meses
  React.useEffect(() => {
    const unsubscribe = db.collection('stock1').onSnapshot(async (snapshot) => {
      const subs = [];
      for (const doc of snapshot.docs) {
        const subData = { id: doc.id, ...doc.data(), ventas: {} };
        const ventasSnapshot = await db.collection('stock1').doc(doc.id).collection('unidadesVendidas').get();
        ventasSnapshot.forEach((ventaDoc) => {
          const ventaData = ventaDoc.data();
          subData.ventas[ventaData.mes] = ventaData.unidades;
        });
        subs.push(subData);
      }
      setSubcategorias(subs);
    });

    // Generar meses desde Julio 2024 hasta Agosto 2025
    const mesesList = [];
    let date = new Date(2024, 6); // Julio 2024
    const endDate = new Date(2025, 7); // Agosto 2025
    while (date <= endDate) {
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
        const docRef = db.collection('stock1').doc(sub);
        const doc = await docRef.get();
        if (!doc.exists) {
          await docRef.set({
            categoria: cat,
            subcategoria: sub,
            stock: 0,
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
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
        const docRef = db.collection('stock1').doc(sub.id);
        batch.update(docRef, { stock: 0, fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp() });
      });
      await batch.commit();
      await db.collection('historialCambios').add({
        subcategoria: 'Todas',
        tipo: 'Reset',
        unidades: 0,
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
      });
      alert('Stock reseteado a 0');
      setShowModal(false);
    } catch (error) {
      alert('Error: ' + error.message);
      setShowModal(false);
    }
  };

  // Formulario para registrar ventas
  function RegistrarVentas() {
    const [mes, setMes] = React.useState(meses[0] || '');
    const [ventasForm, setVentasForm] = React.useState(
      Object.keys(categorias).flatMap((cat) => categorias[cat].map((sub) => ({ sub, unidades: 0 })))
    );

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        for (const item of ventasForm) {
          const unidades = item.unidades;
          if (unidades > 0) {
            const ventaRef = db.collection('stock1').doc(item.sub).collection('unidadesVendidas').doc(mes);
            const ventaDoc = await ventaRef.get();
            if (ventaDoc.exists) throw new Error(`Venta ya registrada para ${item.sub} en ${mes}`);
            const stockDoc = await db.collection('stock1').doc(item.sub).get();
            const currentStock = stockDoc.data().stock || 0;
            if (unidades > currentStock) throw new Error(`Stock insuficiente para ${item.sub}`);
            await ventaRef.set({
              mes,
              unidades,
              fecha: firebase.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection('stock1').doc(item.sub).update({
              stock: currentStock - unidades,
              fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection('historialCambios').add({
              subcategoria: item.sub,
              tipo: 'Venta',
              unidades: -unidades,
              mes,
              fecha: firebase.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
        alert('Ventas registradas');
        setVentasForm(ventasForm.map((item) => ({ ...item, unidades: 0 })));
      } catch (error) {
        alert('Error: ' + error.message);
      }
    };

    const handleUnidadesChange = (sub, value) => {
      setVentasForm(ventasForm.map((item) => item.sub === sub ? { ...item, unidades: parseInt(value) || 0 } : item));
    };

    return (
      <div>
        <h2>Registrar Ventas por Mes</h2>
        <form onSubmit={handleSubmit}>
          <label>Mes</label>
          <select value={mes} onChange={(e) => setMes(e.target.value)}>
            {meses.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {Object.entries(categorias).map(([cat, subs]) => (
            <div key={cat}>
              <h3>{cat}</h3>
              {subs.map((sub) => (
                <div key={sub}>
                  <label>{sub}</label>
                  <input
                    type="number"
                    min="0"
                    value={ventasForm.find((item) => item.sub === sub)?.unidades || 0}
                    onChange={(e) => handleUnidadesChange(sub, e.target.value)}
                  />
                </div>
              ))}
            </div>
          ))}
          <button type="submit">Registrar Ventas</button>
        </form>
      </div>
    );
  }

  // Formulario para modificar stock
  function ModificarStock() {
    const [stockForm, setStockForm] = React.useState(
      Object.keys(categorias).flatMap((cat) => categorias[cat].map((sub) => ({ sub, unidades: 0 })))
    );

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        for (const item of stockForm) {
          const unidades = item.unidades;
          if (unidades > 0) {
            const docRef = db.collection('stock1').doc(item.sub);
            const doc = await docRef.get();
            const currentStock = doc.data().stock || 0;
            await docRef.update({
              stock: currentStock + unidades,
              fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection('historialCambios').add({
              subcategoria: item.sub,
              tipo: 'Ingreso',
              unidades,
              fecha: firebase.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
        alert('Stock actualizado');
        setStockForm(stockForm.map((item) => ({ ...item, unidades: 0 })));
      } catch (error) {
        alert('Error: ' + error.message);
      }
    };

    const handleUnidadesChange = (sub, value) => {
      setStockForm(stockForm.map((item) => item.sub === sub ? { ...item, unidades: parseInt(value) || 0 } : item));
    };

    return (
      <div>
        <h2>Modificar Stock</h2>
        <form onSubmit={handleSubmit}>
          {Object.entries(categorias).map(([cat, subs]) => (
            <div key={cat}>
              <h3>{cat}</h3>
              {subs.map((sub) => (
                <div key={sub}>
                  <label>{sub}</label>
                  <input
                    type="number"
                    min="0"
                    value={stockForm.find((item) => item.sub === sub)?.unidades || 0}
                    onChange={(e) => handleUnidadesChange(sub, e.target.value)}
                  />
                </div>
              ))}
            </div>
          ))}
          <button type="submit">Actualizar Stock</button>
        </form>
      </div>
    );
  }

  // Sección de estadísticas
  function Estadisticas() {
    const mesesFiltrados = meses.slice(meses.indexOf(mesInicio), meses.indexOf(mesFinal) + 1);

    // Ventas totales por categoría
    const ventasPorCategoria = Object.keys(categorias).reduce((acc, cat) => {
      const total = subcategorias
        .filter((s) => s.categoria === cat)
        .reduce((sum, s) => sum + Object.entries(s.ventas || {})
          .filter(([mes]) => mesesFiltrados.includes(mes))
          .reduce((sum, [, unidades]) => sum + unidades, 0), 0);
      acc[cat] = total;
      return acc;
    }, {});

    // Subcategorías más vendidas
    const subMasVendidas = subcategorias
      .map((s) => ({
        subcategoria: s.subcategoria,
        total: Object.entries(s.ventas || {})
          .filter(([mes]) => mesesFiltrados.includes(mes))
          .reduce((sum, [, unidades]) => sum + unidades, 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Promedio de ventas mensuales por subcategoría
    const promedioVentas = subcategorias.map((s) => {
      const ventas = Object.entries(s.ventas || {})
        .filter(([mes]) => mesesFiltrados.includes(mes))
        .reduce((sum, [, unidades]) => sum + unidades, 0);
      return {
        subcategoria: s.subcategoria,
        promedio: mesesFiltrados.length > 0 ? (ventas / mesesFiltrados.length).toFixed(1) : 0
      };
    }).sort((a, b) => b.promedio - a.promedio);

    // Alertas de stock bajo
    const calcularMesesStock = async (subcategoria) => {
      const sub = subcategorias.find((s) => s.id === subcategoria);
      if (!sub) return 0;
      const stock = sub.stock || 0;
      const ventasSnapshot = await db.collection('stock1').doc(subcategoria).collection('unidadesVendidas').get();
      const ventas = ventasSnapshot.docs.map((doc) => doc.data().unidades);
      const promedio = ventas.length > 0 ? ventas.reduce((sum, val) => sum + val, 0) / meses.length : 0;
      return Math.floor(stock / (promedio || 1));
    };

    const stockBajo = React.useRef([]);
    React.useEffect(() => {
      const fetchStockBajo = async () => {
        const promesas = subcategorias.map((s) => calcularMesesStock(s.id));
        const resultados = await Promise.all(promesas);
        stockBajo.current = subcategorias
          .filter((_, i) => resultados[i] < 2 && resultados[i] >= 0)
          .map((s, i) => ({ subcategoria: s.subcategoria, meses: resultados[i] }));
      };
      fetchStockBajo();
    }, [subcategorias]);

    // Gráfico de ventas por categoría
    const chartRef = React.useRef(null);
    React.useEffect(() => {
      const ctx = chartRef.current.getContext('2d');
      const datasets = Object.keys(categorias).map((cat, index) => ({
        label: cat,
        data: mesesFiltrados.map((mes) => 
          subcategorias
            .filter((s) => s.categoria === cat)
            .reduce((sum, s) => sum + (s.ventas?.[mes] || 0), 0)
        ),
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(153, 102, 255, 0.5)',
          'rgba(255, 159, 64, 0.5)'
        ][index % 6],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ][index % 6],
        borderWidth: 1
      }));

      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: mesesFiltrados,
          datasets
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Unidades Vendidas' }
            },
            x: { title: { display: true, text: 'Mes' } }
          },
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Ventas Mensuales por Categoría' }
          }
        }
      });

      return () => chart.destroy();
    }, [mesesFiltrados, subcategorias]);

    return (
      <div className="estadisticas">
        <h2>Estadísticas</h2>
        <div className="filtros">
          <select value={mesInicio} onChange={(e) => setMesInicio(e.target.value)}>
            {meses.map((mes) => (
              <option key={mes} value={mes}>{mes}</option>
            ))}
          </select>
          <select
            value={mesFinal}
            onChange={(e) => {
              if (meses.indexOf(e.target.value) >= meses.indexOf(mesInicio)) {
                setMesFinal(e.target.value);
              }
            }}
          >
            {meses.map((mes) => (
              <option key={mes} value={mes}>{mes}</option>
            ))}
          </select>
        </div>
        <h3>Ventas Totales por Categoría</h3>
        <ul>
          {Object.entries(ventasPorCategoria).map(([cat, total]) => (
            <li key={cat}>{cat}: {total} unidades</li>
          ))}
        </ul>
        <h3>Subcategorías Más Vendidas</h3>
        <ul>
          {subMasVendidas.map((item) => (
            <li key={item.subcategoria}>{item.subcategoria}: {item.total} unidades</li>
          ))}
        </ul>
        <h3>Promedio de Ventas Mensuales por Subcategoría</h3>
        <ul>
          {promedioVentas.map((item) => (
            <li key={item.subcategoria}>{item.subcategoria}: {item.promedio} unidades/mes</li>
          ))}
        </ul>
        <h3>Alertas de Stock Bajo (Menor a 2 Meses)</h3>
        <ul>
          {stockBajo.current.map((item) => (
            <li key={item.subcategoria}>{item.subcategoria}: {item.meses} meses</li>
          ))}
        </ul>
        <div className="chart-container">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
    );
  }

  // Tabla de ventas
  function VerVentas() {
    const [expanded, setExpanded] = React.useState({});

    const toggleCategoria = (cat) => {
      setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
    };

    const mesesFiltrados = meses.slice(meses.indexOf(mesInicio), meses.indexOf(mesFinal) + 1);

    const formatMonthVertical = (mes) => {
      const [month, year] = mes.split('-');
      return `${month[0].toUpperCase()}<br />${month[1].toLowerCase()}<br />${year[2]}<br />${year[3]}`;
    };

    const calcularMesesStock = async (subcategoria) => {
      const sub = subcategorias.find((s) => s.id === subcategoria);
      if (!sub) return 0;
      const stock = sub.stock || 0;
      const ventasSnapshot = await db.collection('stock1').doc(subcategoria).collection('unidadesVendidas').get();
      const ventas = ventasSnapshot.docs.map((doc) => doc.data().unidades);
      const promedio = ventas.length > 0 ? ventas.reduce((sum, val) => sum + val, 0) / meses.length : 0;
      return Math.floor(stock / (promedio || 1));
    };

    const calcularMesesStockCategoria = async (cat) => {
      const subs = categorias[cat];
      const mesesSubs = await Promise.all(subs.map((sub) => calcularMesesStock(sub)));
      return Math.min(...mesesSubs.filter((m) => !isNaN(m) && isFinite(m)) || [0]);
    };

    const exportToExcel = async () => {
      // Cargar SheetJS dinámicamente
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.async = true;
      document.body.appendChild(script);
      script.onload = async () => {
        try {
          const data = [];
          // Encabezados
          const headers = ['Categoría/Subcategoría', 'Stock', ...mesesFiltrados, 'Meses de Stock'];
          data.push(headers);

          // Filas
          for (const cat of Object.keys(categorias)) {
            const stockCategoria = subcategorias.filter((s) => s.categoria === cat).reduce((sum, s) => sum + (s.stock || 0), 0);
            const mesesStockCat = await calcularMesesStockCategoria(cat);
            const rowCategoria = [cat, stockCategoria];
            mesesFiltrados.forEach((mes) => {
              const ventasMes = subcategorias
                .filter((s) => s.categoria === cat)
                .reduce((sum, s) => sum + (s.ventas?.[mes] || 0), 0);
              rowCategoria.push(ventasMes);
            });
            rowCategoria.push(mesesStockCat);
            data.push(rowCategoria);

            if (expanded[cat]) {
              for (const sub of categorias[cat]) {
                const subData = subcategorias.find((s) => s.id === sub);
                const mesesStockSub = await calcularMesesStock(sub);
                const rowSub = [`    ${sub}`, subData?.stock || 0];
                mesesFiltrados.forEach((mes) => {
                  rowSub.push(subData?.ventas?.[mes] || 0);
                });
                rowSub.push(mesesStockSub);
                data.push(rowSub);
              }
            }
          }

          // Crear hoja de cálculo
          const ws = XLSX.utils.aoa_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Ventas por Categoría');
          XLSX.write(wb, 'ventas_por_categoria.xlsx');
        } catch (error) {
          alert('Error al exportar a Excel: ' + error.message);
        }
      };
      script.onerror = () => alert('Error al cargar la librería de Excel');
    };

    return (
      <div>
        <h2>Ventas por Categoría</h2>
        <div className="filtros">
          <select value={mesInicio} onChange={(e) => setMesInicio(e.target.value)}>
            {meses.map((mes) => (
              <option key={mes} value={mes}>{mes}</option>
            ))}
          </select>
          <select
            value={mesFinal}
            onChange={(e) => {
              if (meses.indexOf(e.target.value) >= meses.indexOf(mesInicio)) {
                setMesFinal(e.target.value);
              }
            }}
          >
            {meses.map((mes) => (
              <option key={mes} value={mes}>{mes}</option>
            ))}
          </select>
          <button onClick={exportToExcel}>Exportar a Excel</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Categoría/Subcategoría</th>
              <th>Stock</th>
              {mesesFiltrados.map((mes) => (
                <th key={mes} dangerouslySetInnerHTML={{ __html: formatMonthVertical(mes) }}></th>
              ))}
              <th>Meses de Stock</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(categorias).map((cat) => (
              <React.Fragment key={cat}>
                <tr onClick={() => toggleCategoria(cat)} style={{ cursor: 'pointer' }}>
                  <td><strong>{cat}</strong></td>
                  <td>{subcategorias.filter((s) => s.categoria === cat).reduce((sum, s) => sum + (s.stock || 0), 0)}</td>
                  {mesesFiltrados.map((mes) => (
                    <td key={mes}>
                      {subcategorias.filter((s) => s.categoria === cat).reduce((sum, s) => sum + (s.ventas?.[mes] || 0), 0)}
                    </td>
                  ))}
                  <td>
                    <PromiseResolver promise={calcularMesesStockCategoria(cat)} />
                  </td>
                </tr>
                {expanded[cat] && categorias[cat].map((sub) => (
                  <tr key={sub} className="subcategoria">
                    <td>{sub}</td>
                    <td>{subcategorias.find((s) => s.id === sub)?.stock || 0}</td>
                    {mesesFiltrados.map((mes) => (
                      <td key={mes}>{subcategorias.find((s) => s.id === sub)?.ventas?.[mes] || 0}</td>
                    ))}
                    <td>
                      <PromiseResolver promise={calcularMesesStock(sub)} />
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Componente para resolver promesas en React
  function PromiseResolver({ promise }) {
    const [value, setValue] = React.useState(null);
    React.useEffect(() => {
      promise.then((result) => setValue(result));
    }, [promise]);
    return value !== null ? value : 'Calculando...';
  }

  return (
    <div>
      <nav>
        <button onClick={() => setSeccion('registrarVentas')}>Registrar Ventas</button>
        <button onClick={() => setSeccion('modificarStock')}>Modificar Stock</button>
        <button onClick={() => setSeccion('verVentas')}>Ver Ventas</button>
        <button onClick={() => setSeccion('estadisticas')}>Estadísticas</button>
        <button onClick={() => setShowModal(true)}>Resetear Stock</button>
      </nav>
      <div>
        {seccion === 'registrarVentas' && <RegistrarVentas />}
        {seccion === 'modificarStock' && <ModificarStock />}
        {seccion === 'verVentas' && <VerVentas />}
        {seccion === 'estadisticas' && <Estadisticas />}
      </div>
      {showModal && (
        <div className="modal">
          <p>¿Estás seguro de resetear el stock de todos los artículos a 0? Esto no afectará las unidades vendidas.</p>
          <button onClick={resetStock}>Confirmar</button>
          <button onClick={() => setShowModal(false)}>Cancelar</button>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));