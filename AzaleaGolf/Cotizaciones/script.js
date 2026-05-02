import {
  db,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  runTransaction,
  orderBy,
  query,
} from "../db.js";

// ── Datos de tu empresa (editá estos valores) ──────────────────────────────
const EMPRESA = {
  nombre: "Azalea Golf",
  telefono: "+598 92 390 042",
  email: "contacto@azaleasports.com.uy",
};

// ══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ══════════════════════════════════════════════════════════════════════════════

let cotizaciones      = [];
let presentaciones    = [];
let catalogo          = [];
let marcasLogos       = {}; // { "adidas": { id, logo } }

// Cotizaciones form
let currentItems      = [];
let editingId         = null;
let logoClienteBase64 = null;

// Presentaciones form
let currentProdItems     = [];
let editingPresId        = null;
let logoPresentBase64    = null;

// Catálogo modal context: "cotizacion" | "presentacion"
let catalogCtx = "cotizacion";

// Logo empresa precargado
let logoAzaleaBase64 = null;

// ══════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ══════════════════════════════════════════════════════════════════════════════

function formatCurrency(n) {
  return "$" + (Number(n) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function formatUSD(n) {
  const num = Number(n) || 0;
  const dec = Number.isInteger(num) ? 0 : 2;
  return "U$S " + num.toLocaleString("es-AR", {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  });
}

function formatNum(n) {
  const num = Number(n) || 0;
  const dec = Number.isInteger(num) ? 0 : 2;
  return num.toLocaleString("es-AR", {
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  });
}

function formatDate(s) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ══════════════════════════════════════════════════════════════════════════════
// CÁLCULOS
// ══════════════════════════════════════════════════════════════════════════════

function calcItemTotals(item) {
  const precio = Number(item.precioUnitario) || 0;
  const desc   = Number(item.descuento)      || 0;
  const cant   = Number(item.cantidad)       || 0;
  const bord   = Number(item.precioBordado)  || 0;
  const precioConDesc = precio * (1 - desc / 100);
  const subtotalItem  = precioConDesc * cant;
  const bordadoItem   = bord * cant;
  return { precioConDesc, subtotalItem, bordadoItem, precioFinal: subtotalItem + bordadoItem };
}

function calcCotizacionTotals(items) {
  let subtotalLista = 0, descuentoTotal = 0, subtotalNeto = 0, bordadoTotal = 0;
  items.forEach(item => {
    const cant  = Number(item.cantidad)       || 0;
    const precio = Number(item.precioUnitario) || 0;
    const desc   = Number(item.descuento)      || 0;
    const t = calcItemTotals(item);
    subtotalLista  += precio * cant;
    descuentoTotal += (precio * desc / 100) * cant;
    subtotalNeto   += t.subtotalItem;
    bordadoTotal   += t.bordadoItem;
  });
  return { subtotalLista, descuentoTotal, subtotalNeto, bordadoTotal,
           totalFinal: subtotalNeto + bordadoTotal };
}

// ══════════════════════════════════════════════════════════════════════════════
// NUMERACIÓN AUTOMÁTICA
// ══════════════════════════════════════════════════════════════════════════════

async function getNextNumero() {
  const configRef   = doc(db, "Configuracion", "cotizaciones");
  const currentYear = new Date().getFullYear();
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(configRef);
    let last = 0;
    if (snap.exists()) {
      const d = snap.data();
      last = d.año === currentYear ? d.ultimoNumero : 0;
    }
    const n = last + 1;
    tx.set(configRef, { ultimoNumero: n, año: currentYear });
    return n;
  });
  return `COT-${currentYear}-${String(next).padStart(3, "0")}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PRECARGA DE LOGOS
// ══════════════════════════════════════════════════════════════════════════════

function preloadLogo() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      logoAzaleaBase64 = c.toDataURL("image/png");
      resolve();
    };
    img.onerror = () => resolve();
    img.src = "../logo.jpg";
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// MARCAS Y LOGOS DE MARCAS
// ══════════════════════════════════════════════════════════════════════════════

async function loadMarcasLogos() {
  try {
    const snap = await getDocs(collection(db, "MarcasLogos"));
    marcasLogos = {};
    snap.docs.forEach(d => {
      const key = (d.data().marca || "").toLowerCase();
      marcasLogos[key] = { id: d.id, logo: d.data().logo };
    });
  } catch { marcasLogos = {}; }
}

async function saveMarcaLogo(marca, logoData) {
  const key = marca.toLowerCase();
  if (marcasLogos[key]) {
    await updateDoc(doc(db, "MarcasLogos", marcasLogos[key].id), { logo: logoData });
    marcasLogos[key].logo = logoData;
  } else {
    const ref = await addDoc(collection(db, "MarcasLogos"), { marca, logo: logoData });
    marcasLogos[key] = { id: ref.id, logo: logoData };
  }
}

function openGestionMarcasModal() {
  renderGestionMarcas();
  document.getElementById("marcaForm").style.display = "none";
  document.getElementById("gestionMarcasModal").style.display = "block";
}

function renderGestionMarcas() {
  const tbody = document.getElementById("gestionMarcasBody");
  const entradas = Object.entries(marcasLogos);
  if (!entradas.length) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#888">Sin marcas guardadas</td></tr>`;
    return;
  }
  tbody.innerHTML = entradas.map(([key, data]) => `
    <tr>
      <td style="text-align:center">
        <img src="${escHtml(data.logo)}" style="max-height:32px;max-width:60px;object-fit:contain" onerror="this.style.display='none'" />
      </td>
      <td>${escHtml(data.marca || key)}</td>
      <td style="white-space:nowrap">
        <button class="btn-sm btn-edit-marca" data-key="${escHtml(key)}" style="margin-right:4px">Editar</button>
        <button class="btn-sm btn-danger btn-del-marca" data-key="${escHtml(key)}">Eliminar</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".btn-edit-marca").forEach(btn => {
    btn.addEventListener("click", () => {
      const data = marcasLogos[btn.dataset.key];
      showMarcaForm({ key: btn.dataset.key, ...data });
    });
  });
  tbody.querySelectorAll(".btn-del-marca").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("¿Eliminar el logo de esta marca?")) return;
      const data = marcasLogos[btn.dataset.key];
      await deleteDoc(doc(db, "MarcasLogos", data.id));
      delete marcasLogos[btn.dataset.key];
      renderGestionMarcas();
    });
  });
}

function showMarcaForm(item = {}) {
  document.getElementById("marcaEditId").value  = item.id  || "";
  document.getElementById("marcaNombre").value  = item.marca || item.key || "";
  document.getElementById("marcaLogoUrl").value = item.logo || "";
  const prev = document.getElementById("marcaLogoPreview");
  if (item.logo) { prev.src = item.logo; prev.style.display = "block"; }
  else           { prev.style.display = "none"; }
  document.getElementById("marcaForm").style.display = "block";
  document.getElementById("marcaNombre").focus();
}

async function guardarMarca() {
  const id     = document.getElementById("marcaEditId").value;
  const nombre = document.getElementById("marcaNombre").value.trim();
  const logo   = document.getElementById("marcaLogoUrl").value.trim();
  if (!nombre) { alert("Ingresá el nombre de la marca."); return; }
  if (!logo)   { alert("Cargá o pegá un logo para la marca."); return; }

  const key = nombre.toLowerCase();
  if (id) {
    await updateDoc(doc(db, "MarcasLogos", id), { marca: nombre, logo });
    marcasLogos[key] = { id, logo, marca: nombre };
  } else {
    const ref = await addDoc(collection(db, "MarcasLogos"), { marca: nombre, logo });
    marcasLogos[key] = { id: ref.id, logo, marca: nombre };
  }
  document.getElementById("marcaForm").style.display = "none";
  renderGestionMarcas();
}

// ══════════════════════════════════════════════════════════════════════════════
// CATÁLOGO
// ══════════════════════════════════════════════════════════════════════════════

async function loadCatalogo() {
  try {
    const snap = await getDocs(collection(db, "ArticulosCatalogo"));
    catalogo = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    catalogo.sort((a, b) => a.nombre.localeCompare(b.nombre));
  } catch { catalogo = []; }
  populateCatalogSuggestions();
}

function populateCatalogSuggestions() {
  const dl = document.getElementById("catalogSuggestions");
  dl.innerHTML = catalogo.map(a =>
    `<option value="${escHtml(a.nombre)}" data-marca="${escHtml(a.marca||"")}" data-precio="${a.precioUnitario||0}">`
  ).join("");
}

function renderCatalogBody(items) {
  const tbody = document.getElementById("catalogBody");
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#888">Sin resultados</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(a => `
    <tr>
      <td style="text-align:center">
        ${a.foto ? `<img src="${escHtml(a.foto)}" class="cat-thumb" onerror="this.style.display='none'">` : "-"}
      </td>
      <td>${escHtml(a.nombre)}</td>
      <td>${escHtml(a.marca || "")}</td>
      <td>${formatCurrency(a.precioUnitario)}</td>
      <td style="text-align:center">${a.cantidadMinima || "-"}</td>
      <td><button class="btn-sm btn-primary" data-id="${a.id}">+</button></td>
    </tr>
  `).join("");
  tbody.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = catalogo.find(a => a.id === btn.dataset.id);
      if (!item) return;
      if (catalogCtx === "presentacion") selectProdCatalogItem(item);
      else selectCatalogItem(item);
    });
  });
}

function openCatalogoModal(ctx) {
  catalogCtx = ctx;
  document.getElementById("catalogSearch").value = "";
  renderCatalogBody(catalogo);
  document.getElementById("catalogoModal").style.display = "block";
}

// ── Gestión catálogo ──────────────────────────────────────────────────────────

function renderGestionCatalogo() {
  const tbody = document.getElementById("gestionCatalogoBody");
  if (!catalogo.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#888">Sin artículos</td></tr>`;
    return;
  }
  tbody.innerHTML = catalogo.map(a => `
    <tr data-id="${a.id}">
      <td style="text-align:center">
        ${a.foto ? `<img src="${escHtml(a.foto)}" class="cat-thumb" onerror="this.style.display='none'">` : "-"}
      </td>
      <td>${escHtml(a.nombre)}</td>
      <td>${escHtml(a.marca || "")}</td>
      <td>${formatCurrency(a.precioUnitario)}</td>
      <td style="text-align:center">${a.cantidadMinima || "-"}</td>
      <td style="white-space:nowrap">
        <button class="btn-sm btn-edit-art" data-id="${a.id}" style="margin-right:4px">Editar</button>
        <button class="btn-sm btn-danger btn-del-art" data-id="${a.id}">Eliminar</button>
      </td>
    </tr>
  `).join("");
  tbody.querySelectorAll(".btn-edit-art").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = catalogo.find(a => a.id === btn.dataset.id);
      if (item) showArticuloForm(item);
    });
  });
  tbody.querySelectorAll(".btn-del-art").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("¿Eliminar este artículo del catálogo?")) return;
      await deleteDoc(doc(db, "ArticulosCatalogo", btn.dataset.id));
      await loadCatalogo();
      renderGestionCatalogo();
    });
  });
}

