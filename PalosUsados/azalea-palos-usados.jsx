import { useState } from "react";

const WP = "https://azaleasports.com.uy";
const LOGO_COLOR = `${WP}/wp-content/uploads/2024/03/Azalea-Logo-Color-no-margin-PNG-small.png`;
const LOGO_WHITE = `${WP}/wp-content/uploads/2024/03/Azalea-Logo-White-no-margin-PNG-small.png`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --rz-color-primary: #FF7BAC;
  --rz-color-dark: #111111;
  --rz-text-color: #525252;
  --rz-text-color-gray: #767676;
  --rz-background-color-gray: #f5f5f5;
  --rz-border-color: #cccccc;
  --rz-border-color-light: #e2e2e2;
  --rz-font-family: 'Jost', Arial, sans-serif;
}

body {
  font-family: var(--rz-font-family);
  font-size: 14px;
  color: var(--rz-text-color);
  background: #fff;
  -webkit-font-smoothing: antialiased;
}

a { text-decoration: none; color: inherit; }

/* ─── HEADER ─────────────────────────────────────────────── */
.az-header {
  position: sticky; top: 0; z-index: 200;
  background: #fff;
  border-bottom: 1px solid var(--rz-border-color-light);
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
}
.az-header-inner {
  max-width: 1140px; margin: 0 auto;
  display: flex; align-items: center;
  padding: 0 20px; height: 90px;
  position: relative;
}
.az-logo { display: flex; align-items: center; flex-shrink: 0; }
.az-logo img { height: 60px; display: block; }

.az-nav-wrapper {
  flex: 1;
  display: flex; justify-content: center; align-items: center;
  height: 100%;
}
.az-nav {
  display: flex; align-items: center; height: 100%;
  list-style: none;
}
.az-nav > li {
  display: flex; align-items: center;
  padding: 8px 14px;
}
.az-nav > li > a {
  display: block;
  font-size: 16px; font-weight: 500;
  color: var(--rz-color-dark);
  padding: 3px;
  transition: color .3s;
  white-space: nowrap;
}
.az-nav > li > a:hover,
.az-nav > li.active > a { color: var(--rz-color-primary); }

.az-search-btn {
  background: none; border: none; cursor: pointer;
  padding: 8px; color: var(--rz-color-dark);
  display: flex; align-items: center; justify-content: center;
  transition: color .3s; flex-shrink: 0;
}
.az-search-btn:hover { color: var(--rz-color-primary); }
.az-search-btn svg { width: 20px; height: 20px; }

.az-burger {
  display: none; flex-direction: column; justify-content: center; gap: 5px;
  cursor: pointer; background: none; border: none; padding: 8px; flex-shrink: 0;
}
.az-burger span {
  display: block; width: 22px; height: 2px;
  background: var(--rz-color-dark); border-radius: 2px;
}

/* ─── PAGE TITLE BAR ──────────────────────────────────────── */
.az-page-title {
  background: var(--rz-background-color-gray);
  border-bottom: 1px solid var(--rz-border-color-light);
  padding: 18px 20px;
}
.az-page-title-inner {
  max-width: 1140px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
}
.az-page-title h1 {
  font-size: 22px; font-weight: 700; color: var(--rz-color-dark); letter-spacing: -.3px;
}
.az-breadcrumb { font-size: 12px; color: var(--rz-text-color-gray); }
.az-breadcrumb a { color: var(--rz-text-color-gray); }
.az-breadcrumb a:hover { color: var(--rz-color-primary); }
.az-breadcrumb span { margin: 0 6px; }

/* ─── LAYOUT ──────────────────────────────────────────────── */
.az-layout {
  max-width: 1140px; margin: 0 auto;
  display: flex; gap: 30px;
  padding: 28px 20px 60px;
  align-items: flex-start;
}

