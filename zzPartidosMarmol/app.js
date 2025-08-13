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
  const [seccion, setSeccion] = React.useState('verStock');
  const [productos, setProductos] = React.useState([]);
  const [ventas, setVentas] = React.useState([]);
  const marcas = ['Callaway', 'Adidas', 'Under Armour', 'Travis Mathew', 'Nike', 'TaylorMade'];
  const categorias = ['Buzo', 'Polo', 'Campera', 'Bermuda', 'Cinturón'];
  const tallesPorCategoria = {
    Buzo: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    Polo: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    Campera: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    Bermuda: ['32', '33', '34', '35', '36'],
    Cinturón: ['32', '34', '-']
  };

  // Cargar productos desde Firestore
  React.useEffect(() => {
    const unsubscribeStock = db.collection('Stock').onSnapshot((snapshot) => {
      const productosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductos(productosData);
    });
    const unsubscribeVentas = db.collection('Ventas').onSnapshot((snapshot) => {
      const ventasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setVentas(ventasData);
    });
    return () => {
      unsubscribeStock();
      unsubscribeVentas();
    };
  }, []);

  // Formulario para crear producto
  function CrearProducto() {
    const [form, setForm] = React.useState({
      codigo: '',
      nombre: '',
      precio: '',
      marca: marcas[0],
      categoria: categorias[0],
      talles: {}
    });

    const handleCategoriaChange = (cat) => {
      const talles = tallesPorCategoria[cat].reduce((obj, talle) => ({ ...obj, [talle]: 0 }), {});
      setForm({ ...form, categoria: cat, talles });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const docRef = db.collection('Stock').doc(form.codigo);
        const doc = await docRef.get();
        if (doc.exists) throw new Error('Código ya existe');
        await docRef.set({
          ...form,
          precioUnitario: parseFloat(form.precio) || 0,
          totalStock: 0,
          umbralAlerta: 5,
          fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
        });
        alert('Producto creado');
        setForm({ codigo: '', nombre: '', precio: '', marca: marcas[0], categoria: categorias[0], talles: {} });
      } catch (error) {
        alert('Error: ' + error.message);
      }
    };

    return (
      <div>
        <h2>Crear Producto</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Código (ej: CAL_CGM768)"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Precio Unitario"
            value={form.precio}
            onChange={(e) => setForm({ ...form, precio: e.target.value })}
            step="0.01"
            min="0"
            required
          />
          <select
            value={form.marca}
            onChange={(e) => setForm({ ...form, marca: e.target.value })}
          >
            {marcas.map((marca) => (
              <option key={marca} value={marca}>{marca}</option>
            ))}
          </select>
          <select
            value={form.categoria}
            onChange={(e) => handleCategoriaChange(e.target.value)}
          >
            {categorias.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button type="submit">Crear Producto</button>
        </form>
      </div>
    );
  }

  // Formulario para cargar stock
  function CargarStock() {
    const [productoId, setProductoId] = React.useState('');
    const [talles, setTalles] = React.useState({});

    const handleProductoChange = async (id) => {
      setProductoId(id);
      if (id) {
        const doc = await db.collection('Stock').doc(id).get();
        if (doc.exists) {
          setTalles(doc.data().talles);
        }
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const docRef = db.collection('Stock').doc(productoId);
        const doc = await docRef.get();
        if (!doc.exists) throw new Error('Producto no encontrado');
        const currentTalles = doc.data().talles;
        const updatedTalles = { ...currentTalles };
        Object.keys(talles).forEach((talle) => {
          updatedTalles[talle] = (currentTalles[talle] || 0) + (parseInt(talles[talle]) || 0);
        });
        const totalStock = Object.values(updatedTalles).reduce((sum, val) => sum + val, 0);
        await docRef.update({
          talles: updatedTalles,
          totalStock,
          fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
        });
        alert('Stock actualizado');
        setTalles({});
        setProductoId('');
      } catch (error) {
        alert('Error: ' + error.message);
      }
    };

    return (
      <div>
        <h2>Cargar Stock</h2>
        <form onSubmit={handleSubmit}>
          <select value={productoId} onChange={(e) => handleProductoChange(e.target.value)}>
            <option value="">Seleccionar Producto</option>
            {productos.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.codigo} - {prod.nombre} - {prod.marca}
              </option>
            ))}
          </select>
          {productoId && Object.keys(talles).map((talle) => (
            <div key={talle}>
              <label>{talle}:</label>
              <input
                type="number"
                min="0"
                value={talles[talle] || ''}
                onChange={(e) => setTalles({ ...talles, [talle]: e.target.value })}
                placeholder="0"
              />
            </div>
          ))}
          <button type="submit">Actualizar Stock</button>
        </form>
      </div>
    );
  }

  // Formulario para registrar venta
  function RegistrarVenta() {
    const [form, setForm] = React.useState({
      numeroFactura: '',
      productoId: '',
      talle: '',
      cantidad: '1',
    });
    const [tallesDisponibles, setTallesDisponibles] = React.useState([]);

    const handleProductoChange = async (id) => {
      setForm({ ...form, productoId: id, talle: '' });
      if (id) {
        const doc = await db.collection('Stock').doc(id).get();
        if (doc.exists) {
          const talles = Object.entries(doc.data().talles)
            .filter(([_, stock]) => stock > 0)
            .map(([talle]) => talle);
          setTallesDisponibles(talles);
        }
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const ventaRef = db.collection('Ventas').doc(form.numeroFactura);
        const ventaDoc = await ventaRef.get();
        if (ventaDoc.exists) throw new Error('Número de factura ya existe');
        const docRef = db.collection('Stock').doc(form.productoId);
        const doc = await docRef.get();
        if (!doc.exists) throw new Error('Producto no encontrado');
        const currentTalles = doc.data().talles;
        const stockActual = currentTalles[form.talle] || 0;
        const cantidad = parseInt(form.cantidad);
        if (stockActual < cantidad) throw new Error('Stock insuficiente');
        const updatedTalles = { ...currentTalles, [form.talle]: stockActual - cantidad };
        const totalStock = Object.values(updatedTalles).reduce((sum, val) => sum + val, 0);
        await docRef.update({
          talles: updatedTalles,
          totalStock,
          fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
        });
        await ventaRef.set({
          numeroFactura: form.numeroFactura,
          codigoProducto: form.productoId,
          talle: form.talle,
          cantidad,
          fecha: firebase.firestore.FieldValue.serverTimestamp(),
          precioTotal: cantidad * doc.data().precioUnitario,
        });
        alert('Venta registrada');
        setForm({ numeroFactura: '', productoId: '', talle: '', cantidad: '1' });
        setTallesDisponibles([]);
      } catch (error) {
        alert('Error: ' + error.message);
      }
    };

    return (
      <div>
        <h2>Registrar Venta</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Número de Factura"
            value={form.numeroFactura}
            onChange={(e) => setForm({ ...form, numeroFactura: e.target.value })}
            required
          />
          <select
            value={form.productoId}
            onChange={(e) => handleProductoChange(e.target.value)}
          >
            <option value="">Seleccionar Producto</option>
            {productos.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.codigo} - {prod.nombre} - {prod.marca}
              </option>
            ))}
          </select>
          {form.productoId && (
            <select
              value={form.talle}
              onChange={(e) => setForm({ ...form, talle: e.target.value })}
            >
              <option value="">Seleccionar Talle</option>
              {tallesDisponibles.map((talle) => (
                <option key={talle} value={talle}>{talle}</option>
              ))}
            </select>
          )}
          <input
            type="number"
            placeholder="Cantidad"
            value={form.cantidad}
            onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
            min="1"
            required
          />
          <button type="submit">Registrar Venta</button>
        </form>
      </div>
    );
  }

  // Sección para ver stock
  function VerStock() {
    const [filtroMarca, setFiltroMarca] = React.useState('');
    const [filtroTipo, setFiltroTipo] = React.useState('');
    const [soloStock, setSoloStock] = React.useState(false);
    const [busqueda, setBusqueda] = React.useState('');

    const productosFiltrados = productos.filter((prod) => {
      const matchesMarca = !filtroMarca || prod.marca === filtroMarca;
      const matchesTipo = !filtroTipo || prod.tipo === filtroTipo;
      const matchesStock = !soloStock || prod.totalStock > 0;
      const matchesBusqueda = !busqueda || prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) || prod.codigo.toLowerCase().includes(busqueda.toLowerCase());
      return matchesMarca && matchesTipo && matchesStock && matchesBusqueda;
    });

    return (
      <div>
        <h2>Inventario</h2>
        <input
          type="text"
          placeholder="Buscar por nombre o código"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)}>
          <option value="">Todas las Marcas</option>
          {marcas.map((marca) => (
            <option key={marca} value={marca}>{marca}</option>
          ))}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos los Tipos</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            checked={soloStock}
            onChange={(e) => setSoloStock(e.target.checked)}
          />
          Mostrar solo con stock
        </label>
        <table border="1">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Marca</th>
              <th>Tipo</th>
              <th>Talles</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((prod) => (
              <tr key={prod.id}>
                <td>{prod.codigo}</td>
                <td>{prod.nombre}</td>
                <td>{prod.marca}</td>
                <td>{prod.tipo}</td>
                <td>
                  {Object.entries(prod.talles).map(([talle, cantidad]) => (
                    <span key={talle}>
                      {talle}: {cantidad} 
                    </span>
                  ))}
                </td>
                <td>{prod.totalStock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Sección de estadísticas
  function Estadisticas() {
    const ventasPorMarca = ventas.reduce((acc, venta) => {
      const producto = productos.find((p) => p.id === venta.codigoProducto);
      const marca = producto ? producto.marca : 'Desconocida';
      acc[marca] = (acc[marca] || 0) + venta.cantidad;
      return acc;
    }, {});

    const ventasPorTalle = ventas.reduce((acc, venta) => {
      acc[venta.talle] = (acc[venta.talle] || 0) + venta.cantidad;
      return acc;
    }, {});

    const stockBajo = productos.filter((prod) =>
      Object.values(prod.talles).some((stock) => stock > 0 && stock < prod.umbralAlerta)
    );

    return (
      <div>
        <h2>Estadísticas y Alertas</h2>
        <h3>Ventas por Marca</h3>
        <ul>
          {Object.entries(ventasPorMarca).map(([marca, cantidad]) => (
            <li key={marca}>{marca}: {cantidad} unidades</li>
          ))}
        </ul>
        <h3>Talles Más Vendidos</h3>
        <ul>
          {Object.entries(ventasPorTalle).map(([talle, cantidad]) => (
            <li key={talle}>{talle}: {cantidad} unidades</li>
          ))}
        </ul>
        <h3>Alertas de Stock Bajo</h3>
        <ul>
          {stockBajo.map((prod) => (
            <li key={prod.id}>
              {prod.codigo} - {prod.nombre}: {Object.entries(prod.talles)
                .filter(([_, stock]) => stock > 0 && stock < prod.umbralAlerta)
                .map(([talle, stock]) => `${talle}: ${stock}`)
                .join(', ')}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Menú principal
  return (
    <div>
      <nav>
        <button onClick={() => setSeccion('crearProducto')}>Crear Producto</button>
        <button onClick={() => setSeccion('cargarStock')}>Cargar Stock</button>
        <button onClick={() => setSeccion('verStock')}>Ver Stock</button>
        <button onClick={() => setSeccion('registrarVenta')}>Registrar Venta</button>
        <button onClick={() => setSeccion('estadisticas')}>Estadísticas</button>
      </nav>
      <div>
        {seccion === 'crearProducto' && <CrearProducto />}
        {seccion === 'cargarStock' && <CargarStock />}
        {seccion === 'verStock' && <VerStock />}
        {seccion === 'registrarVenta' && <RegistrarVenta />}
        {seccion === 'estadisticas' && <Estadisticas />}
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));