function showArticuloForm(item = {}) {
  document.getElementById("articuloEditId").value   = item.id || "";
  document.getElementById("articuloNombre").value   = item.nombre || "";
  document.getElementById("articuloMarca").value    = item.marca || "";
  document.getElementById("articuloPrecio").value   = item.precioUnitario || "";
  document.getElementById("articuloCantMin").value  = item.cantidadMinima || "";
  document.getElementById("articuloFotoUrl").value  = "";

  const preview = document.getElementById("articuloFotoPreview");
  if (item.foto) {
    preview.src = item.foto;
    preview.style.display = "block";
    document.getElementById("articuloFotoUrl").value = item.foto;
  } else {
    preview.style.display = "none";
  }

  document.getElementById("articuloForm").style.display = "block";
  document.getElementById("articuloNombre").focus();
}

async function saveArticulo() {
  const id       = document.getElementById("articuloEditId").value;
  const nombre   = document.getElementById("articuloNombre").value.trim();
  const marca    = document.getElementById("articuloMarca").value.trim();
  const precio   = Number(document.getElementById("articuloPrecio").value) || 0;
  const cantMin  = Number(document.getElementById("articuloCantMin").value) || 0;
  const fotoUrl  = document.getElementById("articuloFotoUrl").value.trim();

  if (!nombre) { alert("Ingresá el nombre del artículo."); return; }

  const data = { nombre, marca, precioUnitario: precio, cantidadMinima: cantMin, foto: fotoUrl };

  if (id) {
    await updateDoc(doc(db, "ArticulosCatalogo", id), data);
  } else {
    await addDoc(collection(db, "ArticulosCatalogo"), data);
  }
  document.getElementById("articuloForm").style.display = "none";
  await loadCatalogo();
  renderGestionCatalogo();
}

// ══════════════════════════════════════════════════════════════════════════════
// COTIZACIONES
// ══════════════════════════════════════════════════════════════════════════════

