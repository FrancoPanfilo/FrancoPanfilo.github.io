/* Azalea Golf - Widget Publicar Palo */
(() => {
  if (window.__azaleaGolfWidgetLoaded) return;
  window.__azaleaGolfWidgetLoaded = true;

  const PALOS_URL = "https://francopanfilo.github.io/AzaleaGolf/Datos/palos-golf.json";
  const WEB3FORMS_KEY = "7c3ebe1f-1e99-450e-8fac-a1b94c2605e7";
  const IMGBB_KEY = "bac58a0a136de556928645f887ef160e";

  const CSS = `
.gw-ov{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);align-items:center;justify-content:center;padding:20px}
.gw-ov.o{display:flex}
.gw-md{position:relative;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;background:#f5f5f5;border-radius:4px;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.gw-cl{position:absolute;top:12px;right:14px;width:30px;height:30px;border-radius:50%;border:0;background:#e2e2e2;color:#111;font:700 18px/1 inherit;cursor:pointer}
.gw-cl:hover{background:#cdcdcd}
.gw-bo{display:inline-block;padding:10px 22px;background:transparent;color:#767676;border:1px solid #cdcdcd;border-radius:999px;font:500 13px 'Jost',Arial,sans-serif;letter-spacing:.02em;cursor:pointer;transition:.2s}
.gw-bo:hover{color:#111;border-color:#111}
.gw{box-sizing:border-box;font-family:'Jost',Arial,sans-serif;max-width:520px;margin:0 auto;color:#525252}
.gw *,.gw *::before,.gw *::after{box-sizing:border-box}
.gw .c{background:#fff;border:1px solid #e2e2e2;border-radius:4px;padding:20px;margin-bottom:14px}
.gw .t{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
.gw .t:empty{display:none}
.gw .ch{display:inline-flex;align-items:center;padding:4px 4px 4px 10px;background:#fff5f4;color:#FF6F61;border:1px solid #ffc9c4;border-radius:999px;font-size:12px;line-height:1.4}
.gw .ch .l{color:#767676;margin-right:5px}
.gw .ch .v{font-weight:600}
.gw .ch .x{background:0 0;border:0;color:#FF6F61;cursor:pointer;padding:0 6px 0 5px;font:700 16px/1 inherit;opacity:.6}
.gw .ch .x:hover{opacity:1}
.gw .sn{font:600 11px/1 inherit;color:#FF6F61;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.gw .st{font-size:16px;font-weight:600;margin-bottom:12px;color:#111}
.gw select,.gw input{width:100%;padding:11px 12px;border:1px solid #e2e2e2;border-radius:4px;font:14px 'Jost',Arial,sans-serif;background:#fff;color:#111}
.gw select:focus,.gw input:focus{outline:0;border-color:#FF6F61;box-shadow:0 0 0 2px rgba(255,111,97,.15)}
.gw .r,.gw .r2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.gw .dm{padding:10px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:4px;font-size:13px;font-weight:500;text-align:center;margin-bottom:14px}
.gw .dm .n{font-weight:700;color:#111}
.gw button{padding:9px 14px;border:1px solid #e2e2e2;border-radius:4px;background:#fff;cursor:pointer;font:600 13px inherit;color:#111}
.gw button:hover{background:#f5f5f5}
.gw .br{font-size:12px;color:#767676;border:0;padding:6px 0;background:0 0;text-decoration:underline}
.gw .br:hover{color:#111;background:0 0}
.gw .fg{margin-bottom:14px}
.gw .fl{display:block;font-size:13px;font-weight:600;color:#111;margin-bottom:5px}
.gw .fh{font-size:11px;color:#A0A0A0;margin-top:3px}
.gw .pa{border:2px dashed #e2e2e2;border-radius:4px;padding:16px;text-align:center;cursor:pointer}
.gw .pa:hover,.gw .pa.d{border-color:#FF6F61;background:#fff5f4}
.gw .pa input{display:none}
.gw .pa .p{font-size:13px;color:#767676}
.gw .pa .p strong{color:#FF6F61}
.gw .pg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
.gw .ph{position:relative;aspect-ratio:1;border-radius:4px;overflow:hidden;border:1px solid #e2e2e2}
.gw .ph img{width:100%;height:100%;object-fit:cover}
.gw .ph .rm{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:0;font:12px/18px inherit;cursor:pointer;padding:0}
.gw .bs{width:100%;padding:14px;background:#111;color:#fff;border:0;font:600 14px inherit;cursor:pointer;text-transform:uppercase;letter-spacing:.06em}
.gw .bs:hover{background:#FF6F61}
.gw .bs:disabled{background:#cdcdcd;cursor:not-allowed}
.gw .su{text-align:center;padding:40px 20px}
.gw .su .i{font-size:48px;margin-bottom:12px}
.gw .su .m{font-size:15px;color:#525252;line-height:1.6}
`;

  const MODAL_HTML = `<div class="gw-ov" id="gO"><div class="gw-md"><button class="gw-cl" id="gCloseBtn">×</button><div class="gw" id="gW"><div class="c"><div class="t" id="gT"></div><div id="gS"></div></div><div id="gE" style="display:none"></div></div></div></div>`;

  const TIPO_LABELS = { driver: "Driver", madera: "Madera", hibrido: "Híbrido", hierros: "Hierros", wedge: "Wedge", putter: "Putter" };
  const TIPO_ORDEN = ["driver", "madera", "hibrido", "hierros", "wedge", "putter"];
  const LOFTS = {
    driver: ["8°", "9°", "9.5°", "10.5°", "12°"],
    madera: ["13°", "13.5°", "15° (3W)", "16.5°", "18° (5W)", "21° (7W)", "24° (9W)"],
    hibrido: ["16°", "17°", "18°", "19°", "20°", "21°", "22°", "23°", "24°", "25°", "26°", "27°", "28°"],
    wedge: ["46°", "48°", "50°", "52°", "54°", "56°", "58°", "60°", "62°", "64°"]
  };
  const SET_DESDE = ["3", "4", "5", "6", "7", "8"];
  const SET_HASTA = ["8", "9", "PW", "AW (GW)", "SW", "LW"];
  const ORDEN_CAMPOS = ["marca", "tipo", "modelo", "version", "anio", "loft", "setDesde", "setHasta"];

  let PALOS = [];
  const state = { marca: null, tipo: null, modelo: null, version: null, anio: null, loft: null, setDesde: null, setHasta: null };
  const photos = [];

  const $ = id => document.getElementById(id);
  const uniq = arr => [...new Set(arr)];

  function aniosDisponibles() {
    return uniq(PALOS.filter(p => p.marca === state.marca && p.tipo === state.tipo && p.modelo === state.modelo && p.version === state.version).map(p => p.anio)).sort((a, b) => b - a);
  }

  function autoAvanzar() {
    if (state.marca && state.tipo && state.modelo && state.version && !state.anio) {
      const a = aniosDisponibles();
      if (a.length === 1) state.anio = a[0];
    }
  }

  function pasoActivo() {
    autoAvanzar();
    if (!state.marca) return "marca";
    if (!state.tipo) return "tipo";
    if (!state.modelo) return "modelo";
    if (!state.version) return "version";
    if (!state.anio) return "anio";
    if (state.tipo === "putter") return "done";
    if (state.tipo === "hierros") {
      if (!state.setDesde || !state.setHasta) return "extra";
    } else if (!state.loft) return "extra";
    return "done";
  }

  window.gV = (campo, valor) => { state[campo] = valor || null; render(); };
  window.gB = campo => {
    const idx = ORDEN_CAMPOS.indexOf(campo);
    ORDEN_CAMPOS.forEach((k, i) => { if (i >= idx) state[k] = null; });
    render();
  };

  function chipsHTML() {
    const chips = [];
    if (state.marca) chips.push(["marca", "Marca", state.marca]);
    if (state.tipo) chips.push(["tipo", "Tipo", TIPO_LABELS[state.tipo]]);
    if (state.modelo) chips.push(["modelo", "Modelo", state.modelo]);
    if (state.version) chips.push(["version", "Versión", state.version]);
    if (state.anio) {
      const a = aniosDisponibles();
      if (a.length > 1) chips.push(["anio", "Año", state.anio]);
    }
    if (state.loft) chips.push(["loft", "Loft", state.loft]);
    if (state.setDesde && state.setHasta) chips.push(["setDesde", "Set", `${state.setDesde}–${state.setHasta}`]);
    return chips.map(([k, l, v]) => `<span class="ch"><span class="l">${l}:</span><span class="v">${v}</span><button class="x" onclick="gB('${k}')">×</button></span>`).join("");
  }

  const selectStep = (n, t, ti, o, c) => `<div class="sn">Paso ${n} de ${t}</div><div class="st">${ti}</div><select onchange="gV('${c}',this.value)"><option value="">Elegir…</option>${o}</select>`;

  function modeloOptions() {
    const g = {};
    PALOS.filter(p => p.marca === state.marca && p.tipo === state.tipo).forEach(p => {
      if (g[p.modelo]) {
        g[p.modelo].max = Math.max(g[p.modelo].max, p.anio);
        g[p.modelo].min = Math.min(g[p.modelo].min, p.anio);
      } else g[p.modelo] = { modelo: p.modelo, max: p.anio, min: p.anio };
    });
    return Object.values(g).sort((a, b) => b.max - a.max || a.modelo.localeCompare(b.modelo))
      .map(g => `<option value="${g.modelo}">${g.modelo} (${g.min === g.max ? g.max : g.min + "–" + g.max})</option>`).join("");
  }

  function tipoOptions() {
    const t = uniq(PALOS.filter(p => p.marca === state.marca).map(p => p.tipo));
    return TIPO_ORDEN.filter(x => t.includes(x)).map(x => `<option value="${x}">${TIPO_LABELS[x]}</option>`).join("");
  }

  const versionOptions = () => uniq(PALOS.filter(p => p.marca === state.marca && p.tipo === state.tipo && p.modelo === state.modelo).map(p => p.version)).sort((a, b) => a.localeCompare(b, "es")).map(v => `<option value="${v}">${v}</option>`).join("");
  const anioOptions = () => aniosDisponibles().map(a => `<option value="${a}">${a}</option>`).join("");

  function extraStepHTML() {
    if (state.tipo === "hierros") {
      return `<div class="sn">Paso final</div><div class="st">Composición del set</div><div class="r"><select onchange="gV('setDesde',this.value)"><option value="">Desde…</option>${SET_DESDE.map(x => `<option value="${x}" ${state.setDesde === x ? "selected" : ""}>${x}</option>`).join("")}</select><select onchange="gV('setHasta',this.value)"><option value="">Hasta…</option>${SET_HASTA.map(x => `<option value="${x}" ${state.setHasta === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>`;
    }
    const l = LOFTS[state.tipo] || [];
    return `<div class="sn">Paso final</div><div class="st">Loft</div><select onchange="gV('loft',this.value)"><option value="">Elegir loft…</option>${l.map(x => `<option value="${x}">${x}</option>`).join("")}</select>`;
  }

  function paloFinal() {
    return PALOS.find(p => p.marca === state.marca && p.tipo === state.tipo && p.modelo === state.modelo && p.version === state.version && String(p.anio) === String(state.anio));
  }

  function paloResumen() {
    const p = paloFinal();
    if (!p) return "";
    let e = "";
    if (p.tipo === "hierros" && state.setDesde && state.setHasta) e = ` · Set ${state.setDesde}–${state.setHasta}`;
    else if (state.loft) e = ` · ${state.loft}`;
    return `${p.marca} ${p.modelo} ${p.version} (${p.anio}) — ${TIPO_LABELS[p.tipo]}${e}`;
  }

  function render() {
    $("gT").innerHTML = chipsHTML();
    const p = pasoActivo();
    let h = "";
    switch (p) {
      case "marca": {
        const m = uniq(PALOS.map(p => p.marca)).sort((a, b) => a.localeCompare(b, "es"));
        h = selectStep(1, 5, "¿Qué marca?", m.map(x => `<option value="${x}">${x}</option>`).join(""), "marca");
        break;
      }
      case "tipo": h = selectStep(2, 5, "¿Qué tipo de palo?", tipoOptions(), "tipo"); break;
      case "modelo": h = selectStep(3, 5, "¿Qué modelo?", modeloOptions(), "modelo"); break;
      case "version": h = selectStep(4, 5, "¿Qué versión?", versionOptions(), "version"); break;
      case "anio": h = selectStep(5, 5, "¿De qué año?", anioOptions(), "anio"); break;
      case "extra": h = extraStepHTML(); break;
      case "done": h = `<div class="dm"><span class="n">${paloResumen()}</span></div><button class="br" onclick="gR()">← Cambiar palo</button>`;
    }
    $("gS").innerHTML = h;
    renderExtra(p === "done");
  }

  function renderExtra(show) {
    const box = $("gE");
    if (!show) { box.style.display = "none"; return; }
    box.style.display = "block";
    box.innerHTML = `<div class="c"><div class="fg"><label class="fl">Fotos (máx. 8)</label><div class="pa" id="gPA" onclick="document.getElementById('gPI').click()" ondragover="event.preventDefault();this.classList.add('d')" ondragleave="this.classList.remove('d')" ondrop="event.preventDefault();this.classList.remove('d');gAF(event.dataTransfer.files)"><input type="file" id="gPI" accept="image/*" multiple onchange="gAF(this.files)"><div class="p"><strong>Click o arrastrá</strong> para subir fotos</div></div><div class="pg" id="gPG"></div><div class="fh" id="gPC">${photos.length}/8 fotos</div></div><div class="fg"><label class="fl">Precio de venta (USD)</label><input type="number" id="gIP" placeholder="Ej: 350" min="1" oninput="gCS()"></div><div class="r2"><div class="fg"><label class="fl">Email</label><input type="email" id="gIE" placeholder="tu@email.com" oninput="gCS()"></div><div class="fg"><label class="fl">Teléfono</label><input type="tel" id="gIT" placeholder="+598 99 123 456" oninput="gCS()"></div></div><button class="bs" id="gBE" disabled onclick="gEF()">Publicar palo</button></div>`;
    renderPhotos();
    window.gCS();
  }

  window.gAF = files => {
    for (const f of files) {
      if (photos.length >= 8) break;
      if (!f.type.startsWith("image/")) continue;
      photos.push({ file: f, url: URL.createObjectURL(f) });
    }
    renderPhotos();
    window.gCS();
  };

  window.gRP = i => {
    URL.revokeObjectURL(photos[i].url);
    photos.splice(i, 1);
    renderPhotos();
    window.gCS();
  };

  function renderPhotos() {
    const grid = $("gPG"), count = $("gPC");
    if (!grid) return;
    grid.innerHTML = photos.map((p, i) => `<div class="ph"><img src="${p.url}"><button class="rm" onclick="event.stopPropagation();gRP(${i})">×</button></div>`).join("");
    if (count) count.textContent = `${photos.length}/8 fotos`;
    const area = $("gPA");
    if (area) area.style.display = photos.length >= 8 ? "none" : "";
  }

  window.gCS = () => {
    const btn = $("gBE");
    if (!btn) return;
    const p = $("gIP")?.value.trim();
    const e = $("gIE")?.value.trim();
    const t = $("gIT")?.value.trim();
    btn.disabled = !(photos.length > 0 && p && e && t);
  };

  function uploadImgBB(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const fd = new FormData();
        fd.append("key", IMGBB_KEY);
        fd.append("image", reader.result.split(",")[1]);
        fd.append("name", file.name);
        try {
          const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (data.success) resolve(data.data.url);
          else reject(new Error(data.error?.message || "imgBB error"));
        } catch (e) { reject(e); }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  window.gEF = async () => {
    const btn = $("gBE");
    btn.disabled = true;
    const email = $("gIE").value;
    const resumen = paloResumen();
    let urls = [];
    if (photos.length > 0) {
      for (let i = 0; i < photos.length; i++) {
        btn.textContent = `Subiendo fotos (${i + 1}/${photos.length})…`;
        try {
          urls.push(await uploadImgBB(photos[i].file));
        } catch (e) {
          console.error(e);
          btn.disabled = false;
          btn.textContent = "Publicar palo";
          alert(`Error subiendo foto ${i + 1}`);
          return;
        }
      }
    }
    btn.textContent = "Enviando…";
    const form = new FormData();
    form.append("access_key", WEB3FORMS_KEY);
    form.append("subject", "Nuevo palo en venta: " + resumen);
    form.append("from_name", "Azalea Sports - Publicación");
    form.append("replyto", email);
    form.append("botcheck", "");
    form.append("Palo", resumen);
    form.append("Precio USD", $("gIP").value);
    form.append("Email vendedor", email);
    form.append("Teléfono", $("gIT").value);
    if (urls.length > 0) form.append("Fotos", urls.join("\n"));
    try {
      const res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: form });
      const data = await res.json();
      if (data.success) {
        $("gW").innerHTML = `<div class="c su"><div class="i">✓</div><div class="m">¡Gracias! A la brevedad nos pondremos en contacto con usted para finalizar la publicación de sus artículos.</div></div>`;
      } else {
        btn.disabled = false;
        btn.textContent = "Publicar palo";
        alert("Error: " + (data.message || "Intentá de nuevo."));
      }
    } catch (e) {
      btn.disabled = false;
      btn.textContent = "Publicar palo";
      alert("Error de conexión.");
    }
  };

  window.gR = () => {
    Object.keys(state).forEach(k => state[k] = null);
    photos.forEach(p => URL.revokeObjectURL(p.url));
    photos.length = 0;
    render();
  };

  window.gA = async () => {
    $("gO").classList.add("o");
    document.body.style.overflow = "hidden";
    if (PALOS.length === 0) {
      try {
        PALOS = await (await fetch(PALOS_URL)).json();
        render();
      } catch (e) {
        $("gS").innerHTML = '<div style="color:#dc2626;padding:12px;text-align:center">Error cargando datos.</div>';
      }
    }
  };

  window.gC = () => {
    $("gO").classList.remove("o");
    document.body.style.overflow = "";
  };

  function init() {
    // Inject CSS
    const style = document.createElement("style");
    style.id = "azalea-golf-styles";
    style.textContent = CSS;
    document.head.appendChild(style);

    // Inject modal HTML
    const wrapper = document.createElement("div");
    wrapper.innerHTML = MODAL_HTML;
    document.body.appendChild(wrapper.firstElementChild);

    // Wire events
    $("gO").addEventListener("click", e => { if (e.target === e.currentTarget) window.gC(); });
    $("gCloseBtn").addEventListener("click", window.gC);

    // Auto-bind any element with class "azalea-publicar" or data-azalea-golf
    document.querySelectorAll(".azalea-publicar, [data-azalea-golf]").forEach(el => {
      if (!el.classList.contains("gw-bo")) el.classList.add("gw-bo");
      el.addEventListener("click", window.gA);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