/* ─── SIDEBAR ─────────────────────────────────────────────── */
.az-sidebar { width: 240px; flex-shrink: 0; }
.az-filter-section { margin-bottom: 24px; }
.az-filter-section-title {
  font-size: 13px; font-weight: 700; color: var(--rz-color-dark);
  letter-spacing: .5px; text-transform: uppercase;
  padding-bottom: 10px; border-bottom: 2px solid var(--rz-color-dark);
  margin-bottom: 12px;
}
.az-filter-list { list-style: none; }
.az-filter-list li {
  font-size: 13px; color: var(--rz-text-color-gray);
  padding: 5px 0; cursor: pointer;
  display: flex; align-items: center; gap: 8px; transition: color .15s;
}
.az-filter-list li:hover { color: var(--rz-color-dark); }
.az-filter-list li input[type=checkbox] {
  width: 14px; height: 14px; cursor: pointer;
  accent-color: var(--rz-color-primary); flex-shrink: 0;
}
.az-filter-list.nested { padding-left: 18px; }
.az-filter-list li.parent-item {
  font-weight: 600; color: #333; cursor: default; padding-top: 8px;
}
.az-filter-list li.parent-item:first-child { padding-top: 0; }
.az-filter-actions { display: flex; gap: 8px; margin-top: 12px; }
.az-filter-btn {
  flex: 1; padding: 8px 0; font-family: var(--rz-font-family);
  font-size: 12px; font-weight: 700; letter-spacing: .4px;
  text-transform: uppercase; cursor: pointer; border-radius: 3px; transition: all .2s;
}
.az-filter-btn.primary {
  background: var(--rz-color-dark); color: #fff; border: 1px solid var(--rz-color-dark);
}
.az-filter-btn.primary:hover { background: #000; }
.az-filter-btn.secondary {
  background: transparent; color: var(--rz-text-color-gray); border: 1px solid var(--rz-border-color);
}
.az-filter-btn.secondary:hover { border-color: #999; color: var(--rz-color-dark); }

/* ─── RESULTS ─────────────────────────────────────────────── */
.az-results { flex: 1; min-width: 0; }
.az-tabs {
  display: flex; align-items: center;
  border-bottom: 2px solid var(--rz-border-color-light); margin-bottom: 20px;
}
.az-tab {
  font-size: 13px; font-weight: 500; color: var(--rz-text-color-gray);
  padding: 10px 18px; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: color .2s, border-color .2s;
}
.az-tab:hover { color: var(--rz-color-dark); }
.az-tab.active { color: var(--rz-color-dark); font-weight: 700; border-bottom-color: var(--rz-color-dark); }
.az-results-bar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; flex-wrap: wrap; gap: 10px;
}
.az-results-count { font-size: 13px; color: #888; }
.az-results-count strong { color: var(--rz-color-dark); }
.az-sort {
  font-family: var(--rz-font-family); font-size: 13px;
  padding: 7px 10px; border: 1px solid var(--rz-border-color-light); border-radius: 3px;
  color: var(--rz-text-color-gray); background: #fff; cursor: pointer; outline: none;
}

/* ─── PRODUCT GRID ─────────────────────────────────────────── */
.az-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 20px; margin-bottom: 28px;
}
.az-card {
  border: 1px solid var(--rz-border-color-light); border-radius: 4px;
  overflow: hidden; background: #fff;
  transition: box-shadow .2s, transform .2s;
  cursor: pointer; position: relative;
}
.az-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-2px); }
.az-card-badge {
  position: absolute; top: 10px; left: 10px; z-index: 1;
  background: #eb4f6c; color: #fff;
  font-size: 10px; font-weight: 700; letter-spacing: .5px;
  text-transform: uppercase; padding: 3px 8px; border-radius: 2px;
}
.az-card-img {
  background: var(--rz-background-color-gray); aspect-ratio: 1/1;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.az-card-img img { width: 100%; height: 100%; object-fit: contain; padding: 12px; }
.az-card-img-placeholder { font-size: 48px; opacity: .15; }
.az-card-body { padding: 12px; }
.az-card-brand {
  font-size: 11px; color: #999; font-weight: 500;
  text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px;
}
.az-card-brand a:hover { color: var(--rz-color-primary); }
.az-card-title {
  font-size: 13.5px; font-weight: 500; color: var(--rz-color-dark);
  line-height: 1.4; margin-bottom: 10px;
}
.az-card-price { font-size: 15px; font-weight: 700; color: var(--rz-color-dark); }
.az-load-more { text-align: center; padding: 10px 0 20px; }
.az-load-more a {
  display: inline-block; font-size: 13px; font-weight: 700; letter-spacing: .5px;
  text-transform: uppercase; color: #fff;
  background: var(--rz-color-dark); padding: 12px 36px; border-radius: 3px;
  transition: background .2s;
}
.az-load-more a:hover { background: var(--rz-color-primary); }

/* ─── FOOTER ──────────────────────────────────────────────── */
.az-footer { background: #1F1F1F; color: #aaa; padding: 48px 20px 0; }
.az-footer-inner {
  max-width: 1140px; margin: 0 auto;
  display: grid; grid-template-columns: 1.4fr 1fr 1.2fr 1fr;
  gap: 40px; padding-bottom: 40px;
}
.az-footer-logo { margin-bottom: 0; }
.az-footer-logo img { width: 180px; }

.az-footer-col-header {
  display: flex; align-items: center; justify-content: space-between;
}
.az-footer-col h4 {
  font-size: 13px; font-weight: 500; letter-spacing: 2px;
  text-transform: uppercase; color: #fff; line-height: 1;
  margin-bottom: 16px; padding-bottom: 13px; border-bottom: 1px solid #333;
}
.az-footer-chevron { display: none; }
.az-footer-col-body { display: block; }

.az-footer-col ul { list-style: none; }
.az-footer-col ul li { line-height: 1.8; }
.az-footer-col ul li a { font-size: 13px; color: #888; transition: color .2s; }
.az-footer-col ul li a:hover { color: #fff; }
.az-footer-col p { font-size: 13px; color: #888; line-height: 1.8; }

.az-footer-social { display: flex; gap: 16px; margin-top: 16px; }
.az-footer-social a {
  display: flex; align-items: center; justify-content: center;
  color: #888; transition: color .2s;
}
.az-footer-social a:hover { color: #fff; }
.az-footer-social svg { width: 22px; height: 22px; fill: currentColor; }

.az-footer-bottom {
  max-width: 1140px; margin: 0 auto;
  border-top: 1px solid #2e2e2e; padding: 22px 0;
  display: flex; align-items: center; justify-content: space-between;
}
.az-footer-bottom p { font-size: 12px; color: #666; }
.az-footer-bottom a { color: #666; }
.az-footer-bottom a:hover { color: #aaa; }
.az-footer-simbionte-logo img {
  height: 36px; opacity: .6; filter: brightness(0) invert(1);
}
/* Footer bottom tablet: apilar centrado */
@media (max-width: 900px) {
  .az-footer-bottom {
    flex-direction: column; align-items: center;
    text-align: center; gap: 16px;
  }
}

/* ─── RESPONSIVE ──────────────────────────────────────────── */
@media (max-width: 900px) {
  /* Header mobile: burger izq | logo centro | lupa der */
  .az-header-inner { justify-content: center; }
  .az-nav-wrapper { display: none; }
  .az-burger { display: flex; position: absolute; left: 20px; }
  .az-logo { position: absolute; left: 50%; transform: translateX(-50%); }
  .az-search-btn { position: absolute; right: 20px; }

  .az-sidebar { display: none; }
  .az-footer-inner {
    grid-template-columns: 180px 1fr 1fr;
  }
  /* Local+Contacto ocupa cols 2 y 3 en segunda fila, con sus secciones en 2 cols */
  .az-footer-col--split {
    grid-column: 2 / -1;
    display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
  }
}

@media (max-width: 640px) {
  .az-footer-inner { grid-template-columns: 1fr; gap: 0; padding-bottom: 0; }

  /* Logo col en mobile: centrado y más grande */
  .az-footer-logo-col {
    display: flex; justify-content: center;
    padding: 8px 0 32px; border-bottom: 1px solid #2a2a2a;
  }
  .az-footer-logo img { width: 160px; }

  /* Accordion mobile */
  .az-footer-col { border-bottom: 1px solid #2a2a2a; }
  .az-footer-col-header { cursor: pointer; padding: 16px 0; }
  .az-footer-col h4 {
    margin-bottom: 0; padding-bottom: 0; border-bottom: none;
  }
  .az-footer-chevron {
    display: block; color: #888; font-size: 18px;
    transition: transform .25s; line-height: 1;
  }
  .az-footer-chevron.open { transform: rotate(180deg); }
  .az-footer-col-body {
    overflow: hidden; max-height: 0;
    transition: max-height .3s ease, padding .3s ease;
    padding-bottom: 0;
  }
  .az-footer-col-body.open { max-height: 500px; padding-bottom: 16px; }

  /* Footer bottom mobile: apilado centrado */
  .az-footer-bottom {
    flex-direction: column; align-items: center;
    text-align: center; gap: 12px; padding: 24px 0;
  }

  .az-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
}
`;

const NAV = [
  { label: "Home",      href: `${WP}/` },
  { label: "Catálogo",  href: `${WP}/catalogo-articulos-golf/` },
  { label: "Simulador", href: `${WP}/simulador-de-golf/` },
  { label: "Acerca de", href: `${WP}/acerca-azalea-tienda-golf/` },
  { label: "Contacto",  href: `${WP}/contacto/` },
];

const PRODUCTS_FOOTER = [
  { label: "Palos",        href: `${WP}/product-category/palos/` },
  { label: "Pelotas",      href: `${WP}/product-category/pelotas/` },
  { label: "Bolsas",       href: `${WP}/product-category/bolsas/` },
  { label: "Carros",       href: `${WP}/product-category/carros/` },
  { label: "Accesorios",   href: `${WP}/product-category/accesorios/` },
  { label: "Indumentaria", href: `${WP}/product-category/indumentaria/` },
];

const PAGES_FOOTER = [
  { label: "Home",      href: `${WP}/` },
  { label: "Catálogo",  href: `${WP}/catalogo-articulos-golf/` },
  { label: "Simulador", href: `${WP}/simulador-de-golf/` },
  { label: "Acerca de", href: `${WP}/acerca-azalea-tienda-golf/` },
  { label: "Contacto",  href: `${WP}/contacto/` },
];

const TIPO_PALO = {
  Palos: ["Drivers", "Maderas & Híbridos", "Hierros", "Wedges", "Putters"],
};
const MARCAS = ["Adidas","Callaway","Cleveland","Cobra","Mizuno","Nike","Ping","Srixon","TaylorMade","Titleist","Travis Mathew"];
const ESTADO = ["Como nuevo", "Muy bueno", "Bueno"];
const FLEX   = ["Regular", "Stiff", "X-Stiff", "Senior", "Ladies"];
const MANO   = ["Diestro", "Zurdo"];
const PRECIO = ["Hasta US$ 50", "US$ 50–150", "US$ 150–300", "Más de US$ 300"];

const CARDS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function PalosUsados() {
  const [activeTab, setActiveTab] = useState("todos");
  const [openSection, setOpenSection] = useState(null);

  const toggle = (key) => setOpenSection(prev => prev === key ? null : key);

  return (
    <>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <header className="az-header">
        <div className="az-header-inner">
          {/* Burger mobile (izquierda) */}
          <button className="az-burger" aria-label="Menú">
            <span /><span /><span />
          </button>

          {/* Logo */}
          <a href={WP} className="az-logo">
            <img src={LOGO_COLOR} alt="Azalea Golf" />
          </a>

          {/* Nav desktop (centro) */}
          <div className="az-nav-wrapper">
            <ul className="az-nav">
              {NAV.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Lupa (derecha) */}
          <button className="az-search-btn" aria-label="Buscar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── TITLE BAR ── */}
      <div className="az-page-title">
        <div className="az-page-title-inner">
          <h1>Palos Usados</h1>
          <div className="az-breadcrumb">
            <a href={WP}>Home</a>
            <span>›</span>
            Palos Usados
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="az-layout">

        {/* ── SIDEBAR ── */}
        <aside className="az-sidebar">
          <div className="az-filter-section">
            <div className="az-filter-section-title">Tipo de producto</div>
            <ul className="az-filter-list">
              {Object.entries(TIPO_PALO).map(([parent, children]) => (
                <>
                  <li className="parent-item" key={parent}>{parent}</li>
                  {children.map((c) => (
                    <li key={c}>
                      <input type="checkbox" id={`tipo-${c}`} />
                      <label htmlFor={`tipo-${c}`}>{c}</label>
                    </li>
                  ))}
                </>
              ))}
            </ul>
            <div className="az-filter-actions">
              <button className="az-filter-btn secondary">Clear</button>
              <button className="az-filter-btn primary">Show Results</button>
            </div>
          </div>

          <div className="az-filter-section">
            <div className="az-filter-section-title">Marcas</div>
            <ul className="az-filter-list">
              {MARCAS.map((m) => (
                <li key={m}>
                  <input type="checkbox" id={`marca-${m}`} />
                  <label htmlFor={`marca-${m}`}>{m}</label>
                </li>
              ))}
            </ul>
            <div className="az-filter-actions">
              <button className="az-filter-btn secondary">Clear</button>
              <button className="az-filter-btn primary">Show Results</button>
            </div>
          </div>

          <div className="az-filter-section">
            <div className="az-filter-section-title">Estado</div>
            <ul className="az-filter-list">
              {ESTADO.map((e) => (
                <li key={e}>
                  <input type="checkbox" id={`estado-${e}`} />
                  <label htmlFor={`estado-${e}`}>{e}</label>
                </li>
              ))}
            </ul>
            <div className="az-filter-actions">
              <button className="az-filter-btn secondary">Clear</button>
              <button className="az-filter-btn primary">Show Results</button>
            </div>
          </div>

          <div className="az-filter-section">
            <div className="az-filter-section-title">Flex</div>
            <ul className="az-filter-list">
              {FLEX.map((f) => (
                <li key={f}>
                  <input type="checkbox" id={`flex-${f}`} />
                  <label htmlFor={`flex-${f}`}>{f}</label>
                </li>
              ))}
            </ul>
            <div className="az-filter-actions">
              <button className="az-filter-btn secondary">Clear</button>
              <button className="az-filter-btn primary">Show Results</button>
            </div>
          </div>

          <div className="az-filter-section">
            <div className="az-filter-section-title">Mano</div>
            <ul className="az-filter-list">
              {MANO.map((m) => (
                <li key={m}>
                  <input type="checkbox" id={`mano-${m}`} />
                  <label htmlFor={`mano-${m}`}>{m}</label>
                </li>
              ))}
            </ul>
            <div className="az-filter-actions">
              <button className="az-filter-btn secondary">Clear</button>
              <button className="az-filter-btn primary">Show Results</button>
            </div>
          </div>

          <div className="az-filter-section">
            <div className="az-filter-section-title">Precio</div>
            <ul className="az-filter-list">
              {PRECIO.map((p) => (
                <li key={p}>
                  <input type="checkbox" id={`precio-${p}`} />
                  <label htmlFor={`precio-${p}`}>{p}</label>
                </li>
              ))}
            </ul>
            <div className="az-filter-actions">
              <button className="az-filter-btn secondary">Reset Filter</button>
              <button className="az-filter-btn primary">Filter</button>
            </div>
          </div>
        </aside>

        {/* ── RESULTS ── */}
        <section className="az-results">
          <div className="az-tabs">
            {["todos", "recientes", "mejorprecio"].map((t) => (
              <div
                key={t}
                className={`az-tab${activeTab === t ? " active" : ""}`}
                onClick={() => setActiveTab(t)}
              >
                {{ todos: "Todos", recientes: "Más Recientes", mejorprecio: "Mejor Precio" }[t]}
              </div>
            ))}
          </div>

          <div className="az-results-bar">
            <span className="az-results-count">
              Showing <strong>—</strong> products
            </span>
            <select className="az-sort">
              <option>Más reciente</option>
              <option>Precio: menor a mayor</option>
              <option>Precio: mayor a menor</option>
            </select>
          </div>

          <div className="az-grid">
            {CARDS.map((n) => (
              <div className="az-card" key={n}>
                <div className="az-card-img">
                  <span className="az-card-img-placeholder">🏌️</span>
                </div>
                <div className="az-card-body">
                  <div className="az-card-brand"><a href="#">Marca</a></div>
                  <h2 className="az-card-title">Nombre del palo</h2>
                  <div className="az-card-price">US$ —</div>
                </div>
              </div>
            ))}
          </div>

          <div className="az-load-more"><a href="#">Load More</a></div>
        </section>
      </div>

      {/* ── FOOTER ── */}
      <footer className="az-footer">
        <div className="az-footer-inner">

          {/* Col 1 — Solo logo */}
          <div className="az-footer-logo-col">
            <div className="az-footer-logo">
              <img src={LOGO_WHITE} alt="Azalea Golf" />
            </div>
          </div>

          {/* Col 2 — Productos */}
          <div className="az-footer-col">
            <div className="az-footer-col-header" onClick={() => toggle("productos")}>
              <h4>Productos</h4>
              <span className={`az-footer-chevron${openSection === "productos" ? " open" : ""}`}>▾</span>
            </div>
            <div className={`az-footer-col-body${openSection === "productos" ? " open" : ""}`}>
              <ul>
                {PRODUCTS_FOOTER.map((l) => (
                  <li key={l.label}><a href={l.href}>{l.label}</a></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Col 3 — Páginas */}
          <div className="az-footer-col">
            <div className="az-footer-col-header" onClick={() => toggle("paginas")}>
              <h4>Páginas</h4>
              <span className={`az-footer-chevron${openSection === "paginas" ? " open" : ""}`}>▾</span>
            </div>
            <div className={`az-footer-col-body${openSection === "paginas" ? " open" : ""}`}>
              <ul>
                {PAGES_FOOTER.map((l) => (
                  <li key={l.label}><a href={l.href}>{l.label}</a></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Col 4 — Local + Contacto (con wrappers para el grid tablet) */}
          <div className="az-footer-col az-footer-col--split">

            <div className="az-footer-col-section">
              <div className="az-footer-col-header" onClick={() => toggle("local")}>
                <h4>Local y horario</h4>
                <span className={`az-footer-chevron${openSection === "local" ? " open" : ""}`}>▾</span>
              </div>
              <div className={`az-footer-col-body${openSection === "local" ? " open" : ""}`}>
                <p>Arocena 1572, Montevideo<br />(lunes a viernes de 13hs a 20hs)</p>
              </div>
            </div>

            <div className="az-footer-col-section">
              <div className="az-footer-col-header" onClick={() => toggle("contacto")}>
                <h4>Contacto</h4>
                <span className={`az-footer-chevron${openSection === "contacto" ? " open" : ""}`}>▾</span>
              </div>
              <div className={`az-footer-col-body${openSection === "contacto" ? " open" : ""}`}>
                <div className="az-footer-social">
                  <a href="https://www.instagram.com/azaleagolfuy" target="_blank" rel="noreferrer" aria-label="Instagram">
                    <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                  <a href="https://wa.me/59892390042" target="_blank" rel="noreferrer" aria-label="WhatsApp">
                    <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </a>
                </div>
                <p style={{ marginTop: 12 }}>
                  <a href="mailto:contacto@azaleasports.com.uy" style={{ color: "#888" }}>
                    contacto@azaleasports.com.uy
                  </a>
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="az-footer-bottom">
          <p>©2024 Azalea Golf | Todos los derechos reservados</p>
          <div className="az-footer-simbionte-logo">
            <a href="https://www.simbiontecreativo.com" target="_blank" rel="noreferrer">
              <img
                src="https://azaleasports.com.uy/wp-content/uploads/2024/03/simbionte-creativo-logo-monocolor.png"
                alt="Simbionte Creativo"
              />
            </a>
          </div>
          <p>
            Diseño y desarrollo:{" "}
            <a href="https://www.simbiontecreativo.com" target="_blank" rel="noreferrer">
              Simbionte Creativo
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