async function loadCotizaciones() {
  try {
    const q = query(collection(db, "Cotizaciones"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    cotizaciones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { cotizaciones = []; }
  renderCotizacionesTable();
}

function renderCotizacionesTable() {
  const tbody = document.getElementById("cotizacionesBody");
  if (!cotizaciones.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;padding:20px">Sin cotizaciones guardadas</td></tr>`;
    return;
  }
  tbody.innerHTML = cotizaciones.map(c => `
    <tr>
      <td>${c.numero || "-"}</td>
      <td>${formatDate(c.fecha)}</td>
      <td>${escHtml(c.cliente || "-")}</td>
      <td>${formatCurrency(c.totalFinal)}</td>
      <td style="white-space:nowrap">
        <button class="btn-sm btn-primary" onclick="window._pdfCot('${c.id}')">PDF</button>
        <button class="btn-sm" onclick="window._editCot('${c.id}')" style="margin:0 4px">Editar</button>
        <button class="btn-sm btn-danger" onclick="window._deleteCot('${c.id}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

// ── Filas de ítems (cotización) ───────────────────────────────────────────────

function buildItemRow(item, index) {
  const t  = calcItemTotals(item);
  const tr = document.createElement("tr");
  tr.dataset.index = index;
  tr.innerHTML = `
    <td class="item-num">${index + 1}</td>
    <td><input type="text"   class="item-nombre"    list="catalogSuggestions" value="${escHtml(item.nombre||"")}" placeholder="Artículo" /></td>
    <td><input type="text"   class="item-marca"     value="${escHtml(item.marca||"")}" placeholder="Marca" /></td>
    <td><input type="number" class="item-cantidad"  min="1" step="1" value="${item.cantidad||1}" style="width:55px" /></td>
    <td><input type="number" class="item-precio"    min="0" step="0.01" value="${item.precioUnitario||""}" placeholder="0" style="width:80px" /></td>
    <td><input type="number" class="item-descuento" min="0" max="100" step="1" value="${item.descuento||0}" style="width:50px" /></td>
    <td class="item-final item-pdesc">${formatCurrency(t.precioConDesc)}</td>
    <td><input type="number" class="item-bordado"   min="0" step="0.01" value="${item.precioBordado||0}" style="width:70px" /></td>
    <td class="item-final item-pfinal">${formatCurrency(t.precioFinal)}</td>
    <td class="save-cat-cell"><input type="checkbox" class="item-save-cat" title="Guardar en catálogo" ${item._saveCat?"checked":""} /></td>
    <td><button type="button" class="btn-sm btn-danger btn-remove-item">✕</button></td>
  `;
  tr.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", () => {
      if (inp.classList.contains("item-nombre")) {
        const match = catalogo.find(a => a.nombre.toLowerCase() === inp.value.toLowerCase());
        if (match) {
          tr.querySelector(".item-marca").value   = match.marca || "";
          tr.querySelector(".item-precio").value  = match.precioUnitario || 0;
        }
      }
      updateItemRowCalc(tr);
      recalcTotals();
    });
  });
  tr.querySelector(".btn-remove-item").addEventListener("click", () => {
    tr.remove(); renumberItemRows(); recalcTotals();
  });
  return tr;
}

function updateItemRowCalc(tr) {
  const precio = Number(tr.querySelector(".item-precio").value)    || 0;
  const desc   = Number(tr.querySelector(".item-descuento").value) || 0;
  const cant   = Number(tr.querySelector(".item-cantidad").value)  || 0;
  const bord   = Number(tr.querySelector(".item-bordado").value)   || 0;
  const pcd    = precio * (1 - desc / 100);
  tr.querySelector(".item-pdesc").textContent  = formatCurrency(pcd);
  tr.querySelector(".item-pfinal").textContent = formatCurrency(pcd * cant + bord * cant);
}

function renumberItemRows() {
  document.querySelectorAll("#itemsTableBody tr").forEach((tr, i) => {
    tr.dataset.index = i;
    const n = tr.querySelector(".item-num"); if (n) n.textContent = i + 1;
  });
}

function recalcTotals() {
  const items  = collectItemsFromTable();
  const totals = calcCotizacionTotals(items);
  document.getElementById("totalSubtotalLista").textContent = formatCurrency(totals.subtotalLista);
  document.getElementById("totalDescuento").textContent     = "-" + formatCurrency(totals.descuentoTotal);
  document.getElementById("totalSubtotalNeto").textContent  = formatCurrency(totals.subtotalNeto);
  document.getElementById("totalBordado").textContent       = formatCurrency(totals.bordadoTotal);
  document.getElementById("totalFinal").textContent         = formatCurrency(totals.totalFinal);
}

function collectItemsFromTable() {
  return Array.from(document.querySelectorAll("#itemsTableBody tr")).map(tr => ({
    nombre:        tr.querySelector(".item-nombre")?.value.trim()   || "",
    marca:         tr.querySelector(".item-marca")?.value.trim()    || "",
    cantidad:      Number(tr.querySelector(".item-cantidad")?.value)  || 0,
    precioUnitario:Number(tr.querySelector(".item-precio")?.value)    || 0,
    descuento:     Number(tr.querySelector(".item-descuento")?.value) || 0,
    precioBordado: Number(tr.querySelector(".item-bordado")?.value)   || 0,
    _saveCat:      tr.querySelector(".item-save-cat")?.checked || false,
  }));
}

function addItemRow(item = {}) {
  const tbody = document.getElementById("itemsTableBody");
  tbody.appendChild(buildItemRow(item, tbody.rows.length));
  recalcTotals();
}

function selectCatalogItem(item) {
  addItemRow({ nombre: item.nombre, marca: item.marca || "", precioUnitario: item.precioUnitario || 0,
               cantidad: 1, descuento: 0, precioBordado: 0 });
  document.getElementById("catalogoModal").style.display = "none";
}

// ── Modal cotización ──────────────────────────────────────────────────────────

function openNewForm() {
  editingId = null; logoClienteBase64 = null; currentItems = [];
  document.getElementById("formModalTitle").textContent = "Nueva Cotización";
  document.getElementById("inputCliente").value = "";
  document.getElementById("inputLogoCliente").value = "";
  document.getElementById("previewLogoCliente").style.display = "none";
  document.getElementById("inputCondicionesPago").value = "";
  document.getElementById("inputTiempoEntrega").value  = "";
  document.getElementById("inputNotas").value          = "";
  document.getElementById("itemsTableBody").innerHTML  = "";
  recalcTotals();
  document.getElementById("formModal").style.display = "block";
}

function openEditForm(cot) {
  editingId = cot.id; logoClienteBase64 = cot.logoCliente || null;
  document.getElementById("formModalTitle").textContent    = `Editar ${cot.numero || "cotización"}`;
  document.getElementById("inputCliente").value            = cot.cliente || "";
  document.getElementById("inputCondicionesPago").value    = cot.condicionesPago || "";
  document.getElementById("inputTiempoEntrega").value      = cot.tiempoEntrega   || "";
  document.getElementById("inputNotas").value              = cot.notas           || "";
  const prev = document.getElementById("previewLogoCliente");
  if (cot.logoCliente) { prev.src = cot.logoCliente; prev.style.display = "block"; }
  else                 { prev.style.display = "none"; }
  document.getElementById("itemsTableBody").innerHTML = "";
  (cot.items || []).forEach(item => addItemRow(item));
  recalcTotals();
  document.getElementById("formModal").style.display = "block";
}

function closeFormModal() { document.getElementById("formModal").style.display = "none"; }

function collectFormData() {
  const items = collectItemsFromTable().map(item => ({ ...item, ...calcItemTotals(item) }));
  return {
    cliente:         document.getElementById("inputCliente").value.trim(),
    logoCliente:     logoClienteBase64 || null,
    items,
    condicionesPago: document.getElementById("inputCondicionesPago").value.trim(),
    tiempoEntrega:   document.getElementById("inputTiempoEntrega").value.trim(),
    notas:           document.getElementById("inputNotas").value.trim(),
    ...calcCotizacionTotals(items),
  };
}

async function saveCotizacion(generatePdfAfter = false) {
  const data = collectFormData();
  if (!data.cliente)       { alert("Ingresá el nombre del cliente."); return; }
  if (!data.items.length)  { alert("Agregá al menos un artículo."); return; }

  for (const item of data.items) {
    if (item._saveCat && item.nombre) {
      await addDoc(collection(db, "ArticulosCatalogo"), {
        nombre: item.nombre, marca: item.marca || "",
        precioUnitario: item.precioUnitario, cantidadMinima: 0, foto: "",
      });
    }
  }
  const itemsClean = data.items.map(({ _saveCat, ...rest }) => rest);

  let savedCot;
  if (editingId) {
    await updateDoc(doc(db, "Cotizaciones", editingId), { ...data, items: itemsClean });
    const prev = cotizaciones.find(c => c.id === editingId);
    savedCot = { ...data, items: itemsClean, id: editingId,
                 numero: prev?.numero || "", fecha: prev?.fecha || todayStr() };
  } else {
    const numero  = await getNextNumero();
    const fecha   = todayStr();
    const docRef  = await addDoc(collection(db, "Cotizaciones"), {
      ...data, items: itemsClean, numero, fecha, createdAt: serverTimestamp(),
    });
    savedCot = { ...data, items: itemsClean, numero, fecha, id: docRef.id };
  }

  closeFormModal();
  await loadCatalogo();
  await loadCotizaciones();
  if (generatePdfAfter) generateCotizacionPDF(savedCot);
}

async function deleteCotizacion(id) {
  if (!confirm("¿Eliminar esta cotización?")) return;
  await deleteDoc(doc(db, "Cotizaciones", id));
  await loadCotizaciones();
}

// ══════════════════════════════════════════════════════════════════════════════
// PRESENTACIONES
// ══════════════════════════════════════════════════════════════════════════════

async function loadPresentaciones() {
  try {
    const q    = query(collection(db, "Presentaciones"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    presentaciones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { presentaciones = []; }
  renderPresentacionesTable();
}

function renderPresentacionesTable() {
  const tbody = document.getElementById("presentacionesBody");
  if (!presentaciones.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#888;padding:20px">Sin presentaciones guardadas</td></tr>`;
    return;
  }
  tbody.innerHTML = presentaciones.map(p => `
    <tr>
      <td>${escHtml(p.titulo || "-")}</td>
      <td>${escHtml(p.cliente || "-")}</td>
      <td>${formatDate(p.fecha)}</td>
      <td style="text-align:center">${(p.productos || []).length}</td>
      <td style="white-space:nowrap">
        <button class="btn-sm btn-primary" onclick="window._pdfPres('${p.id}')">PDF</button>
        <button class="btn-sm" onclick="window._editPres('${p.id}')" style="margin:0 4px">Editar</button>
        <button class="btn-sm btn-danger" onclick="window._deletePres('${p.id}')">Eliminar</button>
      </td>
    </tr>
  `).join("");
}

// ── Filas de productos (presentación) ────────────────────────────────────────

function buildFotoSlot(val, slotIdx, isMain) {
  const previewClass = isMain ? "fs-preview fs-preview-main" : "fs-preview";
  const label = isMain ? "Principal" : `Foto ${slotIdx + 1}`;
  return `
    <div class="foto-slot">
      <span class="foto-slot-label">${label}</span>
      <div class="foto-slot-row">
        <img class="${previewClass}" data-slot="${slotIdx}" src="${escHtml(val)}" style="${val ? "" : "display:none"}" />
        <input type="text" class="fs-url" data-slot="${slotIdx}" value="${escHtml(val)}" placeholder="URL o subir ▸" />
        <button type="button" class="btn-foto-browse btn-sm" data-slot="${slotIdx}" style="padding:3px 6px">📷</button>
        <input type="file" class="fs-file" data-slot="${slotIdx}" accept="image/*" style="display:none" />
      </div>
    </div>
    ${isMain ? '<hr class="fs-divider">' : ""}
  `;
}

function buildProdRow(item, index) {
  const tr = document.createElement("tr");
  tr.dataset.index = index;
  // compatibilidad: item.fotos (array nuevo) o item.foto (string legado)
  const fotos = item.fotos?.length ? item.fotos : (item.foto ? [item.foto] : ["", "", "", ""]);
  const fotosNorm = Array.from({ length: 4 }, (_, i) => fotos[i] || "");
  const marcaKey = (item.marca || "").toLowerCase();
  const marcaLogoData = marcasLogos[marcaKey]?.logo || "";

  tr.innerHTML = `
    <td class="item-num">${index + 1}</td>
    <td class="foto-cell">
      <div class="fotos-container">
        ${buildFotoSlot(fotosNorm[0], 0, true)}
        ${buildFotoSlot(fotosNorm[1], 1, false)}
        ${buildFotoSlot(fotosNorm[2], 2, false)}
        ${buildFotoSlot(fotosNorm[3], 3, false)}
      </div>
    </td>
    <td>
      <input type="text" class="prod-nombre" value="${escHtml(item.nombre||"")}" placeholder="Producto" />
    </td>
    <td>
      <input type="text" class="prod-marca" value="${escHtml(item.marca||"")}" placeholder="Marca" />
      <div class="brand-logo-row">
        <img class="brand-logo-prev" src="${escHtml(marcaLogoData)}" style="${marcaLogoData ? "display:inline-block" : "display:none"}" />
        <input type="file" class="brand-logo-file" accept="image/*" style="display:none" />
        <button type="button" class="btn-foto-browse btn-sm brand-logo-btn" title="Cargar logo de marca" style="${marcaLogoData ? "display:none" : "display:inline"}">Logo</button>
      </div>
    </td>
    <td><input type="number" class="prod-precio"  value="${item.precio||""}"          min="0" step="0.01" placeholder="0" style="width:75px" /></td>
    <td><input type="number" class="prod-cantmin" value="${item.cantidadMinima||""}"  min="0" step="1"    placeholder="0" style="width:55px" /></td>
    <td>
      <select class="prod-tipo-grabado" style="width:100%;font-size:11px;margin-bottom:3px;padding:2px 3px">
        <option value="Bordado"   ${(item.tipoGrabado||"Bordado")==="Bordado"   ? "selected":""}>Bordado</option>
        <option value="Impresión" ${(item.tipoGrabado||"Bordado")==="Impresión" ? "selected":""}>Impresión</option>
      </select>
      <input type="number" class="prod-bordado" value="${item.precioBordado||""}" min="0" step="0.01" placeholder="— sin precio" style="width:100%;box-sizing:border-box" />
    </td>
    <td><input type="text"   class="prod-plazo"   value="${escHtml(item.plazo||"")}"  placeholder="Ej: 15 días" style="width:80px" /></td>
    <td><button type="button" class="btn-sm btn-danger btn-remove-prod">✕</button></td>
  `;

  // ── Fotos del producto (4 slots) ──
  for (let si = 0; si < 4; si++) {
    const prev    = tr.querySelector(`.fs-preview[data-slot="${si}"]`);
    const urlInp  = tr.querySelector(`.fs-url[data-slot="${si}"]`);
    const fileInp = tr.querySelector(`.fs-file[data-slot="${si}"]`);
    const browseB = tr.querySelector(`.btn-foto-browse[data-slot="${si}"]`);
    browseB.addEventListener("click", () => fileInp.click());
    fileInp.addEventListener("change", () => {
      const file = fileInp.files[0]; if (!file) return;
      if (file.size > 800000) alert("Imagen grande (>800 KB).");
      const r = new FileReader();
      r.onload = (e) => {
        urlInp.value = e.target.result;
        prev.src = e.target.result; prev.style.display = "";
      };
      r.readAsDataURL(file);
    });
    urlInp.addEventListener("input", () => {
      const s = urlInp.value.trim();
      prev.src = s; prev.style.display = s ? "" : "none";
    });
  }

  // ── Logo de marca ──
  const marcaInput    = tr.querySelector(".prod-marca");
  const brandLogoPrev = tr.querySelector(".brand-logo-prev");
  const brandLogoFile = tr.querySelector(".brand-logo-file");
  const brandLogoBtn  = tr.querySelector(".brand-logo-btn");

  function updateBrandLogo() {
    const key = marcaInput.value.trim().toLowerCase();
    const existing = marcasLogos[key]?.logo;
    if (existing) {
      brandLogoPrev.src = existing; brandLogoPrev.style.display = "inline-block";
      brandLogoBtn.style.display = "none";
    } else if (key) {
      brandLogoPrev.style.display = "none"; brandLogoBtn.style.display = "inline";
    } else {
      brandLogoPrev.style.display = "none"; brandLogoBtn.style.display = "none";
    }
  }

  marcaInput.addEventListener("input", updateBrandLogo);
  brandLogoBtn.addEventListener("click", () => brandLogoFile.click());
  brandLogoFile.addEventListener("change", () => {
    const file = brandLogoFile.files[0]; if (!file) return;
    const marca = marcaInput.value.trim();
    if (!marca) { alert("Ingresá primero el nombre de la marca."); return; }
    const r = new FileReader();
    r.onload = async (e) => {
      await saveMarcaLogo(marca, e.target.result);
      brandLogoPrev.src = e.target.result; brandLogoPrev.style.display = "inline-block";
      brandLogoBtn.style.display = "none";
    };
    r.readAsDataURL(file);
  });

  tr.querySelector(".btn-remove-prod").addEventListener("click", () => {
    tr.remove(); renumberProdRows();
  });

  return tr;
}

function renumberProdRows() {
  document.querySelectorAll("#prodTableBody tr").forEach((tr, i) => {
    tr.dataset.index = i;
    const n = tr.querySelector(".item-num"); if (n) n.textContent = i + 1;
  });
}

function addProdRow(item = {}) {
  const tbody = document.getElementById("prodTableBody");
  tbody.appendChild(buildProdRow(item, tbody.rows.length));
}

function selectProdCatalogItem(item) {
  addProdRow({
    nombre: item.nombre, marca: item.marca || "",
    precio: item.precioUnitario || 0,
    cantidadMinima: item.cantidadMinima || 0,
    precioBordado: 0,
    tipoGrabado: "Bordado",
    plazo: "",
    fotos: item.foto ? [item.foto] : [],
  });
  document.getElementById("catalogoModal").style.display = "none";
}

function collectProdItems() {
  return Array.from(document.querySelectorAll("#prodTableBody tr")).map(tr => ({
    nombre:        tr.querySelector(".prod-nombre")?.value.trim()  || "",
    marca:         tr.querySelector(".prod-marca")?.value.trim()   || "",
    precio:        Number(tr.querySelector(".prod-precio")?.value)   || 0,
    cantidadMinima:Number(tr.querySelector(".prod-cantmin")?.value)  || 0,
    precioBordado: Number(tr.querySelector(".prod-bordado")?.value)  || 0,
    tipoGrabado:   tr.querySelector(".prod-tipo-grabado")?.value    || "Bordado",
    plazo:         tr.querySelector(".prod-plazo")?.value.trim()   || "",
    fotos: [0,1,2,3].map(i => tr.querySelector(`.fs-url[data-slot="${i}"]`)?.value.trim() || "").filter(Boolean),
  }));
}

// ── Modal presentación ────────────────────────────────────────────────────────

function openNewPresentacionForm() {
  editingPresId = null; logoPresentBase64 = null;
  document.getElementById("presModalTitle").textContent = "Nueva Presentación";
  document.getElementById("presTitulo").value   = "";
  document.getElementById("presCliente").value  = "";
  document.getElementById("presLogoFile").value = "";
  document.getElementById("presLogoPreview").style.display = "none";
  document.getElementById("presConIva").checked = false;
  document.getElementById("prodTableBody").innerHTML = "";
  document.getElementById("formPresentacionModal").style.display = "block";
}

function openEditPresentacionForm(pres) {
  editingPresId   = pres.id;
  logoPresentBase64 = pres.logoCliente || null;
  document.getElementById("presModalTitle").textContent = `Editar: ${pres.titulo || "presentación"}`;
  document.getElementById("presTitulo").value  = pres.titulo  || "";
  document.getElementById("presCliente").value = pres.cliente || "";
  document.getElementById("presConIva").checked = pres.conIva || false;
  const prev = document.getElementById("presLogoPreview");
  if (pres.logoCliente) { prev.src = pres.logoCliente; prev.style.display = "block"; }
  else                  { prev.style.display = "none"; }
  document.getElementById("prodTableBody").innerHTML = "";
  (pres.productos || []).forEach(p => addProdRow(p));
  document.getElementById("formPresentacionModal").style.display = "block";
}

function closePresModal() { document.getElementById("formPresentacionModal").style.display = "none"; }

async function savePresentacion(generatePdfAfter = false) {
  const titulo   = document.getElementById("presTitulo").value.trim();
  const cliente  = document.getElementById("presCliente").value.trim();
  const productos = collectProdItems();

  if (!titulo)           { alert("Ingresá un título para la presentación."); return; }
  if (!cliente)          { alert("Ingresá el nombre del cliente."); return; }
  if (!productos.length) { alert("Agregá al menos un producto."); return; }

  const conIva = document.getElementById("presConIva").checked;

  const data = {
    titulo, cliente, logoCliente: logoPresentBase64 || null,
    conIva,
    fecha: editingPresId
      ? (presentaciones.find(p => p.id === editingPresId)?.fecha || todayStr())
      : todayStr(),
    productos,
  };

  let savedPres;
  if (editingPresId) {
    await updateDoc(doc(db, "Presentaciones", editingPresId), data);
    savedPres = { ...data, id: editingPresId };
  } else {
    const ref = await addDoc(collection(db, "Presentaciones"), { ...data, createdAt: serverTimestamp() });
    savedPres = { ...data, id: ref.id };
  }

  closePresModal();
  await loadPresentaciones();
  if (generatePdfAfter) await generatePresentacionPDF(savedPres);
}

async function deletePresentacion(id) {
  if (!confirm("¿Eliminar esta presentación?")) return;
  await deleteDoc(doc(db, "Presentaciones", id));
  await loadPresentaciones();
}

// ══════════════════════════════════════════════════════════════════════════════
// PDF — COTIZACIÓN
// ══════════════════════════════════════════════════════════════════════════════

function generateCotizacionPDF(cot) {
  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const PW = 297, ML = 14, MR = 14, usableW = PW - ML - MR;

  function addHeader() {
    const y = 14;
    if (logoAzaleaBase64) addImageFit(docPdf, logoAzaleaBase64, ML, y, 28, 14);
    docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(11);
    docPdf.text(EMPRESA.nombre, ML, y + 20);
    docPdf.setFont("helvetica", "normal"); docPdf.setFontSize(8);
    docPdf.text(`Tel: ${EMPRESA.telefono}`, ML, y + 25);
    docPdf.text(EMPRESA.email, ML, y + 30);

    if (cot.logoCliente) addImageFit(docPdf, cot.logoCliente, PW - MR - 32, y, 32, 18);

    const rx = PW - MR;
    docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(11);
    docPdf.text(`COTIZACIÓN N° ${cot.numero || ""}`, rx, y + 7, { align: "right" });
    docPdf.setFont("helvetica", "normal"); docPdf.setFontSize(9);
    docPdf.text(`Fecha: ${formatDate(cot.fecha)}`, rx, y + 13, { align: "right" });
    docPdf.text(`Cliente: ${cot.cliente || ""}`, rx, y + 19, { align: "right" });

    docPdf.setDrawColor(0, 152, 121); docPdf.setLineWidth(0.4);
    docPdf.line(ML, y + 34, PW - MR, y + 34);
  }

  addHeader();

  const tableBody = (cot.items || []).map((item, i) => {
    const t = calcItemTotals(item);
    return [i + 1, item.nombre || "", item.marca || "", item.cantidad,
      formatCurrency(item.precioUnitario),
      item.descuento > 0 ? `${item.descuento}%` : "-",
      formatCurrency(t.precioConDesc),
      item.precioBordado > 0 ? formatCurrency(item.precioBordado) : "-",
      formatCurrency(t.precioFinal)];
  });

  docPdf.autoTable({
    startY: 52,
    head: [["#", "Artículo", "Marca", "Cant.", "P. Unit. c/IVA", "Desc. %", "P. Desc.", "Bord./Impr. ($/u)", "P. Final"]],
    body: tableBody,
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, halign: "right" },
    headStyles: { fillColor: [0, 152, 121], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 }, 1: { halign: "left", cellWidth: 58 },
      2: { halign: "left",   cellWidth: 30 }, 3: { halign: "center", cellWidth: 14 },
      4: { cellWidth: 32 }, 5: { halign: "center", cellWidth: 18 },
      6: { cellWidth: 28 }, 7: { halign: "center", cellWidth: 34 }, 8: { cellWidth: 30 },
    },
    alternateRowStyles: { fillColor: [243, 243, 243] },
    margin: { left: ML, right: MR },
    didDrawPage: () => addHeader(),
  });

  let y = docPdf.lastAutoTable.finalY + 8;
  const rx = PW - MR, lx = rx - 70;
  docPdf.setFillColor(245, 245, 245);
  docPdf.roundedRect(lx - 4, y - 4, 74, 40, 2, 2, "F");

  [["Subtotal lista:", formatCurrency(cot.subtotalLista)],
   ["Descuento total:", "-" + formatCurrency(cot.descuentoTotal)],
   ["Subtotal neto:", formatCurrency(cot.subtotalNeto)],
   ["Bordado / Impresión:", formatCurrency(cot.bordadoTotal)]].forEach(([l, v]) => {
    docPdf.setFont("helvetica", "normal"); docPdf.setFontSize(9);
    docPdf.text(l, lx, y, { align: "left" });
    docPdf.text(v, rx, y, { align: "right" });
    y += 6;
  });
  docPdf.setDrawColor(0, 152, 121); docPdf.line(lx - 4, y - 2, rx, y - 2);
  docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(11);
  docPdf.text("TOTAL FINAL:", lx, y + 5, { align: "left" });
  docPdf.text(formatCurrency(cot.totalFinal), rx, y + 5, { align: "right" });
  y += 14;

  if (y > 175) { docPdf.addPage(); addHeader(); y = 52; }

  function addBlock(label, text) {
    if (!text) return;
    docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(9);
    docPdf.text(label, ML, y);
    docPdf.setFont("helvetica", "normal");
    const lines = docPdf.splitTextToSize(text, usableW);
    docPdf.text(lines, ML, y + 5);
    y += 5 + lines.length * 4.5 + 5;
    if (y > 195) { docPdf.addPage(); addHeader(); y = 52; }
  }
  addBlock("Condiciones de pago:", cot.condicionesPago);
  addBlock("Tiempo de entrega:",   cot.tiempoEntrega);
  addBlock("Notas / Observaciones:", cot.notas);

  const total = docPdf.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    docPdf.setPage(p); docPdf.setFontSize(8); docPdf.setTextColor(150);
    docPdf.text(`Página ${p} de ${total}`, PW - MR, 205, { align: "right" });
    docPdf.setTextColor(0);
  }

  docPdf.save(`${cot.numero || "cotizacion"}.pdf`);
}

// ══════════════════════════════════════════════════════════════════════════════
// PDF — PRESENTACIÓN DE PRODUCTOS
// ══════════════════════════════════════════════════════════════════════════════

async function loadImageAsBase64(src) {
  if (!src) return null;
  if (src.startsWith("data:")) return src;

  // Intenta fetch directo primero; si falla por CORS usa proxy
  const tryFetch = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = (e) => resolve(e.target.result);
      r.onerror = () => reject(new Error("reader failed"));
      r.readAsDataURL(blob);
    });
  };

  try {
    return await tryFetch(src);
  } catch {
    try {
      return await tryFetch(`https://corsproxy.io/?url=${encodeURIComponent(src)}`);
    } catch {
      return null;
    }
  }
}

// Inserta una imagen manteniendo proporciones dentro de un box, centrada.
// Acepta data URL completa ("data:image/...;base64,...") o base64 puro + fmt.
function addImageFit(docPdf, src, boxX, boxY, boxW, boxH) {
  if (!src) return;
  try {
    let data, fmt;
    if (src.startsWith("data:")) {
      fmt  = src.includes("image/png") ? "PNG" : "JPEG";
      data = src.split(",")[1];
    } else {
      data = src;
      fmt  = "JPEG";
    }
    const props    = docPdf.getImageProperties(data);
    const imgAspect = props.width / props.height;
    const boxAspect = boxW / boxH;
    let w, h;
    if (imgAspect > boxAspect) { w = boxW; h = boxW / imgAspect; }
    else                       { h = boxH; w = boxH * imgAspect; }
    docPdf.addImage(data, fmt, boxX + (boxW - w) / 2, boxY + (boxH - h) / 2, w, h);
  } catch (_) {}
}

function addImageCentered(docPdf, imgData, fmt, boxX, boxY, boxW, boxH) {
  try {
    const props = docPdf.getImageProperties(imgData);
    const iAsp  = props.width / props.height;
    const bAsp  = boxW / boxH;
    let w, h;
    if (iAsp > bAsp) { w = boxW;          h = boxW / iAsp; }
    else             { h = boxH;          w = boxH * iAsp; }
    docPdf.addImage(imgData, fmt, boxX + (boxW - w) / 2, boxY + (boxH - h) / 2, w, h);
  } catch (_) {}
}

async function generatePresentacionPDF(pres) {
  const { jsPDF } = window.jspdf;

  const productos = pres.productos || [];

  // Pre-cargar fotos de productos (array por producto) y logos de marcas
  const loadedFotosArrays = await Promise.all(productos.map(p => {
    const arr = p.fotos?.length ? p.fotos : (p.foto ? [p.foto] : []);
    return Promise.all(arr.slice(0, 4).map(f => loadImageAsBase64(f)));
  }));
  const loadedMarcaLogos = await Promise.all(
    productos.map(p => loadImageAsBase64(marcasLogos[(p.marca || "").toLowerCase()]?.logo))
  );

  const docPdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const PW = 297, PH = 210, ML = 12, MR = 12;
  const cx = PW / 2;

  // Paleta de colores de la presentación
  const PINK    = [244, 120, 172]; // #f478ac  — rosa primario
  const PINK_DK = [200,  78, 130]; // #c84e82  — rosa oscuro (énfasis)
  const PINK_LT = [254, 240, 246]; // #fef0f6  — fondo rosa suave

  // ══════════════════════════════════════════════════════════════════
  // PORTADA — logos grandes y centrados
  // ══════════════════════════════════════════════════════════════════
  docPdf.setFillColor(255, 255, 255);
  docPdf.rect(0, 0, PW, PH, "F");

  // Banda superior
  docPdf.setFillColor(...PINK);
  docPdf.rect(0, 0, PW, 3, "F");

  // Logos centrados — grandes
  const logoH = 42, logoW = 70, gap = 24;
  const logoY = 18;
  if (logoAzaleaBase64 && pres.logoCliente) {
    // Ambos logos, lado a lado centrados
    addImageFit(docPdf, logoAzaleaBase64, cx - logoW - gap / 2, logoY, logoW, logoH);
    addImageFit(docPdf, pres.logoCliente,  cx + gap / 2,         logoY, logoW, logoH);
    // Separador vertical entre logos
    docPdf.setDrawColor(220, 220, 220); docPdf.setLineWidth(0.4);
    docPdf.line(cx, logoY + 4, cx, logoY + logoH - 4);
  } else if (logoAzaleaBase64) {
    addImageFit(docPdf, logoAzaleaBase64, cx - logoW / 2, logoY, logoW, logoH);
  } else if (pres.logoCliente) {
    addImageFit(docPdf, pres.logoCliente, cx - logoW / 2, logoY, logoW, logoH);
  }

  // Línea separadora
  docPdf.setDrawColor(...PINK); docPdf.setLineWidth(0.6);
  docPdf.line(ML + 20, logoY + logoH + 6, PW - MR - 20, logoY + logoH + 6);

  // Etiqueta pequeña
  let ty = logoY + logoH + 16;
  docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(8); docPdf.setTextColor(...PINK);
  docPdf.text("PRESENTACIÓN DE PRODUCTOS", cx, ty, { align: "center" });
  ty += 10;

  // Título
  docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(22); docPdf.setTextColor(20, 20, 20);
  const tLines = docPdf.splitTextToSize(pres.titulo || "", 220);
  docPdf.text(tLines, cx, ty, { align: "center" });
  ty += tLines.length * 10 + 6;

  // Cliente y fecha
  docPdf.setFont("helvetica", "normal"); docPdf.setFontSize(12); docPdf.setTextColor(80, 80, 80);
  docPdf.text(`Para: ${pres.cliente || ""}`, cx, ty, { align: "center" });
  ty += 8;
  docPdf.setFontSize(10);
  docPdf.text(`Fecha: ${formatDate(pres.fecha)}`, cx, ty, { align: "center" });
  ty += 10;

  // Línea decorativa inferior
  docPdf.setDrawColor(...PINK_DK); docPdf.setLineWidth(0.4);
  docPdf.line(cx - 40, ty, cx + 40, ty);

  // Pie de portada
  docPdf.setFontSize(8); docPdf.setTextColor(150, 150, 150);
  docPdf.text(
    `${EMPRESA.nombre}  |  Tel: ${EMPRESA.telefono}  |  ${EMPRESA.email}`,
    cx, PH - 8, { align: "center" }
  );

  // ══════════════════════════════════════════════════════════════════
  // UNA PÁGINA POR PRODUCTO
  // ══════════════════════════════════════════════════════════════════
  productos.forEach((prod, idx) => {
    docPdf.addPage();

    // Fondo blanco
    docPdf.setFillColor(255, 255, 255);
    docPdf.rect(0, 0, PW, PH, "F");

    // ── Header strip (sin verde) ──
    docPdf.setFillColor(246, 248, 250);
    docPdf.rect(0, 0, PW, 13, "F");
    // Borde superior del header
    docPdf.setDrawColor(...PINK); docPdf.setLineWidth(1.2);
    docPdf.line(0, 0, PW, 0);
    docPdf.setLineWidth(0.3); docPdf.setDrawColor(200, 205, 210);
    docPdf.line(0, 13, PW, 13);
    // Logo empresa pequeño en header
    if (logoAzaleaBase64) addImageFit(docPdf, logoAzaleaBase64, 3, 1.5, 16, 9);
    docPdf.setFont("helvetica", "normal"); docPdf.setFontSize(7.5); docPdf.setTextColor(100, 100, 100);
    docPdf.text(`${pres.titulo} — ${pres.cliente}  |  Pág. ${idx + 2}`, PW - MR, 8, { align: "right" });
    docPdf.setTextColor(0, 0, 0);

    // ── Foto del producto (izquierda) ──
    const photoBoxX = ML;
    const photoBoxY = 17;
    const photoBoxW = 128;
    const photoBoxH = PH - photoBoxY - 8;

    const fotosData  = (loadedFotosArrays[idx] || []).filter(Boolean);
    const mainFoto   = fotosData[0] || null;
    const extraFotos = fotosData.slice(1);          // hasta 3

    const hasExtras  = extraFotos.length > 0;
    const mainH      = hasExtras ? Math.round(photoBoxH * 0.68) : photoBoxH;
    const thumbGap   = 3;
    const thumbY     = photoBoxY + mainH + thumbGap;
    const thumbH     = photoBoxH - mainH - thumbGap;
    const n          = extraFotos.length;

    // Foto principal
    if (mainFoto) {
      addImageCentered(docPdf, mainFoto,
        mainFoto.startsWith("data:image/png") ? "PNG" : "JPEG",
        photoBoxX + 2, photoBoxY + 2, photoBoxW - 4, mainH - 4);
    } else {
      docPdf.setFillColor(248, 249, 250);
      docPdf.rect(photoBoxX + 1, photoBoxY + 1, photoBoxW - 2, mainH - 2, "F");
      docPdf.setFontSize(9); docPdf.setTextColor(190, 190, 190);
      docPdf.text("Sin foto", photoBoxX + photoBoxW / 2, photoBoxY + mainH / 2, { align: "center" });
      docPdf.setTextColor(0, 0, 0);
    }

    // Fotos adicionales (thumbnails)
    if (hasExtras) {
      const thumbW = Math.floor((photoBoxW - (n - 1) * thumbGap) / n);
      extraFotos.forEach((img, ti) => {
        const tx = photoBoxX + ti * (thumbW + thumbGap);
        if (img) {
          addImageCentered(docPdf, img,
            img.startsWith("data:image/png") ? "PNG" : "JPEG",
            tx + 1, thumbY + 1, thumbW - 2, thumbH - 2);
        }
      });
      // Separador sutil entre principal y thumbnails
      docPdf.setDrawColor(220, 222, 226); docPdf.setLineWidth(0.2);
      docPdf.line(photoBoxX, thumbY - 1, photoBoxX + photoBoxW, thumbY - 1);
    }

    // ── Divisor vertical ──
    docPdf.setDrawColor(...PINK); docPdf.setLineWidth(0.5);
    const divX = photoBoxX + photoBoxW + 7;
    docPdf.line(divX, photoBoxY, divX, photoBoxY + photoBoxH);

    // ── Datos del producto (derecha) ──
    const dataX  = divX + 8;
    const dataW  = PW - MR - dataX;
    let dy = photoBoxY + 10;

    const marcaLogoImg = loadedMarcaLogos[idx];

    // ── Título: barra lateral teal + nombre grande ──
    const accentW = 3.5;
    const accentGap = 5;
    const titleX = dataX + accentW + accentGap;
    const titleW = dataW - accentW - accentGap;

    docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(21); docPdf.setTextColor(20, 20, 20);
    const nombreLines = docPdf.splitTextToSize((prod.nombre || "Sin nombre").toUpperCase(), titleW);
    const lineH = 9;
    const titleBlockH = nombreLines.length * lineH;

    // Barra vertical de acento
    docPdf.setFillColor(...PINK);
    docPdf.rect(dataX, dy - lineH + 2, accentW, titleBlockH + 1, "F");

    // Nombre
    docPdf.text(nombreLines, titleX, dy);
    dy += titleBlockH + 4;

    // Línea separadora fina
    docPdf.setDrawColor(220, 224, 228); docPdf.setLineWidth(0.3);
    docPdf.line(dataX, dy, PW - MR, dy);
    dy += 10;

    // Helper para filas de datos
    function dataRow(label, value) {
      if (value === "" || value === 0 || value === undefined || value === null) return;
      docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(7.5); docPdf.setTextColor(120, 120, 120);
      docPdf.text(label.toUpperCase(), dataX, dy);
      docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(13); docPdf.setTextColor(20, 20, 20);
      docPdf.text(String(value), dataX, dy + 7);
      dy += 20;
    }

    const ivaLabel = pres.conIva ? "c/IVA" : "s/IVA";
    if (prod.marca)          dataRow("Marca",                               prod.marca);
    if (prod.precio)         dataRow(`Precio (${ivaLabel})`,                formatUSD(prod.precio));
    if (prod.cantidadMinima) dataRow("Cantidad mínima",                     `${formatNum(prod.cantidadMinima)} unidades`);
    if (prod.precioBordado)  dataRow(`${prod.tipoGrabado || "Bordado"} (${ivaLabel})`, `${formatUSD(prod.precioBordado)} / unidad`);
    if (prod.plazo)          dataRow("Plazo de entrega",                    prod.plazo);

    // Logo de marca — centrado debajo del plazo de entrega
    if (marcaLogoImg) {
      dy += 4;
      const logoMaxW = 60, logoMaxH = 28;
      const logoBoxX = dataX + (dataW - logoMaxW) / 2;
      addImageFit(docPdf, marcaLogoImg, logoBoxX, dy, logoMaxW, logoMaxH);
    }

    // Número de página (pie)
    docPdf.setFont("helvetica", "normal"); docPdf.setFontSize(7.5); docPdf.setTextColor(180, 180, 180);
    docPdf.text(`Pág. ${idx + 2}`, PW - MR, PH - 3, { align: "right" });
    docPdf.setTextColor(0, 0, 0);
  });

  // ══════════════════════════════════════════════════════════════════
  // PÁGINA FINAL — despedida y contacto
  // ══════════════════════════════════════════════════════════════════
  docPdf.addPage();

  // Fondo rosa muy suave
  docPdf.setFillColor(...PINK_LT);
  docPdf.rect(0, 0, PW, PH, "F");

  // Banda superior rosa
  docPdf.setFillColor(...PINK);
  docPdf.rect(0, 0, PW, 4, "F");

  // Banda inferior rosa
  docPdf.setFillColor(...PINK);
  docPdf.rect(0, PH - 4, PW, 4, "F");

  // ── Logos centrados (más grandes que en portada) ──
  const fcLogoH = 48, fcLogoW = 80, fcGap = 28, fcLogoY = 22;
  if (logoAzaleaBase64 && pres.logoCliente) {
    addImageFit(docPdf, logoAzaleaBase64, cx - fcLogoW - fcGap / 2, fcLogoY, fcLogoW, fcLogoH);
    // Separador vertical suave
    docPdf.setDrawColor(220, 190, 210); docPdf.setLineWidth(0.3);
    docPdf.line(cx, fcLogoY + 6, cx, fcLogoY + fcLogoH - 6);
    addImageFit(docPdf, pres.logoCliente, cx + fcGap / 2, fcLogoY, fcLogoW, fcLogoH);
  } else if (logoAzaleaBase64) {
    addImageFit(docPdf, logoAzaleaBase64, cx - fcLogoW / 2, fcLogoY, fcLogoW, fcLogoH);
  } else if (pres.logoCliente) {
    addImageFit(docPdf, pres.logoCliente, cx - fcLogoW / 2, fcLogoY, fcLogoW, fcLogoH);
  }

  // ── Línea divisoria ──
  const fcDivY = fcLogoY + fcLogoH + 8;
  docPdf.setDrawColor(...PINK); docPdf.setLineWidth(0.5);
  docPdf.line(cx - 55, fcDivY, cx + 55, fcDivY);

  // ── Texto de despedida ──
  let fcY = fcDivY + 12;
  docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(13); docPdf.setTextColor(40, 40, 40);
  docPdf.text("Quedamos a su disposición para cualquier consulta.", cx, fcY, { align: "center" });
  // ── Segunda línea ──
  fcY += 10;
  docPdf.setDrawColor(...PINK_DK); docPdf.setLineWidth(0.3);
  docPdf.line(cx - 30, fcY, cx + 30, fcY);

  // ── Datos de contacto ──
  fcY += 11;
  const iconX = cx - 52;
  const textX = cx - 44;

  // Teléfono
  docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(9); docPdf.setTextColor(...PINK_DK);
  docPdf.text("Tel.", iconX, fcY);
  docPdf.setFont("helvetica", "normal"); docPdf.setTextColor(40, 40, 40);
  docPdf.text(EMPRESA.telefono, textX, fcY);
  fcY += 8;

  // Email
  docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(9); docPdf.setTextColor(...PINK_DK);
  docPdf.text("Mail", iconX, fcY);
  docPdf.setFont("helvetica", "normal"); docPdf.setTextColor(40, 40, 40);
  docPdf.text(EMPRESA.email, textX, fcY);
  fcY += 12;

  // Nombre empresa
  docPdf.setFont("helvetica", "bold"); docPdf.setFontSize(11); docPdf.setTextColor(...PINK);
  docPdf.text(EMPRESA.nombre.toUpperCase(), cx, fcY, { align: "center" });

  docPdf.setTextColor(0, 0, 0);

  const filename = `Presentacion_${(pres.cliente || "cliente").replace(/\s+/g, "_")}_${pres.fecha || todayStr()}.pdf`;
  docPdf.save(filename);
}

// ══════════════════════════════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════════════════════════════

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      const tab = document.getElementById(`tab-${btn.dataset.tab}`);
      if (tab) tab.classList.add("active");
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// NAV HAMBURGUESA
// ══════════════════════════════════════════════════════════════════════════════

function setupNavToggle() {
  const h = document.querySelector(".hamburger");
  const m = document.querySelector(".menubar");
  if (h && m) h.addEventListener("click", () => m.classList.toggle("active"));
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════════════════════════════════════════════

function setupEventListeners() {
  // ── Cotizaciones ──
  document.getElementById("btnNuevaCotizacion").addEventListener("click", openNewForm);
  document.getElementById("closeFormModal").addEventListener("click", closeFormModal);
  document.getElementById("btnCancelarForm").addEventListener("click", closeFormModal);
  document.getElementById("btnGuardar").addEventListener("click",    () => saveCotizacion(false));
  document.getElementById("btnGuardarPDF").addEventListener("click", () => saveCotizacion(true));

  document.getElementById("btnAgregarCatalogo").addEventListener("click", () => openCatalogoModal("cotizacion"));
  document.getElementById("btnAgregarNuevo").addEventListener("click",    () => addItemRow());

  document.getElementById("inputLogoCliente").addEventListener("change", function() {
    const file = this.files[0]; if (!file) { logoClienteBase64 = null; return; }
    if (file.size > 500000) alert("Logo > 500 KB. Se recomienda una imagen más pequeña.");
    const r = new FileReader();
    r.onload = (e) => {
      logoClienteBase64 = e.target.result;
      const p = document.getElementById("previewLogoCliente");
      p.src = logoClienteBase64; p.style.display = "block";
    };
    r.readAsDataURL(file);
  });

  document.getElementById("btnGestionarCatalogo").addEventListener("click", () => {
    renderGestionCatalogo();
    document.getElementById("articuloForm").style.display = "none";
    document.getElementById("gestionCatalogoModal").style.display = "block";
  });

  // ── Catálogo modal (compartido) ──
  document.getElementById("closeCatalogoModal").addEventListener("click", () => {
    document.getElementById("catalogoModal").style.display = "none";
  });
  document.getElementById("catalogSearch").addEventListener("input", function() {
    const q = this.value.toLowerCase();
    renderCatalogBody(catalogo.filter(a =>
      a.nombre.toLowerCase().includes(q) || (a.marca || "").toLowerCase().includes(q)
    ));
  });

  // ── Gestión catálogo ──
  document.getElementById("closeGestionModal").addEventListener("click", () => {
    document.getElementById("gestionCatalogoModal").style.display = "none";
  });
  document.getElementById("btnNuevoArticulo").addEventListener("click", () => showArticuloForm());
  document.getElementById("btnGuardarArticulo").addEventListener("click", saveArticulo);
  document.getElementById("btnCancelarArticulo").addEventListener("click", () => {
    document.getElementById("articuloForm").style.display = "none";
  });

  // File upload en catálogo
  document.getElementById("articuloFotoFile").addEventListener("change", function() {
    const file = this.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = (e) => {
      document.getElementById("articuloFotoUrl").value = e.target.result;
      const p = document.getElementById("articuloFotoPreview");
      p.src = e.target.result; p.style.display = "block";
    };
    r.readAsDataURL(file);
  });
  document.getElementById("articuloFotoUrl").addEventListener("input", function() {
    const p = document.getElementById("articuloFotoPreview");
    if (this.value) { p.src = this.value; p.style.display = "block"; }
    else { p.style.display = "none"; }
  });

  // ── Presentaciones ──
  document.getElementById("btnNuevaPresentacion").addEventListener("click", openNewPresentacionForm);
  document.getElementById("closePresModal").addEventListener("click", closePresModal);
  document.getElementById("btnCancelarPres").addEventListener("click", closePresModal);
  document.getElementById("btnGuardarPres").addEventListener("click",    () => savePresentacion(false));
  document.getElementById("btnGuardarPDFPres").addEventListener("click", () => savePresentacion(true));

  document.getElementById("btnAgregarProdCatalogo").addEventListener("click", () => openCatalogoModal("presentacion"));
  document.getElementById("btnAgregarProdNuevo").addEventListener("click",    () => addProdRow());

  document.getElementById("presLogoFile").addEventListener("change", function() {
    const file = this.files[0]; if (!file) { logoPresentBase64 = null; return; }
    const r = new FileReader();
    r.onload = (e) => {
      logoPresentBase64 = e.target.result;
      const p = document.getElementById("presLogoPreview");
      p.src = logoPresentBase64; p.style.display = "block";
    };
    r.readAsDataURL(file);
  });

  // ── Gestión de marcas ──
  document.getElementById("btnGestionarMarcas").addEventListener("click", openGestionMarcasModal);
  document.getElementById("closeGestionMarcasModal").addEventListener("click", () => {
    document.getElementById("gestionMarcasModal").style.display = "none";
  });
  document.getElementById("btnNuevaMarca").addEventListener("click", () => showMarcaForm());
  document.getElementById("btnGuardarMarca").addEventListener("click", guardarMarca);
  document.getElementById("btnCancelarMarca").addEventListener("click", () => {
    document.getElementById("marcaForm").style.display = "none";
  });
  document.getElementById("marcaLogoFile").addEventListener("change", function() {
    const file = this.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = (e) => {
      document.getElementById("marcaLogoUrl").value = e.target.result;
      const p = document.getElementById("marcaLogoPreview");
      p.src = e.target.result; p.style.display = "block";
    };
    r.readAsDataURL(file);
  });
  document.getElementById("marcaLogoUrl").addEventListener("input", function() {
    const p = document.getElementById("marcaLogoPreview");
    if (this.value) { p.src = this.value; p.style.display = "block"; }
    else            { p.style.display = "none"; }
  });

  // ── Cerrar modales al click fuera ──
  window.addEventListener("click", (e) => {
    if (e.target === document.getElementById("formModal"))             closeFormModal();
    if (e.target === document.getElementById("catalogoModal"))         document.getElementById("catalogoModal").style.display = "none";
    if (e.target === document.getElementById("gestionCatalogoModal"))  document.getElementById("gestionCatalogoModal").style.display = "none";
    if (e.target === document.getElementById("formPresentacionModal")) closePresModal();
    if (e.target === document.getElementById("gestionMarcasModal"))   document.getElementById("gestionMarcasModal").style.display = "none";
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCIONES GLOBALES (llamadas desde onclick inline)
// ══════════════════════════════════════════════════════════════════════════════

window._editCot   = (id) => { const c = cotizaciones.find(x => x.id === id);   if (c) openEditForm(c); };
window._deleteCot = (id) => deleteCotizacion(id);
window._pdfCot    = (id) => { const c = cotizaciones.find(x => x.id === id);   if (c) generateCotizacionPDF(c); };

window._editPres  = (id) => { const p = presentaciones.find(x => x.id === id); if (p) openEditPresentacionForm(p); };
window._deletePres = (id) => deletePresentacion(id);
window._pdfPres   = async (id) => { const p = presentaciones.find(x => x.id === id); if (p) await generatePresentacionPDF(p); };

// ══════════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════════

async function init() {
  setupNavToggle();
  setupTabs();
  await preloadLogo();
  await Promise.all([loadCatalogo(), loadMarcasLogos()]);
  await Promise.all([loadCotizaciones(), loadPresentaciones()]);
  setupEventListeners();
}

document.addEventListener("DOMContentLoaded", init);
