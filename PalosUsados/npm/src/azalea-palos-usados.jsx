import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection, query, where, getDocs, getDoc, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, orderBy,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "firebase/auth";
import { db, auth } from "./firebase";
import emailjs from "@emailjs/browser";

const notifyNewListing = (form) => {
  const sid = import.meta.env.VITE_EJS_SERVICE;
  const tid = import.meta.env.VITE_EJS_TEMPLATE;
  const key = import.meta.env.VITE_EJS_KEY;
  if (!sid || !tid || !key) { console.warn("EmailJS: env vars faltantes"); return; }
  emailjs.send(sid, tid, {
    to_email: "francopanfilogolf@gmail.com",
    tipo:     form.categoria && form.categoria !== "palos"
                ? (CATEGORIA_LABELS[form.categoria] ?? form.categoria)
                : (TIPO_LABELS[form.tipo] ?? form.tipo),
    marca:    form.marca,
    modelo:   form.modelo,
    version:  form.version || "Standard",
    anio:     form.anio,
    estado:   form.estado,
    precio:   form.aConsultar ? "A consultar" : `US$ ${form.precio}`,
    nombre:   form.nombre,
    contacto: form.contacto,
    depto:    form.departamento,
  }, key).then(() => console.log("EmailJS: enviado")).catch(err => console.error("EmailJS error:", err));
};

const CLOUDINARY_CLOUD  = "dmwai6eet";
const CLOUDINARY_PRESET = "palosUsadosPreset";

const uploadToCloudinary = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: "POST", body: fd }
  );
  if (!res.ok) throw new Error(`cloudinary: ${res.status}`);
  const data = await res.json();
  return data.secure_url;
};
import CLUBS from "./clubsDB.json";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const WP         = "https://azaleasports.com.uy";
const LOGO_COLOR = `${WP}/wp-content/uploads/2024/03/Azalea-Logo-Color-no-margin-PNG-small.png`;
const LOGO_WHITE = `${WP}/wp-content/uploads/2024/03/Azalea-Logo-White-no-margin-PNG-small.png`;

const NAV = [
  { label: "Home",         href: `${WP}/` },
  { label: "Catálogo",     href: `${WP}/catalogo-articulos-golf/` },
  { label: "Palos Usados", href: "/", active: true },
  { label: "Simulador",    href: `${WP}/simulador-de-golf/` },
  { label: "Acerca de",    href: `${WP}/acerca-azalea-tienda-golf/` },
  { label: "Contacto",     href: `${WP}/contacto/` },
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

const TIPO_LABELS = {
  driver:  "Driver",
  madera:  "Madera",
  hibrido: "Híbrido",
  hierros: "Hierros",
  wedge:   "Wedge",
  putter:  "Putter",
};
const TIPOS        = Object.keys(TIPO_LABELS);
const CATEGORIA_LABELS = { palos: "Palos", carros: "Carros", bolsas: "Bolsas", otros: "Otros" };
const CATEGORIA_OPTS   = ["palos", "carros", "bolsas", "otros"];
const ESTADO_OPTS  = ["Como nuevo", "Muy bueno", "Bueno", "Regular", "Para reparar"];
const FLEX_OPTS    = ["Ladies", "Senior", "Regular", "Stiff", "X-Stiff"];
const IRON_OPTS    = ["2", "3", "4", "5", "6", "7", "8", "9", "PW", "GW", "SW", "LW"];
const MATERIAL_OPTS = ["Grafito", "Acero"];
const LARGO_OPTS = ["Standard", "+½\"", "+1\"", "+1½\"", "+2\"", "-½\"", "-1\"", "-1½\"", "-2\""];
const PUTTER_LARGO_OPTS = ['33"', '34"', '35"', '36" (putter largo)'];
const MANO_OPTS    = ["Diestro", "Zurdo"];
const PUTTER_ESTILO_OPTS = ["Blade", "Mallet", "Mid-Mallet", "Putter largo"];
const BOUNCE_OPTS  = ["4", "6", "7", "8", "9", "10", "11", "12", "13", "14"];
const GRIND_OPTS = [
  "S (Standard)", "W (Wide/Full)", "M (Medio)", "K (Low/Narrow)",
  "T (Toe)", "F (Full)", "D (Dynamic)", "Otro",
];
const MADERA_NUM_OPTS  = ["3", "4", "5", "7", "9", "11", "13"];
const HIBRIDO_NUM_OPTS = ["1", "2", "3", "4", "5", "6", "7"];
const LOFT_OPTS = {
  driver:  ["8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"],
  madera:  ["13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25"],
  hibrido: ["16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30"],
  wedge:   ["46", "48", "50", "52", "54", "56", "58", "60", "62", "64"],
};
const PRICE_RANGES = [
  { label: "Hasta US$100",   min: 0,   max: 100 },
  { label: "US$100 – 300",   min: 100, max: 300 },
  { label: "US$300 – 600",   min: 300, max: 600 },
  { label: "Más de US$600",  min: 600, max: Infinity },
  { label: "A consultar",    consultar: true },
];
const MONEDA_OPTS = ["USD", "UYU"];
const ITEMS_PER_PAGE = 20;

const DEPARTAMENTOS = [
  "Montevideo","Canelones","Maldonado","Colonia","San José",
  "Soriano","Río Negro","Paysandú","Salto","Artigas",
  "Rivera","Tacuarembó","Cerro Largo","Treinta y Tres",
  "Rocha","Lavalleja","Florida","Flores","Durazno",
];

/* ─────────────────────────────────────────────────────────────
   JSON HELPERS
───────────────────────────────────────────────────────────── */
const getMarcas  = (tipo) =>
  [...new Set(CLUBS.filter(c => c.tipo === tipo).map(c => c.marca))].sort();

const getModelos = (tipo, marca) =>
  [...new Set(CLUBS.filter(c => c.tipo === tipo && c.marca === marca).map(c => c.modelo))];

const getVersiones = (tipo, marca, modelo) =>
  CLUBS.filter(c => c.tipo === tipo && c.marca === marca && c.modelo === modelo);

const getAnios = (tipo, marca, modelo, version) =>
  [...new Set(CLUBS
    .filter(c => c.tipo === tipo && c.marca === marca && c.modelo === modelo && c.version === version)
    .map(c => c.anio)
  )].sort((a, b) => a - b);

// Cascada automática: desde un nivel dado, autoselecciona si hay una sola opción
const cascadeFill = (tipo, marca, modelo, version) => {
  const out = { tipo };
  const mList = getMarcas(tipo);
  out.marca = marca || (mList.length === 1 ? mList[0] : "");
  if (!out.marca) return out;
  const mods = getModelos(tipo, out.marca);
  out.modelo = modelo || (mods.length === 1 ? mods[0] : "");
  if (!out.modelo) return out;
  const vers = getVersiones(tipo, out.marca, out.modelo);
  out.version = version || (vers.length === 1 ? vers[0].version : "");
  if (!out.version) return out;
  const years = getAnios(tipo, out.marca, out.modelo, out.version);
  out.anio = years.length === 1 ? String(years[0]) : "";
  return out;
};

/* ─────────────────────────────────────────────────────────────
   DISPLAY HELPERS
───────────────────────────────────────────────────────────── */
const formatPrecio = (l) => {
  if (l.aConsultar) return "A consultar";
  const prefix = l.moneda === "UYU" ? "$" : "US$";
  return `${prefix} ${Number(l.precio).toLocaleString("es-UY")}`;
};

const formatComposicion = (arr) => {
  if (!arr || arr.length === 0) return "";
  const ordered = IRON_OPTS.filter(i => arr.includes(i));
  if (ordered.length < 2) return ordered.join(", ");
  return `${ordered[0]}–${ordered[ordered.length - 1]}`;
};

const labelVersion = (version) =>
  !version || version === "Standard" ? "" : ` (${version})`;

const tipoTag = (tipo) => TIPO_LABELS[tipo] ?? tipo;

/* ─────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────── */
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
  font-size: 14px; color: var(--rz-text-color);
  background: #fff; -webkit-font-smoothing: antialiased;
}
a { text-decoration: none; color: inherit; }

/* ─── HEADER ─────────────────────────────────────────────── */
.az-header {
  position: sticky; top: 0; z-index: 200;
  background: #fff; border-bottom: 1px solid var(--rz-border-color-light);
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
}
.az-header-inner {
  max-width: 1200px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 15px; height: 90px; position: relative;
}
.az-logo { display: flex; align-items: center; flex-shrink: 0; }
.az-logo img { height: 60px; display: block; }
.az-nav-wrapper {
  position: absolute; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; height: 100%;
}
.az-nav { display: flex; align-items: center; height: 100%; list-style: none; }
.az-nav > li { display: flex; align-items: center; padding: 8px 14px; }
.az-nav > li > a {
  display: block; font-size: 16px; font-weight: 500;
  color: var(--rz-color-dark); padding: 3px; transition: color .3s; white-space: nowrap;
}
.az-nav > li > a:hover,
.az-nav > li.active > a { color: var(--rz-color-primary); }
.az-search-btn {
  background: none; border: none; cursor: pointer; padding: 8px;
  color: var(--rz-color-dark); display: flex; align-items: center;
  justify-content: center; transition: color .3s; flex-shrink: 0;
}
.az-search-btn:hover { color: var(--rz-color-primary); }
.az-search-btn svg { width: 20px; height: 20px; }
.az-burger {
  display: none; flex-direction: column; justify-content: center; gap: 5px;
  cursor: pointer; background: none; border: none; padding: 8px; flex-shrink: 0;
}
.az-burger span { display: block; width: 22px; height: 2px; background: var(--rz-color-dark); border-radius: 2px; }

/* ─── VIEW TOGGLE ─────────────────────────────────────────── */
.az-view-bar {
  background: #fff; border-bottom: 1px solid var(--rz-border-color-light);
  padding: 20px 20px 0;
}
.az-view-bar-inner {
  max-width: 1200px; margin: 0 auto;
  display: flex; align-items: flex-end; gap: 0;
}
.az-view-tab {
  padding: 12px 28px; font-family: var(--rz-font-family);
  font-size: 14px; font-weight: 500; color: var(--rz-text-color-gray);
  background: none; border: none; cursor: pointer;
  border-bottom: 3px solid transparent; margin-bottom: -1px;
  transition: color .2s, border-color .2s;
}
.az-view-tab:hover { color: var(--rz-color-dark); }
.az-view-tab.active { color: var(--rz-color-dark); font-weight: 700; border-bottom-color: var(--rz-color-dark); }

/* ─── PAGE TITLE BAR ─────────────────────────────────────── */
.az-page-title { background: var(--rz-background-color-gray); border-bottom: 1px solid var(--rz-border-color-light); padding: 18px 15px; }
.az-page-title-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.az-page-title h1 { font-size: 22px; font-weight: 700; color: var(--rz-color-dark); letter-spacing: -.3px; }
.az-breadcrumb { font-size: 12px; color: var(--rz-text-color-gray); }
.az-breadcrumb a { color: var(--rz-text-color-gray); }
.az-breadcrumb a:hover { color: var(--rz-color-primary); }
.az-breadcrumb span { margin: 0 6px; }

/* ─── LAYOUT ─────────────────────────────────────────────── */
.az-layout { max-width: 1200px; margin: 0 auto; display: flex; gap: 30px; padding: 28px 15px 60px; align-items: flex-start; }

/* ─── SIDEBAR ────────────────────────────────────────────── */
.az-sidebar { width: 240px; flex-shrink: 0; }
.az-filter-section { margin-bottom: 24px; }
.az-filter-section-title {
  font-size: 13px; font-weight: 700; color: var(--rz-color-dark);
  letter-spacing: .5px; text-transform: uppercase;
  padding-bottom: 10px; border-bottom: 2px solid var(--rz-color-dark); margin-bottom: 12px;
}
.az-filter-list { list-style: none; }
.az-filter-list li {
  font-size: 13px; color: var(--rz-text-color-gray); padding: 5px 0;
  cursor: pointer; display: flex; align-items: center; gap: 8px; transition: color .15s;
}
.az-filter-list li:hover { color: var(--rz-color-dark); }
.az-filter-list li input[type=checkbox] { width: 14px; height: 14px; cursor: pointer; accent-color: var(--rz-color-primary); flex-shrink: 0; }
.az-filter-actions { display: flex; gap: 8px; margin-top: 12px; }
.az-filter-btn {
  flex: 1; padding: 8px 0; font-family: var(--rz-font-family);
  font-size: 12px; font-weight: 700; letter-spacing: .4px;
  text-transform: uppercase; cursor: pointer; border-radius: 3px; transition: all .2s;
}
.az-filter-btn.primary { background: var(--rz-color-dark); color: #fff; border: 1px solid var(--rz-color-dark); }
.az-filter-btn.primary:hover { background: #000; }
.az-filter-btn.secondary { background: transparent; color: var(--rz-text-color-gray); border: 1px solid var(--rz-border-color); }
.az-filter-btn.secondary:hover { border-color: #999; color: var(--rz-color-dark); }

/* ─── RESULTS ────────────────────────────────────────────── */
.az-results { flex: 1; min-width: 0; }
.az-tabs { display: flex; align-items: center; border-bottom: 2px solid var(--rz-border-color-light); margin-bottom: 20px; }
.az-tab {
  font-size: 13px; font-weight: 500; color: var(--rz-text-color-gray);
  padding: 10px 18px; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color .2s, border-color .2s;
}
.az-tab:hover { color: var(--rz-color-dark); }
.az-tab.active { color: var(--rz-color-dark); font-weight: 700; border-bottom-color: var(--rz-color-dark); }
.az-results-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.az-results-count { font-size: 13px; color: #888; }
.az-results-count strong { color: var(--rz-color-dark); }
.az-sort { font-family: var(--rz-font-family); font-size: 13px; padding: 7px 10px; border: 1px solid var(--rz-border-color-light); border-radius: 3px; color: var(--rz-text-color-gray); background: #fff; cursor: pointer; outline: none; }

/* ─── PRODUCT GRID ───────────────────────────────────────── */
.az-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 20px; margin-bottom: 28px; }
.az-card {
  border: 1px solid var(--rz-border-color-light); border-radius: 4px;
  overflow: hidden; background: #fff; transition: box-shadow .2s, transform .2s;
  cursor: pointer; position: relative;
}
.az-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-2px); }
.az-card-img { background: var(--rz-background-color-gray); aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.az-card-img img { width: 100%; height: 100%; object-fit: cover; }
.az-card-img-placeholder { font-size: 40px; opacity: .15; }
.az-card-body { padding: 12px; }
.az-card-tipo-tag {
  display: inline-block; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .5px; padding: 2px 8px;
  border-radius: 2px; background: #f0f0f0; color: #767676; margin-bottom: 6px;
}
.az-card-brand { font-size: 11px; color: #999; font-weight: 500; text-transform: uppercase; letter-spacing: .5px; }
.az-card-title { font-size: 13px; font-weight: 600; color: var(--rz-color-dark); line-height: 1.4; margin: 3px 0 6px; }
.az-card-meta { font-size: 11px; color: #aaa; margin-bottom: 8px; }
.az-card-price { font-size: 15px; font-weight: 700; color: var(--rz-color-dark); }
.az-card-price.consultar { font-size: 13px; font-weight: 400; color: #888; font-style: italic; }
.az-card-estado {
  display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 7px;
  border-radius: 999px; margin-top: 6px;
}
.az-card-estado.como-nuevo    { background: #e8f5e9; color: #2e7d32; }
.az-card-estado.muy-bueno     { background: #e3f2fd; color: #1565c0; }
.az-card-estado.bueno         { background: #fff8e1; color: #f57f17; }
.az-card-estado.regular       { background: #fce4ec; color: #c62828; }
.az-card-estado.para-reparar  { background: #424242; color: #fff; }
.az-card-local-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
  padding: 3px 8px; border-radius: 2px; margin-top: 6px;
  background: #111; color: #fff;
}
.az-card-local-badge::before { content: "📍"; font-size: 9px; }

.az-commission-notice {
  background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px;
  padding: 14px 16px; margin-top: 10px; font-size: 13px; color: #92400e; line-height: 1.6;
}
.az-commission-notice strong { color: #78350f; }

.az-admin-btn.local-on  { background: #111; color: #fff; font-size: 10px; }
.az-admin-btn.local-on:hover { background: #444; }
.az-admin-btn.local-off { background: #f5f5f5; color: #888; border: 1px solid #ddd; font-size: 10px; }
.az-admin-btn.local-off:hover { background: #e8e8e8; color: #333; }
.az-admin-btn.sold { background: #1a237e; color: #fff; }
.az-admin-btn.sold:hover { background: #283593; }

/* Sold badge on card banner */
.az-admin-card-sold-badge {
  position: absolute; top: 10px; left: 10px;
  background: #1a237e; color: #fff;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  padding: 3px 10px; border-radius: 2px;
}

/* Local register */
.az-local-wrap { padding: 0; }
.az-local-client {
  border: 1px solid var(--rz-border-color-light); border-radius: 6px;
  overflow: hidden; margin-bottom: 20px; background: #fff;
}
.az-local-client-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; background: #fafafa;
  border-bottom: 1px solid var(--rz-border-color-light);
}
.az-local-client-name { font-size: 15px; font-weight: 700; color: var(--rz-color-dark); }
.az-local-client-meta { font-size: 12px; color: #888; margin-top: 2px; }
.az-local-client-total { font-size: 14px; font-weight: 700; color: var(--rz-color-dark); white-space: nowrap; }
.az-local-bancarios { padding: 14px 20px; border-bottom: 1px solid var(--rz-border-color-light); }
.az-local-bancarios label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #aaa; margin-bottom: 6px; }
.az-local-bancarios textarea {
  width: 100%; padding: 10px 12px; border: 1px solid var(--rz-border-color-light); border-radius: 4px;
  font-family: var(--rz-font-family); font-size: 13px; color: var(--rz-color-dark);
  resize: vertical; min-height: 70px; line-height: 1.5; transition: border-color .2s;
}
.az-local-bancarios textarea:focus { outline: none; border-color: var(--rz-color-primary); box-shadow: 0 0 0 3px rgba(255,123,172,.12); }
.az-local-saved { font-size: 11px; color: #aaa; margin-top: 4px; }
.az-local-palos { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0; }
.az-local-palo {
  display: flex; gap: 10px; align-items: center; padding: 12px 20px;
  border-bottom: 1px solid #f5f5f5;
}
.az-local-palo:last-child { border-bottom: none; }
.az-local-palo img { width: 48px; height: 48px; object-fit: cover; border-radius: 3px; background: #f5f5f5; flex-shrink: 0; }
.az-local-palo-ph { width: 48px; height: 48px; border-radius: 3px; background: #f5f5f5; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; opacity: .3; }
.az-local-palo-info strong { font-size: 13px; font-weight: 600; color: var(--rz-color-dark); display: block; }
.az-local-palo-info span { font-size: 11px; color: #888; }

/* ─── LOADING / EMPTY ────────────────────────────────────── */
.az-loading-wrap { display: flex; align-items: center; justify-content: center; padding: 80px 20px; }
.az-spinner {
  width: 32px; height: 32px; border: 3px solid var(--rz-border-color-light);
  border-top-color: var(--rz-color-primary); border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.az-empty { text-align: center; padding: 60px 20px; color: #aaa; }
.az-empty svg { width: 48px; height: 48px; opacity: .3; margin-bottom: 12px; }
.az-empty p { font-size: 15px; }

/* ─── CARD DETAIL MODAL ───────────────────────────────────── */
.az-overlay {
  position: fixed; inset: 0; z-index: 900;
  background: rgba(0,0,0,.6); display: flex; align-items: center;
  justify-content: center; padding: 20px;
}
.az-modal-card {
  background: #fff; border-radius: 6px; max-width: 680px; width: 100%;
  max-height: 90vh; overflow-y: auto; position: relative;
}
.az-modal-gallery { position: relative; aspect-ratio: 4/3; background: #f5f5f5; overflow: hidden; }
.az-modal-gallery img { width: 100%; height: 100%; object-fit: cover; }
.az-modal-gallery-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 64px; opacity: .1; }
.az-modal-gallery-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(0,0,0,.4); color: #fff; border: none; cursor: pointer;
  width: 36px; height: 36px; border-radius: 50%; font-size: 18px;
  display: flex; align-items: center; justify-content: center; transition: background .2s;
}
.az-modal-gallery-nav:hover { background: rgba(0,0,0,.7); }
.az-modal-gallery-nav.prev { left: 10px; }
.az-modal-gallery-nav.next { right: 10px; }
.az-modal-gallery-count { position: absolute; bottom: 10px; right: 12px; font-size: 11px; color: #fff; background: rgba(0,0,0,.45); padding: 2px 8px; border-radius: 99px; }
.az-modal-close {
  position: absolute; top: 10px; right: 10px; z-index: 10;
  background: rgba(0,0,0,.5); color: #fff; border: none; border-radius: 50%;
  width: 30px; height: 30px; cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.az-modal-body { padding: 24px 28px; }
.az-modal-tipo { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #999; margin-bottom: 4px; }
.az-modal-title { font-size: 20px; font-weight: 700; color: var(--rz-color-dark); margin-bottom: 4px; }
.az-modal-price { font-size: 22px; font-weight: 700; color: var(--rz-color-dark); margin: 12px 0; }
.az-modal-price.consultar { font-size: 16px; color: #888; font-style: italic; }
.az-modal-specs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin: 16px 0; }
.az-modal-spec { font-size: 13px; color: var(--rz-text-color-gray); }
.az-modal-spec strong { color: var(--rz-color-dark); }
.az-modal-desc { font-size: 13px; color: var(--rz-text-color-gray); line-height: 1.7; margin: 12px 0; border-top: 1px solid var(--rz-border-color-light); padding-top: 12px; }
.az-modal-contact { margin-top: 16px; padding: 16px; background: var(--rz-background-color-gray); border-radius: 4px; }
.az-modal-contact h4 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }
.az-modal-contact-name { font-size: 14px; font-weight: 600; color: var(--rz-color-dark); }
.az-modal-contact-link {
  display: inline-flex; align-items: center; gap: 8px; margin-top: 8px;
  padding: 10px 20px; background: var(--rz-color-dark); color: #fff;
  border-radius: 3px; font-size: 13px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .4px; transition: background .2s; cursor: pointer; border: none;
  font-family: var(--rz-font-family);
}
.az-modal-contact-link:hover { background: var(--rz-color-primary); }
.az-modal-contact-link svg { width: 16px; height: 16px; fill: currentColor; }

/* ─── PUBLICAR FORM ───────────────────────────────────────── */
.az-publicar-wrap { max-width: 720px; margin: 0 auto; padding: 40px 20px 80px; }
.az-publicar-title { font-size: 22px; font-weight: 700; color: var(--rz-color-dark); margin-bottom: 32px; }

.az-steps-bar { display: flex; align-items: center; margin-bottom: 40px; }
.az-step-item { display: flex; align-items: center; }
.az-step-circle {
  width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--rz-border-color-light);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #bbb; flex-shrink: 0; transition: all .25s;
}
.az-step-circle.active { border-color: var(--rz-color-dark); color: var(--rz-color-dark); }
.az-step-circle.done { border-color: var(--rz-color-primary); background: var(--rz-color-primary); color: #fff; }
.az-step-label { font-size: 12px; color: #bbb; margin-left: 8px; font-weight: 500; transition: color .25s; white-space: nowrap; }
.az-step-label.active { color: var(--rz-color-dark); }
.az-step-label.done { color: var(--rz-color-primary); }
.az-step-line { flex: 1; height: 1px; background: var(--rz-border-color-light); margin: 0 12px; min-width: 20px; }

.az-form-section { margin-bottom: 28px; }
.az-form-section-title {
  font-size: 11px; font-weight: 700; color: var(--rz-text-color-gray);
  text-transform: uppercase; letter-spacing: .8px; margin-bottom: 20px;
  padding-bottom: 10px; border-bottom: 1px solid var(--rz-border-color-light);
}
.az-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.az-form-row.thirds { grid-template-columns: 1fr 1fr 1fr; }
.az-field { margin-bottom: 20px; }
.az-field:last-child { margin-bottom: 0; }
.az-label {
  display: block; font-size: 13px; font-weight: 600;
  color: var(--rz-color-dark); margin-bottom: 7px;
}
.az-label .opt { font-weight: 400; color: #aaa; font-size: 12px; margin-left: 4px; }
.az-input, .az-select, .az-textarea {
  width: 100%; padding: 11px 14px; border: 1px solid var(--rz-border-color-light);
  border-radius: 4px; font-family: var(--rz-font-family); font-size: 14px;
  color: var(--rz-color-dark); background: #fff; transition: border-color .2s;
  appearance: none;
}
.az-input:focus, .az-select:focus, .az-textarea:focus {
  outline: none; border-color: var(--rz-color-primary);
  box-shadow: 0 0 0 3px rgba(255,123,172,.12);
}
.az-input:disabled, .az-select:disabled { background: #f9f9f9; color: #bbb; cursor: not-allowed; }
.az-auto-val {
  padding: 11px 14px; border: 1px solid var(--rz-border-color-light);
  border-radius: 4px; background: #f9f9f9; color: var(--rz-text-color-gray);
  font-size: 14px; font-weight: 500;
}
.az-select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23aaa' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 38px; }
.az-textarea { resize: vertical; min-height: 90px; line-height: 1.6; }
.az-error-msg { font-size: 12px; color: #e63946; margin-top: 5px; }

.az-checkbox-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; }

/* Iron set chips */
.az-iron-set { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.az-iron-chip {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 44px; height: 40px; padding: 0 10px;
  border: 1.5px solid var(--rz-border-color-light); border-radius: 4px;
  font-family: var(--rz-font-family); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all .15s; user-select: none;
  color: var(--rz-text-color-gray); background: #fff;
}
.az-iron-chip input[type=checkbox] { display: none; }
.az-iron-chip:hover { border-color: #aaa; color: var(--rz-color-dark); }
.az-iron-chip.sel {
  border-color: var(--rz-color-dark); background: var(--rz-color-dark); color: #fff;
}
.az-iron-summary { font-size: 13px; color: var(--rz-text-color-gray); margin-top: 8px; }
.az-iron-summary strong { color: var(--rz-color-dark); }
.az-checkbox-row input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--rz-color-primary); cursor: pointer; flex-shrink: 0; }
.az-checkbox-row label { font-size: 14px; color: var(--rz-color-dark); cursor: pointer; }

.az-price-wrap { display: flex; gap: 12px; align-items: flex-start; }
.az-price-input-wrap { flex: 1; position: relative; }
.az-price-prefix {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  font-size: 14px; color: #aaa; font-weight: 500; pointer-events: none;
}
.az-input.has-prefix { padding-left: 42px; }

/* ─── PHOTO UPLOAD ────────────────────────────────────────── */
.az-drop-zone {
  border: 2px dashed var(--rz-border-color-light); border-radius: 6px;
  padding: 32px 20px; text-align: center; cursor: pointer;
  transition: all .2s; background: #fafafa;
}
.az-drop-zone:hover, .az-drop-zone.drag-over {
  border-color: var(--rz-color-primary); background: rgba(255,123,172,.04);
}
.az-drop-zone svg { width: 36px; height: 36px; stroke: #ccc; margin-bottom: 8px; }
.az-drop-zone p { font-size: 13px; color: #aaa; }
.az-drop-zone p strong { color: var(--rz-color-primary); }
.az-photos-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 14px; }
.az-photo-thumb { position: relative; aspect-ratio: 1; border-radius: 4px; overflow: hidden; border: 1px solid var(--rz-border-color-light); }
.az-photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
.az-photo-remove {
  position: absolute; top: 4px; right: 4px; width: 20px; height: 20px;
  background: rgba(0,0,0,.6); color: #fff; border: none; border-radius: 50%;
  cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center;
}
.az-photo-main-badge {
  position: absolute; bottom: 4px; left: 4px; font-size: 9px; font-weight: 700;
  background: rgba(0,0,0,.55); color: #fff; padding: 1px 5px; border-radius: 2px; text-transform: uppercase;
}

/* ─── DATOS EXTRA TOGGLE ──────────────────────────────────── */
.az-extra-toggle {
  background: none; border: 1px solid var(--rz-border-color-light); border-radius: 4px;
  cursor: pointer; padding: 9px 16px; margin-top: 20px;
  font-family: var(--rz-font-family); font-size: 13px; font-weight: 600;
  color: var(--rz-text-color-gray); display: flex; align-items: center; gap: 8px;
  transition: all .2s; width: 100%;
}
.az-extra-toggle:hover { border-color: var(--rz-color-dark); color: var(--rz-color-dark); }

/* ─── FORM NAVIGATION ─────────────────────────────────────── */
.az-form-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--rz-border-color-light); }
.az-btn-primary {
  padding: 13px 36px; background: var(--rz-color-dark); color: #fff; border: none;
  border-radius: 3px; font-family: var(--rz-font-family); font-size: 13px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .5px; cursor: pointer; transition: background .2s;
}
.az-btn-primary:hover { background: var(--rz-color-primary); }
.az-btn-primary:disabled { background: #ccc; cursor: not-allowed; }
.az-btn-secondary {
  padding: 12px 24px; background: transparent; color: var(--rz-text-color-gray); border: 1px solid var(--rz-border-color);
  border-radius: 3px; font-family: var(--rz-font-family); font-size: 13px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .5px; cursor: pointer; transition: all .2s;
}
.az-btn-secondary:hover { border-color: #999; color: var(--rz-color-dark); }
.az-form-errors { background: #fff5f5; border: 1px solid #fdd; border-radius: 4px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #e63946; }

/* ─── CATEGORY SELECTOR ───────────────────────────────────── */
.az-cat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 12px; }
@media (min-width: 540px) { .az-cat-grid { grid-template-columns: repeat(4, 1fr); } }
.az-cat-card {
  border: 2px solid var(--rz-border-color-light); border-radius: 6px;
  padding: 32px 16px; text-align: center; cursor: pointer;
  transition: all .18s; background: #fff;
}
.az-cat-card:hover { border-color: var(--rz-color-primary); background: rgba(255,123,172,.03); }
.az-cat-name { font-size: 15px; font-weight: 600; color: var(--rz-color-dark); }

/* ─── SUCCESS SCREEN ──────────────────────────────────────── */
.az-success-wrap { text-align: center; padding: 80px 20px; max-width: 480px; margin: 0 auto; }
.az-success-icon { width: 64px; height: 64px; border-radius: 50%; background: var(--rz-color-primary); color: #fff; font-size: 28px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
.az-success-wrap h2 { font-size: 24px; font-weight: 700; color: var(--rz-color-dark); margin-bottom: 12px; }
.az-success-wrap p { font-size: 15px; color: var(--rz-text-color-gray); line-height: 1.7; margin-bottom: 28px; }
.az-success-wa { display: inline-flex; align-items: center; gap: 8px; background: #25D366; color: #fff; padding: 10px 20px; border-radius: 4px; font-size: 14px; font-weight: 600; text-decoration: none; }
.az-success-wa:hover { background: #128C7E; color: #fff; }

/* ─── ADMIN ───────────────────────────────────────────────── */
.az-admin-page { max-width: 1200px; margin: 0 auto; padding: 40px 20px 80px; }
.az-admin-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
.az-admin-topbar h2 { font-size: 20px; font-weight: 700; color: var(--rz-color-dark); }
.az-admin-login-wrap { max-width: 400px; margin: 80px auto; padding: 40px; background: #fff; border: 1px solid var(--rz-border-color-light); border-radius: 6px; }
.az-admin-login-wrap h2 { font-size: 20px; font-weight: 700; margin-bottom: 24px; color: var(--rz-color-dark); }
.az-admin-tabs { display: flex; border-bottom: 2px solid var(--rz-border-color-light); margin-bottom: 24px; gap: 0; }
.az-admin-tab {
  padding: 10px 22px; font-family: var(--rz-font-family); font-size: 14px; font-weight: 500;
  border: none; background: transparent; cursor: pointer; color: var(--rz-text-color-gray);
  border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all .2s;
}
.az-admin-tab.active { color: var(--rz-color-dark); font-weight: 700; border-bottom-color: var(--rz-color-dark); }
.az-admin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
.az-admin-card { border: 1px solid var(--rz-border-color-light); border-radius: 6px; overflow: hidden; background: #fff; display: flex; flex-direction: column; }
.az-admin-card-banner {
  position: relative; aspect-ratio: 4/3; background: #f5f5f5;
  overflow: hidden; cursor: pointer;
}
.az-admin-card-banner img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
.az-admin-card-banner:hover img { transform: scale(1.04); }
.az-admin-card-banner-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 48px; opacity: .12; }
.az-admin-card-photo-count {
  position: absolute; bottom: 8px; right: 8px;
  background: rgba(0,0,0,.55); color: #fff;
  font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 99px;
}
.az-admin-card-strip {
  display: flex; gap: 4px; padding: 6px; background: #fafafa;
  border-bottom: 1px solid var(--rz-border-color-light); overflow-x: auto;
}
.az-admin-card-strip-thumb {
  width: 44px; height: 44px; object-fit: cover; border-radius: 3px;
  flex-shrink: 0; cursor: pointer; opacity: .75; transition: opacity .15s;
}
.az-admin-card-strip-thumb:hover,
.az-admin-card-strip-thumb.active { opacity: 1; outline: 2px solid var(--rz-color-dark); }
.az-admin-card-info { padding: 14px 16px 10px; flex: 1; }
.az-admin-card-info strong { font-size: 14px; font-weight: 700; color: var(--rz-color-dark); display: block; line-height: 1.4; margin-bottom: 3px; }
.az-admin-card-info span { font-size: 12px; color: #888; }
.az-admin-card-price { font-size: 16px; font-weight: 700; color: var(--rz-color-dark); margin-top: 6px; }
.az-admin-card-body { padding: 4px 16px 12px; font-size: 12px; color: #888; line-height: 2; border-top: 1px solid #f5f5f5; }

/* Edit modal photo management */
.az-edit-photos { margin-bottom: 20px; }
.az-edit-photos-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
.az-edit-photo-thumb { position: relative; aspect-ratio: 1; border-radius: 4px; overflow: hidden; border: 1px solid var(--rz-border-color-light); }
.az-edit-photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
.az-edit-photo-rm {
  position: absolute; top: 3px; right: 3px; width: 20px; height: 20px;
  background: rgba(0,0,0,.65); color: #fff; border: none; border-radius: 50%;
  cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center;
}
.az-edit-add-photo {
  border: 2px dashed var(--rz-border-color-light); border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 22px; color: #ccc;
  aspect-ratio: 1; transition: border-color .15s;
}
.az-edit-add-photo:hover { border-color: var(--rz-color-primary); color: var(--rz-color-primary); }
.az-edit-photo-set-main {
  position: absolute; bottom: 4px; left: 4px;
  background: rgba(0,0,0,.65); color: #ffd700; border: none; border-radius: 3px;
  cursor: pointer; font-size: 11px; font-weight: 700; padding: 2px 6px;
  opacity: 0; transition: opacity .15s; white-space: nowrap;
}
.az-edit-photo-thumb:hover .az-edit-photo-set-main { opacity: 1; }
.az-edit-photo-thumb:hover .az-edit-photo-set-main:hover { background: rgba(0,0,0,.85); }
.az-admin-card-body strong { color: var(--rz-color-dark); }
.az-admin-actions { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--rz-border-color-light); }
.az-admin-btn {
  flex: 1; padding: 8px 4px; font-family: var(--rz-font-family); font-size: 11px;
  font-weight: 700; text-transform: uppercase; letter-spacing: .3px;
  border-radius: 3px; cursor: pointer; border: none; transition: all .15s;
}
.az-admin-btn.approve { background: var(--rz-color-dark); color: #fff; }
.az-admin-btn.approve:hover { background: var(--rz-color-primary); }
.az-admin-btn.edit { background: #f5f5f5; color: var(--rz-color-dark); }
.az-admin-btn.edit:hover { background: #e2e2e2; }
.az-admin-btn.hide { background: #fff; color: #888; border: 1px solid #ddd; }
.az-admin-btn.hide:hover { background: #f5f5f5; color: #555; }
.az-admin-btn.unhide { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
.az-admin-btn.unhide:hover { background: #c8e6c9; }
.az-admin-btn.del { background: #fff; color: #e63946; border: 1px solid #e63946; }
.az-admin-btn.del:hover { background: #e63946; color: #fff; }

/* ─── ADMIN EDIT MODAL ────────────────────────────────────── */
.az-edit-overlay { position: fixed; inset: 0; z-index: 950; background: rgba(0,0,0,.6); display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; overflow-y: auto; }
.az-edit-modal { background: #fff; border-radius: 6px; width: 100%; max-width: 660px; padding: 32px; position: relative; }
.az-edit-modal h3 { font-size: 18px; font-weight: 700; margin-bottom: 24px; color: var(--rz-color-dark); }
.az-edit-close { position: absolute; top: 16px; right: 16px; background: #f0f0f0; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }

/* ─── FOOTER ──────────────────────────────────────────────── */
.az-footer { background: #1F1F1F; color: #aaa; padding: 48px 15px 0; }
.az-footer-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.4fr 1fr 1.2fr 1fr; gap: 40px; padding-bottom: 40px; }
.az-footer-logo { margin-bottom: 0; }
.az-footer-logo img { width: 180px; }
.az-footer-col-header { display: flex; align-items: center; justify-content: space-between; }
.az-footer-col h4 { font-size: 13px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: #fff; line-height: 1; margin-bottom: 16px; padding-bottom: 13px; border-bottom: 1px solid #333; }
.az-footer-chevron { display: none; }
.az-footer-col-body { display: block; }
.az-footer-col ul { list-style: none; }
.az-footer-col ul li { line-height: 1.8; }
.az-footer-col ul li a { font-size: 13px; color: #888; transition: color .2s; }
.az-footer-col ul li a:hover { color: #fff; }
.az-footer-col p { font-size: 13px; color: #888; line-height: 1.8; }
.az-footer-social { display: flex; gap: 16px; margin-top: 16px; }
.az-footer-social a { display: flex; align-items: center; justify-content: center; color: #888; transition: color .2s; }
.az-footer-social a:hover { color: #fff; }
.az-footer-social svg { width: 22px; height: 22px; fill: currentColor; }
.az-footer-bottom { max-width: 1200px; margin: 0 auto; border-top: 1px solid #2e2e2e; padding: 22px 0; display: flex; align-items: center; justify-content: space-between; }
.az-footer-bottom p { font-size: 12px; color: #666; }
.az-footer-bottom a { color: #666; }
.az-footer-bottom a:hover { color: #aaa; }
.az-footer-simbionte-logo img { height: 36px; opacity: .6; filter: brightness(0) invert(1); }

/* ─── LISTING DETAIL ─────────────────────────────────────── */
.az-detail-wrap { max-width: 1200px; margin: 0 auto; padding: 28px 15px 80px; }
.az-detail-back {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  background: none; border: none; padding: 0; margin-bottom: 32px;
  font-family: var(--rz-font-family); font-size: 13px; font-weight: 600;
  color: var(--rz-text-color-gray); letter-spacing: .3px; transition: color .2s;
}
.az-detail-back:hover { color: var(--rz-color-dark); }
.az-detail-layout { display: grid; grid-template-columns: 1.1fr 1fr; gap: 52px; align-items: start; }
.az-detail-gallery { position: sticky; top: 106px; }
.az-detail-main-img {
  aspect-ratio: 4/3; background: var(--rz-background-color-gray);
  border-radius: 6px; overflow: hidden; margin-bottom: 10px;
}
.az-detail-main-img img { width: 100%; height: 100%; object-fit: contain; }
.az-detail-main-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 72px; opacity: .08; }
.az-detail-thumbs { display: flex; gap: 8px; flex-wrap: wrap; }
.az-detail-thumb {
  width: 76px; height: 76px; object-fit: contain; border-radius: 4px; cursor: pointer;
  border: 2px solid transparent; opacity: .65; transition: all .15s;
  background: var(--rz-background-color-gray);
}
.az-detail-thumb:hover { opacity: 1; }
.az-detail-thumb.active { opacity: 1; border-color: var(--rz-color-dark); }
.az-detail-tipo { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #999; margin-bottom: 6px; }
.az-detail-title { font-size: 26px; font-weight: 700; color: var(--rz-color-dark); line-height: 1.3; margin-bottom: 16px; }
.az-detail-price { font-size: 30px; font-weight: 700; color: var(--rz-color-dark); margin-bottom: 16px; }
.az-detail-price.consultar { font-size: 18px; color: #888; font-style: italic; }
.az-detail-local {
  display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px; padding: 4px 12px;
  border-radius: 3px; background: #111; color: #fff; margin-bottom: 20px;
}
.az-detail-specs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  background: var(--rz-background-color-gray); border-radius: 6px;
  overflow: hidden; margin-bottom: 20px;
}
.az-detail-spec {
  padding: 10px 14px; border-bottom: 1px solid #ebebeb; border-right: 1px solid #ebebeb;
  font-size: 13px;
}
.az-detail-spec:nth-child(even) { border-right: none; }
.az-detail-spec strong { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #aaa; margin-bottom: 2px; }
.az-detail-desc { font-size: 14px; color: var(--rz-text-color-gray); line-height: 1.75; margin-bottom: 20px; padding: 16px 0; border-top: 1px solid var(--rz-border-color-light); }
.az-detail-contact { background: var(--rz-background-color-gray); border-radius: 6px; padding: 20px 20px 24px; }
.az-detail-contact h4 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }
.az-detail-contact p { font-size: 13px; color: #767676; line-height: 1.6; margin-bottom: 14px; }
@media (max-width: 768px) {
  .az-detail-layout { grid-template-columns: 1fr; gap: 24px; }
  .az-detail-gallery { position: static; }
  .az-detail-title { font-size: 21px; }
  .az-detail-price { font-size: 24px; }
  .az-detail-specs { grid-template-columns: 1fr; }
  .az-detail-spec { border-right: none; }
}

/* ─── MOBILE NAV ─────────────────────────────────────────── */
.az-mobile-overlay {
  position: fixed; inset: 0; z-index: 299; background: rgba(0,0,0,.45);
}
.az-mobile-nav {
  position: fixed; top: 0; left: 0; bottom: 0; width: 280px; z-index: 300;
  background: #fff; padding: 28px 20px; overflow-y: auto;
  transform: translateX(-100%); transition: transform .28s ease;
  display: flex; flex-direction: column; gap: 0;
}
.az-mobile-nav.open { transform: translateX(0); }
.az-mobile-nav-close {
  background: none; border: none; cursor: pointer; align-self: flex-end;
  font-size: 22px; color: var(--rz-text-color-gray); padding: 4px; margin-bottom: 16px;
}
.az-mobile-nav ul { list-style: none; }
.az-mobile-nav ul li { border-bottom: 1px solid var(--rz-border-color-light); }
.az-mobile-nav ul li a {
  display: block; padding: 14px 0; font-size: 15px; font-weight: 500;
  color: var(--rz-color-dark); transition: color .2s;
}
.az-mobile-nav ul li a:hover,
.az-mobile-nav ul li.active a { color: var(--rz-color-primary); }

/* ─── MOBILE FILTER DRAWER ───────────────────────────────── */
.az-filter-drawer-overlay {
  position: fixed; inset: 0; z-index: 399; background: rgba(0,0,0,.45);
}
.az-filter-drawer {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 400;
  background: #fff; border-radius: 14px 14px 0 0;
  padding: 20px 20px 32px; max-height: 82vh; overflow-y: auto;
}
.az-filter-drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px;
}
.az-filter-drawer-header h3 { font-size: 16px; font-weight: 700; color: var(--rz-color-dark); }
.az-filter-drawer-close {
  background: #f0f0f0; border: none; border-radius: 50%; width: 30px; height: 30px;
  cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;
}
.az-mobile-filter-btn {
  display: none; align-items: center; gap: 6px;
  background: var(--rz-color-dark); color: #fff; border: none; border-radius: 3px;
  padding: 8px 14px; font-family: var(--rz-font-family); font-size: 12px;
  font-weight: 700; text-transform: uppercase; letter-spacing: .4px; cursor: pointer;
  transition: background .2s;
}
.az-mobile-filter-btn:hover { background: var(--rz-color-primary); }
.az-mobile-filter-btn svg { width: 14px; height: 14px; fill: currentColor; }

/* ─── PAGINATION ─────────────────────────────────────────── */
.az-ver-mas {
  width: 100%; padding: 13px; background: transparent;
  border: 1px solid var(--rz-border-color); border-radius: 3px;
  font-family: var(--rz-font-family); font-size: 13px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px; cursor: pointer;
  color: var(--rz-text-color-gray); transition: all .2s; margin-top: 8px;
}
.az-ver-mas:hover { border-color: var(--rz-color-dark); color: var(--rz-color-dark); }

/* ─── PRICE CURRENCY TOGGLE ──────────────────────────────── */
.az-currency-row { display: flex; gap: 8px; margin-bottom: 10px; }
.az-currency-btn {
  flex: 1; padding: 8px; border: 1.5px solid var(--rz-border-color-light);
  border-radius: 4px; background: #fff; font-family: var(--rz-font-family);
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s;
  color: var(--rz-text-color-gray);
}
.az-currency-btn.active { border-color: var(--rz-color-dark); background: var(--rz-color-dark); color: #fff; }

/* ─── RESPONSIVE ──────────────────────────────────────────── */
@media (max-width: 900px) {
  .az-header-inner { justify-content: center; }
  .az-nav-wrapper { display: none; }
  .az-burger { display: flex; position: absolute; left: 20px; }
  .az-logo { position: absolute; left: 50%; transform: translateX(-50%); }
  .az-search-btn { position: absolute; right: 20px; }
  .az-sidebar { display: none; }
  .az-mobile-filter-btn { display: flex; }
  .az-footer-inner { grid-template-columns: 180px 1fr 1fr; }
  .az-footer-col--split { grid-column: 2 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .az-footer-bottom { flex-direction: column; align-items: center; text-align: center; gap: 16px; }
  .az-form-row { grid-template-columns: 1fr; }
  .az-form-row.thirds { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .az-footer-inner { grid-template-columns: 1fr; gap: 0; padding-bottom: 0; }
  .az-footer-col--split { grid-column: auto; display: block; }
  .az-footer-logo-col { display: flex; justify-content: center; padding: 8px 0 32px; border-bottom: 1px solid #2a2a2a; }
  .az-footer-logo img { width: 160px; }
  .az-footer-col { border-bottom: 1px solid #2a2a2a; }
  .az-footer-col-header { cursor: pointer; padding: 16px 0; }
  .az-footer-col h4 { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
  .az-footer-chevron { display: block; color: #888; font-size: 18px; transition: transform .25s; line-height: 1; }
  .az-footer-chevron.open { transform: rotate(180deg); }
  .az-footer-col-body { overflow: hidden; max-height: 0; transition: max-height .3s ease, padding .3s ease; padding-bottom: 0; }
  .az-footer-col-body.open { max-height: 500px; padding-bottom: 16px; }
  .az-footer-bottom { flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 24px 0; }
  .az-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .az-photos-grid { grid-template-columns: repeat(3, 1fr); }
  .az-admin-grid { grid-template-columns: 1fr; }
  .az-steps-bar { gap: 0; }
  .az-step-label { display: none; }
}
`;

/* ─────────────────────────────────────────────────────────────
   FORM INITIAL STATE
───────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  categoria: "",
  tipo: "", marca: "", modelo: "", version: "", anio: "",
  estado: "", mano: "", flex: "", loft: "", material: "", largo: "",
  bounce: "", grind: "", headcover: false, composicion: [], estiloPutter: "", numPalo: "",
  aConsultar: false, precio: "", moneda: "USD",
  descripcion: "", departamento: "",
  enElLocal: false, aceptaComision: false,
  nombre: "", contacto: "",
};

/* ─────────────────────────────────────────────────────────────
   SUBCOMPONENT: PublicarForm
───────────────────────────────────────────────────────────── */
function PublicarForm({ onSuccess }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const fileRef = useRef();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const isPalos = form.categoria === "palos";
  const STEPS = isPalos || !form.categoria
    ? ["Categoría", "Identificar", "Estado", "Fotos", "Publicar"]
    : ["Categoría", "Identificar", "Fotos", "Publicar"];
  const maxStep = STEPS.length - 1;

  const onCategorySelect = (cat) => {
    if (cat !== form.categoria) {
      setForm({ ...EMPTY_FORM, categoria: cat });
      setPhotos([]);
      setPreviews([]);
    }
    setStep(1);
  };

  const hasTipo = (tipos) => tipos.includes(form.tipo);
  const needsFlex   = form.tipo && form.tipo !== "putter";
  const needsLoft   = hasTipo(["driver", "madera", "hibrido", "wedge"]);
  const needsBounce = hasTipo(["wedge"]);
  const needsHead   = hasTipo(["driver", "madera", "hibrido", "putter"]);

  // Cascade handlers con autoselección cuando hay una sola opción
  const onTipo = (v) => setForm(f => ({ ...EMPTY_FORM, categoria: f.categoria, ...cascadeFill(v, "", "", "") }));
  const onMarca = (v) => setForm(f => ({ ...EMPTY_FORM, categoria: f.categoria, tipo: f.tipo, ...cascadeFill(f.tipo, v, "", "") }));
  const onModelo = (v) => setForm(f => ({ ...EMPTY_FORM, categoria: f.categoria, tipo: f.tipo, marca: f.marca, ...cascadeFill(f.tipo, f.marca, v, "") }));
  const onVersion = (v) => {
    const years = getAnios(form.tipo, form.marca, form.modelo, v);
    setForm(f => ({ ...f, version: v, anio: years.length === 1 ? String(years[0]) : "" }));
  };

  // Photos
  const addFiles = useCallback((files) => {
    const valid = [...files].filter(f => f.type.startsWith("image/")).slice(0, 8 - photos.length);
    if (!valid.length) return;
    setPhotos(p => [...p, ...valid]);
    setPreviews(p => [...p, ...valid.map(f => URL.createObjectURL(f))]);
  }, [photos.length]);

  const removePhoto = (i) => {
    URL.revokeObjectURL(previews[i]);
    setPhotos(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
    setPhotoIdx(ix => Math.max(0, Math.min(ix, photos.length - 2)));
  };

  // Validation per step
  const validate = () => {
    const e = {};
    if (step === 1) {
      if (isPalos) {
        if (manualEntry) {
          if (!form.tipo)  e.tipo  = "Seleccioná un tipo";
          if (!form.marca.trim()) e.marca = "Ingresá la marca";
        } else {
          if (!form.tipo)  e.tipo   = "Seleccioná un tipo";
          if (form.tipo  && !form.marca)   e.marca   = "Seleccioná una marca";
          if (form.marca && !form.modelo)  e.modelo  = "Seleccioná un modelo";
          if (form.modelo && showVersionSelect && !form.version) e.version = "Seleccioná una versión";
          if (form.version && showAnioSelect && !form.anio) e.anio = "Seleccioná el año";
        }
      } else {
        if (!form.marca.trim()) e.marca = "Ingresá la marca";
      }
    }
    if (isPalos) {
      if (step === 2) {
        if (!form.estado) e.estado = "Seleccioná la condición";
        if (!form.mano) e.mano = "Seleccioná la mano";
        if (form.tipo === "driver" && !form.flex) e.flex = "Seleccioná el flex";
        if ((form.tipo === "driver" || form.tipo === "wedge") && !form.loft) e.loft = "Seleccioná el loft";
        if ((form.tipo === "madera" || form.tipo === "hibrido") && !form.numPalo) e.numPalo = "Seleccioná el número";
        if (form.tipo === "putter" && !form.estiloPutter) e.estiloPutter = "Seleccioná el estilo";
        if (form.tipo === "putter" && !form.largo) e.largo = "Seleccioná el largo del putter";
        if (form.tipo === "hierros" && form.composicion.length < 2)
          e.composicion = "Seleccioná al menos 2 palos del set";
      }
      if (step === 3) {
        if (photos.length === 0) e.photos = "Subí al menos una foto";
      }
      if (step === 4) {
        if (!form.aConsultar && !form.precio) e.precio = "Ingresá un precio o marcá 'A consultar'";
        if (!form.departamento) e.departamento = "Seleccioná un departamento";
        if (!form.nombre.trim()) e.nombre = "Ingresá tu nombre";
        if (!form.contacto.trim()) e.contacto = "Ingresá tu WhatsApp o email";
        if (form.enElLocal && !form.aceptaComision) e.aceptaComision = "Debés aceptar la comisión para activar esta opción";
      }
    } else {
      if (step === 2) {
        if (photos.length === 0) e.photos = "Subí al menos una foto";
      }
      if (step === 3) {
        if (!form.estado) e.estado = "Seleccioná el estado";
        if (!form.aConsultar && !form.precio) e.precio = "Ingresá un precio o marcá 'A consultar'";
        if (!form.departamento) e.departamento = "Seleccioná un departamento";
        if (!form.nombre.trim()) e.nombre = "Ingresá tu nombre";
        if (!form.contacto.trim()) e.contacto = "Ingresá tu WhatsApp o email";
        if (form.enElLocal && !form.aceptaComision) e.aceptaComision = "Debés aceptar la comisión para activar esta opción";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const prev = () => setStep(s => s - 1);

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fotos = await Promise.all(photos.map(f => uploadToCloudinary(f)));
      notifyNewListing(form);

      if (isPalos) {
        await addDoc(collection(db, "listings"), {
          status: "pending",
          categoria: "palos",
          tipo: form.tipo, marca: form.marca, modelo: form.modelo,
          version: form.version || "Standard", anio: Number(form.anio),
          estado: form.estado, mano: form.mano,
          flex: form.flex || null, loft: form.loft ? Number(form.loft) : null,
          material: form.material || null, largo: form.largo || null,
          bounce: form.bounce ? Number(form.bounce) : null,
          grind: form.grind || null, headcover: form.headcover || null,
          estiloPutter: form.estiloPutter || null,
          numPalo: form.numPalo || null,
          composicion: form.composicion.length > 0 ? form.composicion : null,
          aConsultar: form.aConsultar, precio: form.aConsultar ? null : Number(form.precio),
          moneda: form.aConsultar ? null : (form.moneda || "USD"),
          descripcion: form.descripcion || null, departamento: form.departamento,
          enElLocal: form.enElLocal || false, aceptaComision: form.aceptaComision || false,
          vendedor: { nombre: form.nombre, contacto: form.contacto },
          fotos, createdAt: serverTimestamp(), approvedAt: null,
        });
      } else {
        await addDoc(collection(db, "listings"), {
          status: "pending",
          categoria: form.categoria,
          marca: form.marca, modelo: form.modelo || null,
          estado: form.estado,
          aConsultar: form.aConsultar, precio: form.aConsultar ? null : Number(form.precio),
          moneda: form.aConsultar ? null : (form.moneda || "USD"),
          descripcion: form.descripcion || null, departamento: form.departamento,
          enElLocal: form.enElLocal || false, aceptaComision: form.aceptaComision || false,
          vendedor: { nombre: form.nombre, contacto: form.contacto },
          fotos, createdAt: serverTimestamp(), approvedAt: null,
        });
      }
      onSuccess();
    } catch (err) {
      console.error("Submit error:", err?.code, err?.message, err);
      const msg = err?.code === "permission-denied"
        ? "Sin permisos en Firebase. Revisá las Firestore Security Rules."
        : `Error: ${err?.code || err?.message || "desconocido"}`;
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const marcas    = form.tipo ? getMarcas(form.tipo) : [];
  const modelos   = form.tipo && form.marca ? getModelos(form.tipo, form.marca) : [];
  const versiones = form.tipo && form.marca && form.modelo ? getVersiones(form.tipo, form.marca, form.modelo) : [];
  const anios     = form.tipo && form.marca && form.modelo && form.version
    ? getAnios(form.tipo, form.marca, form.modelo, form.version) : [];

  const showMarcaSelect   = marcas.length > 1;
  const showModeloSelect  = modelos.length > 1;
  const showVersionSelect = versiones.length > 1;
  const showAnioSelect    = anios.length > 1;

  return (
    <div className="az-publicar-wrap">
      <p className="az-publicar-title">
        {!form.categoria ? "Publicar un artículo" : `Publicar: ${CATEGORIA_LABELS[form.categoria]}`}
      </p>

      {/* Step indicator */}
      <div className="az-steps-bar">
        {STEPS.map((label, i) => {
          const cls = i < step ? "done" : i === step ? "active" : "";
          return (
            <div key={label} className="az-step-item" style={{ flex: i < STEPS.length - 1 ? 1 : "none" }}>
              <div className={`az-step-circle ${cls}`}>{i < step ? "✓" : i + 1}</div>
              <span className={`az-step-label ${cls}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="az-step-line" />}
            </div>
          );
        })}
      </div>

      {errors.submit && <div className="az-form-errors">{errors.submit}</div>}

      {/* ── Step 0: Categoría ── */}
      {step === 0 && (
        <div>
          <div className="az-form-section-title" style={{ marginBottom: 20 }}>¿Qué querés publicar?</div>
          <div className="az-cat-grid">
            {CATEGORIA_OPTS.map(cat => (
              <div key={cat} className="az-cat-card" onClick={() => onCategorySelect(cat)}>
                <div className="az-cat-name">{CATEGORIA_LABELS[cat]}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 1: Identificar ── */}
      {step === 1 && isPalos && (
        <>
          {/* Tipo — siempre visible */}
          <div className="az-field">
            <label className="az-label">Tipo de palo</label>
            <select className="az-select" value={form.tipo} onChange={e => { onTipo(e.target.value); setManualEntry(false); }}>
              <option value="">Seleccionar…</option>
              {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
            </select>
            {errors.tipo && <p className="az-error-msg">{errors.tipo}</p>}
          </div>

          {!manualEntry && form.tipo && (
            <>
              {/* Marca */}
              <div className="az-field">
                <label className="az-label">Marca</label>
                {showMarcaSelect
                  ? <select className="az-select" value={form.marca} onChange={e => onMarca(e.target.value)}>
                      <option value="">Seleccionar…</option>
                      {marcas.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  : <div className="az-auto-val">{form.marca}</div>
                }
                {errors.marca && <p className="az-error-msg">{errors.marca}</p>}
              </div>

              {/* Modelo */}
              {form.marca && (
                <div className="az-field">
                  <label className="az-label">Modelo</label>
                  {showModeloSelect
                    ? <select className="az-select" value={form.modelo} onChange={e => onModelo(e.target.value)}>
                        <option value="">Seleccionar…</option>
                        {modelos.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    : <div className="az-auto-val">{form.modelo}</div>
                  }
                  {errors.modelo && <p className="az-error-msg">{errors.modelo}</p>}
                </div>
              )}

              {/* Versión */}
              {form.modelo && showVersionSelect && (
                <div className="az-field">
                  <label className="az-label">Versión</label>
                  <select className="az-select" value={form.version} onChange={e => onVersion(e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {versiones.map(v => (
                      <option key={v.version} value={v.version}>{v.version} ({v.anio})</option>
                    ))}
                  </select>
                  {errors.version && <p className="az-error-msg">{errors.version}</p>}
                </div>
              )}

              {/* Año */}
              {form.version && (
                <div className="az-field" style={{ maxWidth: 200 }}>
                  <label className="az-label">Año</label>
                  {showAnioSelect
                    ? <select className="az-select" value={form.anio} onChange={e => setForm(f => ({ ...f, anio: e.target.value }))}>
                        <option value="">Seleccionar…</option>
                        {anios.map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select>
                    : <div className="az-auto-val">{form.anio}</div>
                  }
                  {errors.anio && <p className="az-error-msg">{errors.anio}</p>}
                </div>
              )}
            </>
          )}

          {/* Entrada manual */}
          {manualEntry && form.tipo && (
            <>
              <div className="az-form-row">
                <div className="az-field">
                  <label className="az-label">Marca</label>
                  <input className="az-input" type="text" value={form.marca}
                    onChange={e => set("marca", e.target.value)} placeholder="ej: Cobra, XXIO, Honma…" />
                  {errors.marca && <p className="az-error-msg">{errors.marca}</p>}
                </div>
                <div className="az-field">
                  <label className="az-label">Modelo <span className="opt">(opcional)</span></label>
                  <input className="az-input" type="text" value={form.modelo}
                    onChange={e => set("modelo", e.target.value)} placeholder="ej: Aerojet, EZone…" />
                </div>
              </div>
              <div className="az-field" style={{ maxWidth: 160 }}>
                <label className="az-label">Año <span className="opt">(opcional)</span></label>
                <input className="az-input" type="number" value={form.anio} min="1990" max="2030"
                  onChange={e => set("anio", e.target.value)} placeholder="ej: 2022" />
              </div>
            </>
          )}

          {/* Toggle manual / cascada */}
          {form.tipo && (
            <button type="button" className="az-extra-toggle" style={{ marginTop: 16 }}
              onClick={() => {
                const next = !manualEntry;
                setManualEntry(next);
                setForm(f => ({ ...EMPTY_FORM, categoria: f.categoria, tipo: f.tipo }));
              }}>
              <span style={{ fontSize: 14 }}>{manualEntry ? "←" : "?"}</span>
              {manualEntry ? "Buscar en la base de datos" : "Mi palo no está en la lista"}
            </button>
          )}
        </>
      )}

      {/* ── Step 1: Identificar (Carros / Bolsas / Otros) ── */}
      {step === 1 && !isPalos && (
        <>
          <div className="az-field">
            <label className="az-label">Marca</label>
            <input className="az-input" type="text" value={form.marca}
              onChange={e => set("marca", e.target.value)}
              placeholder={form.categoria === "carros" ? "Clicgear, Motocaddy…" : form.categoria === "bolsas" ? "TaylorMade, Titleist…" : "Marca del producto"} />
            {errors.marca && <p className="az-error-msg">{errors.marca}</p>}
          </div>
          <div className="az-field">
            <label className="az-label">Modelo <span className="opt">(opcional)</span></label>
            <input className="az-input" type="text" value={form.modelo}
              onChange={e => set("modelo", e.target.value)}
              placeholder="Nombre o referencia del modelo" />
          </div>
        </>
      )}

      {/* ── Step 2: Características (palos) ── */}
      {step === 2 && isPalos && (
        <>
          {/* Condición + Mano — siempre */}
          <div className="az-form-row">
            <div className="az-field">
              <label className="az-label">Condición</label>
              <select className="az-select" value={form.estado} onChange={e => set("estado", e.target.value)}>
                <option value="">Seleccionar…</option>
                {ESTADO_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
              {errors.estado && <p className="az-error-msg">{errors.estado}</p>}
            </div>
            <div className="az-field">
              <label className="az-label">Mano</label>
              <select className="az-select" value={form.mano} onChange={e => set("mano", e.target.value)}>
                <option value="">Seleccionar…</option>
                {MANO_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
              {errors.mano && <p className="az-error-msg">{errors.mano}</p>}
            </div>
          </div>

          {/* Putter: estilo y largo OBLIGATORIOS */}
          {form.tipo === "putter" && (
            <div className="az-form-row">
              <div className="az-field">
                <label className="az-label">Estilo</label>
                <select className="az-select" value={form.estiloPutter} onChange={e => set("estiloPutter", e.target.value)}>
                  <option value="">Seleccionar…</option>
                  {PUTTER_ESTILO_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
                {errors.estiloPutter && <p className="az-error-msg">{errors.estiloPutter}</p>}
              </div>
              <div className="az-field">
                <label className="az-label">Largo</label>
                <select className="az-select" value={form.largo} onChange={e => set("largo", e.target.value)}>
                  <option value="">Seleccionar…</option>
                  {PUTTER_LARGO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {errors.largo && <p className="az-error-msg">{errors.largo}</p>}
              </div>
            </div>
          )}

          {/* Madera: número OBLIGATORIO */}
          {form.tipo === "madera" && (
            <div className="az-field" style={{ maxWidth: 220 }}>
              <label className="az-label">Número de madera</label>
              <select className="az-select" value={form.numPalo} onChange={e => set("numPalo", e.target.value)}>
                <option value="">Seleccionar…</option>
                {MADERA_NUM_OPTS.map(n => <option key={n} value={n}>Madera {n}</option>)}
              </select>
              {errors.numPalo && <p className="az-error-msg">{errors.numPalo}</p>}
            </div>
          )}

          {/* Híbrido: número OBLIGATORIO */}
          {form.tipo === "hibrido" && (
            <div className="az-field" style={{ maxWidth: 220 }}>
              <label className="az-label">Número del híbrido</label>
              <select className="az-select" value={form.numPalo} onChange={e => set("numPalo", e.target.value)}>
                <option value="">Seleccionar…</option>
                {HIBRIDO_NUM_OPTS.map(n => <option key={n} value={n}>Híbrido {n}</option>)}
              </select>
              {errors.numPalo && <p className="az-error-msg">{errors.numPalo}</p>}
            </div>
          )}

          {/* Flex — todos excepto putter (obligatorio solo para driver) */}
          {needsFlex && (
            <div className="az-field" style={{ maxWidth: 240 }}>
              <label className="az-label">
                Flex del shaft
                {form.tipo !== "driver" && <span className="opt"> (opcional)</span>}
              </label>
              <select className="az-select" value={form.flex} onChange={e => set("flex", e.target.value)}>
                <option value="">Seleccionar…</option>
                {FLEX_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
              {errors.flex && <p className="az-error-msg">{errors.flex}</p>}
            </div>
          )}

          {/* Hierros: composición del set */}
          {form.tipo === "hierros" && (
            <div className="az-field">
              <label className="az-label">Composición del set</label>
              <p style={{ fontSize: 12, color: "#aaa", margin: "-4px 0 10px" }}>Seleccioná los hierros que incluye el set</p>
              <div className="az-iron-set">
                {IRON_OPTS.map(iron => {
                  const sel = form.composicion.includes(iron);
                  return (
                    <label key={iron} className={`az-iron-chip${sel ? " sel" : ""}`}>
                      <input type="checkbox" checked={sel} onChange={e => {
                        const next = e.target.checked
                          ? [...form.composicion, iron]
                          : form.composicion.filter(i => i !== iron);
                        set("composicion", next);
                      }} />
                      {iron}
                    </label>
                  );
                })}
              </div>
              {form.composicion.length >= 2 && (
                <p className="az-iron-summary">
                  Set: <strong>{formatComposicion(form.composicion)}</strong>
                  {" "}({form.composicion.length} palos)
                </p>
              )}
              {errors.composicion && <p className="az-error-msg">{errors.composicion}</p>}
            </div>
          )}

          {/* Hierros: material del shaft visible (grafito vs acero es dato clave) */}
          {form.tipo === "hierros" && (
            <div className="az-field" style={{ maxWidth: 240 }}>
              <label className="az-label">Material del shaft <span className="opt">(opcional)</span></label>
              <select className="az-select" value={form.material} onChange={e => set("material", e.target.value)}>
                <option value="">No especificar</option>
                {MATERIAL_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          )}

          {/* Driver y Wedge: loft OBLIGATORIO */}
          {(form.tipo === "driver" || form.tipo === "wedge") && (
            <div className="az-field" style={{ maxWidth: 200 }}>
              <label className="az-label">Loft</label>
              <select className="az-select" value={form.loft} onChange={e => set("loft", e.target.value)}>
                <option value="">Seleccionar…</option>
                {(LOFT_OPTS[form.tipo] || []).map(v => (
                  <option key={v} value={v}>{v}°</option>
                ))}
              </select>
              {errors.loft && <p className="az-error-msg">{errors.loft}</p>}
            </div>
          )}

          {/* Wedge: bounce + grind */}
          {form.tipo === "wedge" && (
            <div className="az-form-row">
              <div className="az-field">
                <label className="az-label">Bounce <span className="opt">(opcional)</span></label>
                <select className="az-select" value={form.bounce} onChange={e => set("bounce", e.target.value)}>
                  <option value="">No sé / No especificar</option>
                  {BOUNCE_OPTS.map(v => <option key={v} value={v}>{v}°</option>)}
                </select>
              </div>
              <div className="az-field">
                <label className="az-label">Grind <span className="opt">(opcional)</span></label>
                <select className="az-select" value={form.grind} onChange={e => set("grind", e.target.value)}>
                  <option value="">No sé / No especificar</option>
                  {GRIND_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
                <p style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Está marcado en la cara del wedge</p>
              </div>
            </div>
          )}

          {/* ── Sección colapsable: datos técnicos adicionales ── */}
          <button type="button" className="az-extra-toggle" onClick={() => setShowExtra(s => !s)}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>{showExtra ? "−" : "+"}</span>
            {showExtra ? "Ocultar datos adicionales" : "Agregar datos técnicos (opcional)"}
          </button>

          {showExtra && (
            <div style={{ marginTop: 16 }}>
              {/* Madera e Híbrido: loft opcional */}
              {(form.tipo === "madera" || form.tipo === "hibrido") && (
                <div className="az-field" style={{ maxWidth: 200 }}>
                  <label className="az-label">Loft <span className="opt">(opcional)</span></label>
                  <select className="az-select" value={form.loft} onChange={e => set("loft", e.target.value)}>
                    <option value="">No especificar</option>
                    {(LOFT_OPTS[form.tipo] || []).map(v => (
                      <option key={v} value={v}>{v}°</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Shaft material + largo — no putter */}
              {form.tipo !== "putter" && (
                <div className="az-form-row">
                  {form.tipo !== "hierros" && (
                  <div className="az-field">
                    <label className="az-label">Material del shaft <span className="opt">(opcional)</span></label>
                    <select className="az-select" value={form.material} onChange={e => set("material", e.target.value)}>
                      <option value="">No especificar</option>
                      {MATERIAL_OPTS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  )}
                  <div className="az-field">
                    <label className="az-label">Largo del shaft <span className="opt">(opcional)</span></label>
                    <select className="az-select" value={form.largo} onChange={e => set("largo", e.target.value)}>
                      <option value="">Standard</option>
                      {LARGO_OPTS.filter(o => o !== "Standard").map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Headcover */}
              {needsHead && (
                <div className="az-checkbox-row">
                  <input type="checkbox" id="headcover" checked={form.headcover}
                    onChange={e => set("headcover", e.target.checked)} />
                  <label htmlFor="headcover">Incluye headcover</label>
                </div>
              )}

            </div>
          )}
        </>
      )}

      {/* ── Step 3: Fotos (palos) / Step 2: Fotos (otros) ── */}
      {((isPalos && step === 3) || (!isPalos && step === 2)) && (
        <>
          <div
            className={`az-drop-zone${dragOver ? " drag-over" : ""}`}
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <p>Arrastrá las fotos acá o <strong>hacé click para elegir</strong></p>
            <p style={{ fontSize: 11, marginTop: 4 }}>JPG / PNG · máximo 8 fotos</p>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden
              onChange={e => addFiles(e.target.files)} />
          </div>
          {errors.photos && <p className="az-error-msg" style={{ marginTop: 8 }}>{errors.photos}</p>}

          {previews.length > 0 && (
            <div className="az-photos-grid" style={{ marginTop: 16 }}>
              {previews.map((url, i) => (
                <div key={i} className="az-photo-thumb">
                  <img src={url} alt="" />
                  {i === 0 && <span className="az-photo-main-badge">Principal</span>}
                  <button className="az-photo-remove" onClick={() => removePhoto(i)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Step 3: Publicar (Carros / Bolsas / Otros) ── */}
      {!isPalos && step === 3 && (
        <>
          <div className="az-field">
            <label className="az-label">Estado</label>
            <select className="az-select" value={form.estado} onChange={e => set("estado", e.target.value)}>
              <option value="">Seleccionar…</option>
              {ESTADO_OPTS.map(o => <option key={o}>{o}</option>)}
            </select>
            {errors.estado && <p className="az-error-msg">{errors.estado}</p>}
          </div>

          <div className="az-field">
            <label className="az-label">Descripción <span className="opt">(opcional)</span></label>
            <textarea className="az-textarea" value={form.descripcion}
              onChange={e => set("descripcion", e.target.value)}
              placeholder="Estado, accesorios incluidos, motivo de venta…" />
          </div>

          <div className="az-field" style={{ maxWidth: 280 }}>
            <label className="az-label">Departamento</label>
            <select className="az-select" value={form.departamento} onChange={e => set("departamento", e.target.value)}>
              <option value="">Seleccionar…</option>
              {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
            </select>
            {errors.departamento && <p className="az-error-msg">{errors.departamento}</p>}
          </div>

          <div className="az-field">
            <label className="az-label">Precio</label>
            <div className="az-checkbox-row" style={{ padding: "0 0 12px" }}>
              <input type="checkbox" id="aConsultar" checked={form.aConsultar}
                onChange={e => set("aConsultar", e.target.checked)} />
              <label htmlFor="aConsultar">A consultar</label>
            </div>
            {!form.aConsultar && (
              <>
                <div className="az-currency-row">
                  {MONEDA_OPTS.map(m => (
                    <button key={m} type="button"
                      className={`az-currency-btn${form.moneda === m ? " active" : ""}`}
                      onClick={() => set("moneda", m)}>{m}</button>
                  ))}
                </div>
                <div className="az-price-input-wrap">
                  <span className="az-price-prefix">{form.moneda === "UYU" ? "$" : "US$"}</span>
                  <input className="az-input has-prefix" type="number" min="0"
                    value={form.precio} onChange={e => set("precio", e.target.value)} placeholder="0" />
                </div>
              </>
            )}
            {errors.precio && <p className="az-error-msg">{errors.precio}</p>}
          </div>

          <div className="az-field" style={{ marginTop: 8 }}>
            <div className="az-checkbox-row" style={{ padding: "8px 0" }}>
              <input type="checkbox" id="enElLocal" checked={form.enElLocal}
                onChange={e => set("enElLocal", e.target.checked)} />
              <label htmlFor="enElLocal" style={{ fontWeight: 600 }}>
                📍 Dejar disponible en el local de Azalea Golf
              </label>
            </div>
            {form.enElLocal && (
              <div className="az-commission-notice">
                <strong>Comisión del 10%</strong> — Al dejar el artículo en el local de Azalea, en caso de venta Azalea cobra una comisión del <strong>10%</strong> sobre el precio final.
                <div className="az-checkbox-row" style={{ marginTop: 10, padding: 0 }}>
                  <input type="checkbox" id="aceptaComision" checked={form.aceptaComision}
                    onChange={e => set("aceptaComision", e.target.checked)} />
                  <label htmlFor="aceptaComision">Entendido, acepto la comisión del 10%</label>
                </div>
                {errors.aceptaComision && <p className="az-error-msg">{errors.aceptaComision}</p>}
              </div>
            )}
          </div>

          <div className="az-form-section" style={{ marginTop: 28 }}>
            <div className="az-form-section-title">Datos de contacto</div>
            <div className="az-form-row">
              <div className="az-field">
                <label className="az-label">Tu nombre</label>
                <input className="az-input" type="text" value={form.nombre}
                  onChange={e => set("nombre", e.target.value)} placeholder="Juan García" />
                {errors.nombre && <p className="az-error-msg">{errors.nombre}</p>}
              </div>
              <div className="az-field">
                <label className="az-label">WhatsApp o email</label>
                <input className="az-input" type="text" value={form.contacto}
                  onChange={e => set("contacto", e.target.value)} placeholder="099 123 456 o correo@mail.com" />
                {errors.contacto && <p className="az-error-msg">{errors.contacto}</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Step 4: Publicar (palos) ── */}
      {isPalos && step === 4 && (
        <>
          {/* Precio */}
          <div className="az-field">
            <label className="az-label">Precio</label>
            <div className="az-checkbox-row" style={{ padding: "0 0 12px" }}>
              <input type="checkbox" id="aConsultar" checked={form.aConsultar}
                onChange={e => set("aConsultar", e.target.checked)} />
              <label htmlFor="aConsultar">A consultar</label>
            </div>
            {!form.aConsultar && (
              <>
                <div className="az-currency-row">
                  {MONEDA_OPTS.map(m => (
                    <button key={m} type="button"
                      className={`az-currency-btn${form.moneda === m ? " active" : ""}`}
                      onClick={() => set("moneda", m)}>{m}</button>
                  ))}
                </div>
                <div className="az-price-input-wrap">
                  <span className="az-price-prefix">{form.moneda === "UYU" ? "$" : "US$"}</span>
                  <input className="az-input has-prefix" type="number" min="0"
                    value={form.precio} onChange={e => set("precio", e.target.value)} placeholder="0" />
                </div>
              </>
            )}
            {errors.precio && <p className="az-error-msg">{errors.precio}</p>}
          </div>

          <div className="az-field">
            <label className="az-label">Descripción <span className="opt">(opcional)</span></label>
            <textarea className="az-textarea" value={form.descripcion}
              onChange={e => set("descripcion", e.target.value)}
              placeholder="Estado del grip, modificaciones, motivo de venta…" />
          </div>

          <div className="az-field" style={{ maxWidth: 280 }}>
            <label className="az-label">Departamento</label>
            <select className="az-select" value={form.departamento} onChange={e => set("departamento", e.target.value)}>
              <option value="">Seleccionar…</option>
              {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
            </select>
            {errors.departamento && <p className="az-error-msg">{errors.departamento}</p>}
          </div>

          {/* En el local */}
          <div className="az-field" style={{ marginTop: 8 }}>
            <div className="az-checkbox-row" style={{ padding: "8px 0" }}>
              <input type="checkbox" id="enElLocal" checked={form.enElLocal}
                onChange={e => set("enElLocal", e.target.checked)} />
              <label htmlFor="enElLocal" style={{ fontWeight: 600 }}>
                📍 Dejar disponible en el local de Azalea Golf
              </label>
            </div>
            {form.enElLocal && (
              <div className="az-commission-notice">
                <strong>Comisión del 10%</strong> — Al dejar tu palo en el local de Azalea, el equipo lo tiene disponible para que los clientes puedan verlo y probarlo. En caso de concretarse una venta, Azalea cobra una comisión del <strong>10%</strong> sobre el precio final.
                <div className="az-checkbox-row" style={{ marginTop: 10, padding: 0 }}>
                  <input type="checkbox" id="aceptaComision" checked={form.aceptaComision}
                    onChange={e => set("aceptaComision", e.target.checked)} />
                  <label htmlFor="aceptaComision">Entendido, acepto la comisión del 10%</label>
                </div>
                {errors.aceptaComision && <p className="az-error-msg">{errors.aceptaComision}</p>}
              </div>
            )}
          </div>

          <div className="az-form-section" style={{ marginTop: 28 }}>
            <div className="az-form-section-title">Datos de contacto</div>
            <div className="az-form-row">
              <div className="az-field">
                <label className="az-label">Tu nombre</label>
                <input className="az-input" type="text" value={form.nombre}
                  onChange={e => set("nombre", e.target.value)} placeholder="Juan García" />
                {errors.nombre && <p className="az-error-msg">{errors.nombre}</p>}
              </div>
              <div className="az-field">
                <label className="az-label">WhatsApp o email</label>
                <input className="az-input" type="text" value={form.contacto}
                  onChange={e => set("contacto", e.target.value)} placeholder="099 123 456 o correo@mail.com" />
                {errors.contacto && <p className="az-error-msg">{errors.contacto}</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Nav buttons */}
      {step > 0 && (
        <div className="az-form-nav">
          <button className="az-btn-secondary" onClick={prev}>← Anterior</button>
          {step < maxStep
            ? <button className="az-btn-primary" onClick={next}>Siguiente →</button>
            : <button className="az-btn-primary" onClick={submit} disabled={submitting}>
                {submitting ? "Enviando…" : "Publicar aviso"}
              </button>
          }
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SUBCOMPONENT: CardDetailModal
───────────────────────────────────────────────────────────── */
const AZALEA_WA = "59892390042";

function CardDetailModal({ listing, onClose }) {
  const [idx, setIdx] = useState(0);
  const fotos = listing.fotos || [];
  const cat = listing.categoria || "palos";

  const waMsg = cat === "palos"
    ? encodeURIComponent(`Hola! Me interesa el ${TIPO_LABELS[listing.tipo]} ${listing.marca} ${listing.modelo}${labelVersion(listing.version)} (${listing.anio}) que vi en Palos Usados.`)
    : encodeURIComponent(`Hola! Me interesa ${listing.marca}${listing.modelo ? " " + listing.modelo : ""} (${CATEGORIA_LABELS[cat]}) que vi en Palos Usados.`);
  const contactHref = `https://wa.me/${AZALEA_WA}?text=${waMsg}`;

  const spec = (label, val) => val
    ? <div className="az-modal-spec"><strong>{label}:</strong> {val}</div>
    : null;

  return (
    <div className="az-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="az-modal-card">
        <button className="az-modal-close" onClick={onClose}>✕</button>

        {/* Gallery */}
        <div className="az-modal-gallery">
          {fotos.length > 0
            ? <img src={fotos[idx]} alt="" />
            : <div className="az-modal-gallery-placeholder">⛳</div>
          }
          {fotos.length > 1 && (
            <>
              <button className="az-modal-gallery-nav prev" onClick={() => setIdx(i => (i - 1 + fotos.length) % fotos.length)}>‹</button>
              <button className="az-modal-gallery-nav next" onClick={() => setIdx(i => (i + 1) % fotos.length)}>›</button>
              <span className="az-modal-gallery-count">{idx + 1}/{fotos.length}</span>
            </>
          )}
        </div>

        <div className="az-modal-body">
          <div className="az-modal-tipo">
            {cat === "palos" ? `${tipoTag(listing.tipo)} · ${listing.marca}` : `${CATEGORIA_LABELS[cat]} · ${listing.marca}`}
          </div>
          <div className="az-modal-title">
            {listing.modelo}{cat === "palos" ? labelVersion(listing.version) : ""}
          </div>
          <div className={`az-modal-price${listing.aConsultar ? " consultar" : ""}`}>
            {formatPrecio(listing)}
          </div>
          {listing.enElLocal && (
            <div className="az-card-local-badge" style={{ marginBottom: 8 }}>En el local</div>
          )}

          <div className="az-modal-specs">
            {cat === "palos" ? (
              <>
                {spec("Año", listing.anio)}
                {listing.numPalo && spec(listing.tipo === "madera" ? "Madera" : "Híbrido", `Nº ${listing.numPalo}`)}
                {spec("Condición", listing.estado)}
                {spec("Mano", listing.mano)}
                {listing.tipo === "putter" && spec("Estilo", listing.estiloPutter)}
                {spec("Flex", listing.flex)}
                {spec("Loft", listing.loft ? `${listing.loft}°` : null)}
                {spec("Material", listing.material)}
                {spec("Largo", listing.largo)}
                {spec("Bounce", listing.bounce ? `${listing.bounce}°` : null)}
                {spec("Grind", listing.grind)}
                {spec("Headcover", listing.headcover === true ? "Incluido" : null)}
                {listing.composicion?.length > 0 && spec("Set", formatComposicion(listing.composicion))}
                {spec("Departamento", listing.departamento)}
              </>
            ) : (
              <>
                {spec("Categoría", CATEGORIA_LABELS[cat])}
                {spec("Marca", listing.marca)}
                {listing.modelo && spec("Modelo", listing.modelo)}
                {spec("Estado", listing.estado)}
                {spec("Departamento", listing.departamento)}
              </>
            )}
          </div>

          {listing.descripcion && (
            <div className="az-modal-desc">{listing.descripcion}</div>
          )}

          <div className="az-modal-contact">
            <h4>¿Te interesa?</h4>
            <p style={{ fontSize: 13, color: "#767676", marginBottom: 12, lineHeight: 1.6 }}>
              {listing.enElLocal
                ? <>Este palo está disponible en el local de Azalea Golf. Podés pasar a verlo y coordinamos una prueba en el simulador antes de decidir.</>
                : <>Contactá a Azalea Golf para consultar disponibilidad y coordinar.</>
              }
            </p>
            <a className="az-modal-contact-link" href={contactHref} target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a4.56 4.56 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 .057C5.495.057.16 5.392.157 11.949c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0012 .057"/></svg>
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SUBCOMPONENT: LocalRegister
───────────────────────────────────────────────────────────── */
function LocalRegister({ listings, onSaveDatosBancarios, onEdit }) {
  // Agrupar por vendedor.nombre (orden alfabético)
  const byClient = listings.reduce((acc, l) => {
    const key = l.vendedor?.nombre || "Sin nombre";
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  const clients = Object.keys(byClient).sort();

  if (clients.length === 0)
    return <div className="az-empty"><p>No hay artículos en el local actualmente.</p></div>;

  return (
    <div className="az-local-wrap">
      {clients.map(name => {
        const palos = byClient[name];
        const totalUSD = palos.reduce((s, l) => s + (!l.aConsultar && l.precio && l.moneda !== "UYU" ? l.precio : 0), 0);
        const totalUYU = palos.reduce((s, l) => s + (!l.aConsultar && l.precio && l.moneda === "UYU"  ? l.precio : 0), 0);
        return (
          <ClientCard key={name} name={name} palos={palos}
            totalUSD={totalUSD} totalUYU={totalUYU}
            onSaveDatosBancarios={onSaveDatosBancarios}
            onEdit={onEdit}
          />
        );
      })}
    </div>
  );
}

function ClientCard({ name, palos, totalUSD, totalUYU, onSaveDatosBancarios, onEdit }) {
  const [bancarios, setBancarios] = useState(palos[0]?.datosBancarios || "");
  const [saved, setSaved] = useState(false);

  const handleBlur = async () => {
    await onSaveDatosBancarios(palos, bancarios);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="az-local-client">
      {/* Header del cliente */}
      <div className="az-local-client-header">
        <div>
          <div className="az-local-client-name">{name}</div>
          <div className="az-local-client-meta">
            {palos[0]?.vendedor?.contacto} · {palos.length} artículo{palos.length !== 1 ? "s" : ""}
          </div>
        </div>
        {(totalUSD > 0 || totalUYU > 0) && (
          <div className="az-local-client-total">
            {totalUSD > 0 && <span>US$ {totalUSD.toLocaleString("es-UY")}</span>}
            {totalUSD > 0 && totalUYU > 0 && <span style={{ margin: "0 4px" }}>+</span>}
            {totalUYU > 0 && <span>$ {totalUYU.toLocaleString("es-UY")}</span>}
          </div>
        )}
      </div>

      {/* Datos bancarios */}
      <div className="az-local-bancarios">
        <label>Datos bancarios para transferencia</label>
        <textarea
          value={bancarios}
          onChange={e => { setBancarios(e.target.value); setSaved(false); }}
          onBlur={handleBlur}
          placeholder="Banco, cuenta, titular, CI / Mercado Pago / Alias..."
        />
        {saved && <p className="az-local-saved">✓ Guardado</p>}
      </div>

      {/* Lista de palos */}
      <div className="az-local-palos">
        {palos.map(l => (
          <div key={l.id} className="az-local-palo" onClick={() => onEdit(l)} style={{ cursor: "pointer" }}>
            {l.fotos?.[0]
              ? <img src={l.fotos[0]} alt="" />
              : <div className="az-local-palo-ph">⛳</div>
            }
            <div className="az-local-palo-info">
              <strong>
                {(() => {
                  const lCat = l.categoria || "palos";
                  return lCat === "palos"
                    ? `${TIPO_LABELS[l.tipo] ?? ""} ${l.marca} ${l.modelo}${labelVersion(l.version)}`
                    : `${CATEGORIA_LABELS[lCat]} ${l.marca}${l.modelo ? " " + l.modelo : ""}`;
                })()}
              </strong>
              <span>
                {l.estado}
                {(l.categoria === "palos" || !l.categoria) && l.anio ? ` · ${l.anio}` : ""}
                {" · "}{formatPrecio(l)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SUBCOMPONENT: ListingDetail
───────────────────────────────────────────────────────────── */
function ListingDetail({ listing, onBack }) {
  const [idx, setIdx] = useState(0);
  const fotos = listing.fotos || [];
  const cat = listing.categoria || "palos";

  const waMsg = cat === "palos"
    ? encodeURIComponent(`Hola! Me interesa el ${TIPO_LABELS[listing.tipo] ?? listing.tipo} ${listing.marca} ${listing.modelo}${labelVersion(listing.version)} que vi en los artículos usados de Azalea.`)
    : encodeURIComponent(`Hola! Me interesa ${listing.marca}${listing.modelo ? " " + listing.modelo : ""} (${CATEGORIA_LABELS[cat]}) que vi en los artículos usados de Azalea.`);
  const contactHref = `https://wa.me/${AZALEA_WA}?text=${waMsg}`;

  const spec = (label, val) => val ? (
    <div className="az-detail-spec"><strong>{label}</strong>{val}</div>
  ) : null;

  const typeTag = cat === "palos"
    ? (listing.tipo === "wedge" && listing.loft ? `Wedge ${listing.loft}°` : tipoTag(listing.tipo))
    : CATEGORIA_LABELS[cat];

  return (
    <div className="az-detail-wrap">
      <button className="az-detail-back" onClick={onBack}>← Volver a los artículos</button>

      <div className="az-detail-layout">
        {/* Galería */}
        <div className="az-detail-gallery">
          <div className="az-detail-main-img">
            {fotos.length > 0
              ? <img src={fotos[idx]} alt={`${listing.marca} ${listing.modelo}`} />
              : <div className="az-detail-main-placeholder">⛳</div>
            }
          </div>
          {fotos.length > 1 && (
            <div className="az-detail-thumbs">
              {fotos.map((url, i) => (
                <img key={i} src={url} alt="" className={`az-detail-thumb${i === idx ? " active" : ""}`}
                  onClick={() => setIdx(i)} />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="az-detail-tipo">{typeTag} · {listing.marca}</div>
          <h1 className="az-detail-title">
            {listing.modelo}{cat === "palos" ? labelVersion(listing.version) : ""}
          </h1>
          <div className={`az-detail-price${listing.aConsultar ? " consultar" : ""}`}>
            {formatPrecio(listing)}
          </div>
          {listing.enElLocal && (
            <div className="az-detail-local">📍 En el local de Azalea</div>
          )}

          <div className="az-detail-specs">
            {cat === "palos" ? (
              <>
                {spec("Año", listing.anio)}
                {listing.numPalo && spec(listing.tipo === "madera" ? "Madera" : "Híbrido", `Nº ${listing.numPalo}`)}
                {spec("Condición", listing.estado)}
                {spec("Mano", listing.mano)}
                {listing.tipo === "putter" && spec("Estilo", listing.estiloPutter)}
                {spec("Flex", listing.flex)}
                {spec("Loft", listing.loft ? `${listing.loft}°` : null)}
                {spec("Material", listing.material)}
                {spec("Largo", listing.largo)}
                {spec("Bounce", listing.bounce ? `${listing.bounce}°` : null)}
                {spec("Grind", listing.grind)}
                {spec("Headcover", listing.headcover === true ? "Incluido" : null)}
                {listing.composicion?.length > 0 && spec("Set", formatComposicion(listing.composicion))}
                {spec("Departamento", listing.departamento)}
              </>
            ) : (
              <>
                {spec("Categoría", CATEGORIA_LABELS[cat])}
                {spec("Marca", listing.marca)}
                {listing.modelo && spec("Modelo", listing.modelo)}
                {spec("Condición", listing.estado)}
                {spec("Departamento", listing.departamento)}
              </>
            )}
          </div>

          {listing.descripcion && (
            <div className="az-detail-desc">{listing.descripcion}</div>
          )}

          <div className="az-detail-contact">
            <h4>¿Te interesa?</h4>
            <p>
              {listing.enElLocal
                ? "Este artículo está disponible en el local de Azalea Golf. Podés pasar a verlo y coordinamos una prueba en el simulador antes de decidir."
                : "Contactá a Azalea Golf para consultar disponibilidad y coordinar."
              }
            </p>
            <a className="az-modal-contact-link" href={contactHref} target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a4.56 4.56 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 .057C5.495.057.16 5.392.157 11.949c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0012 .057"/></svg>
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SUBCOMPONENT: AdminPanel
───────────────────────────────────────────────────────────── */
function AdminPanel() {
  const [adminUser, setAdminUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminTab, setAdminTab] = useState("pending");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingListing, setEditingListing] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setAdminUser(user);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  const loadAllListings = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "listings"));
      setListings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (adminUser) loadAllListings();
  }, [adminUser, loadAllListings]);

  const handleApprove = async (id) => {
    await updateDoc(doc(db, "listings", id), { status: "approved", approvedAt: serverTimestamp() });
    setListings(ls => ls.map(l => l.id === id ? { ...l, status: "approved" } : l));
  };

  const handleHide = async (id) => {
    await updateDoc(doc(db, "listings", id), { status: "hidden" });
    setListings(ls => ls.map(l => l.id === id ? { ...l, status: "hidden" } : l));
  };

  const handleUnhide = async (id) => {
    await updateDoc(doc(db, "listings", id), { status: "approved" });
    setListings(ls => ls.map(l => l.id === id ? { ...l, status: "approved" } : l));
  };

  const handleToggleLocal = async (listing) => {
    const next = !listing.enElLocal;
    await updateDoc(doc(db, "listings", listing.id), { enElLocal: next });
    setListings(ls => ls.map(l => l.id === listing.id ? { ...l, enElLocal: next } : l));
  };

  const handleMarkSold = async (listing) => {
    let msg = `¿Marcar "${listing.marca} ${listing.modelo}" como vendido?`;
    if (listing.enElLocal && listing.precio && !listing.aConsultar) {
      const comision = Math.round(listing.precio * 0.10);
      const neto     = listing.precio - comision;
      const prefix   = listing.moneda === "UYU" ? "$" : "US$";
      msg = `¿Marcar "${listing.marca} ${listing.modelo}" como vendido?\n\n` +
            `Precio de venta: ${prefix} ${listing.precio.toLocaleString("es-UY")}\n` +
            `Comisión Azalea (10%): ${prefix} ${comision.toLocaleString("es-UY")}\n` +
            `A transferir al vendedor: ${prefix} ${neto.toLocaleString("es-UY")}`;
    }
    if (!window.confirm(msg)) return;
    await updateDoc(doc(db, "listings", listing.id), { status: "sold", soldAt: serverTimestamp() });
    setListings(ls => ls.map(l => l.id === listing.id ? { ...l, status: "sold" } : l));
  };

  const handleSaveDatosBancarios = async (clientListings, value) => {
    await Promise.all(clientListings.map(l =>
      updateDoc(doc(db, "listings", l.id), { datosBancarios: value })
    ));
    setListings(ls => ls.map(l =>
      clientListings.some(cl => cl.id === l.id) ? { ...l, datosBancarios: value } : l
    ));
  };

  const handleDelete = async (listing) => {
    if (!window.confirm(`¿Eliminar "${listing.marca} ${listing.modelo}"?`)) return;
    await deleteDoc(doc(db, "listings", listing.id));
    setListings(ls => ls.filter(l => l.id !== listing.id));
  };

  const handleSaveEdit = async (id, approve, data) => {
    const update = approve
      ? { ...data, status: "approved", approvedAt: serverTimestamp() }
      : { ...data };
    await updateDoc(doc(db, "listings", id), update);
    setEditingListing(null);
    loadAllListings();
  };

  if (!authChecked) return <div className="az-loading-wrap"><div className="az-spinner" /></div>;
  if (!adminUser) return <AdminLogin />;

  const shown = listings.filter(l => l.status === adminTab);

  return (
    <div className="az-admin-page">
      <div className="az-admin-topbar">
        <h2>Panel de moderación</h2>
        <button className="az-btn-secondary" onClick={() => signOut(auth)}>Salir</button>
      </div>

      <div className="az-admin-tabs">
        {[
          ["pending",  "Pendientes"],
          ["approved", "Aprobados"],
          ["hidden",   "Ocultos"],
          ["sold",     "Vendidos"],
          ["local",    "En el local"],
        ].map(([val, lbl]) => {
          const count = val === "local"
            ? listings.filter(l => l.enElLocal && l.status !== "sold").length
            : listings.filter(l => l.status === val).length;
          return (
            <button key={val} className={`az-admin-tab${adminTab === val ? " active" : ""}`}
              onClick={() => setAdminTab(val)}>
              {lbl} ({count})
            </button>
          );
        })}
      </div>

      {loading
        ? <div className="az-loading-wrap"><div className="az-spinner" /></div>
        : adminTab === "local"
          ? <LocalRegister
              listings={listings.filter(l => l.enElLocal && l.status !== "sold")}
              onSaveDatosBancarios={handleSaveDatosBancarios}
              onEdit={setEditingListing}
            />
          : (() => {
              const shown = listings.filter(l => l.status === adminTab);
              return shown.length === 0
                ? <div className="az-empty"><p>No hay avisos en esta sección.</p></div>
                : (
                  <div className="az-admin-grid">
                    {shown.map(l => (
                      <AdminCard key={l.id} listing={l}
                        onApprove={handleApprove}
                        onMarkSold={handleMarkSold}
                        onHide={handleHide}
                        onUnhide={handleUnhide}
                        onToggleLocal={handleToggleLocal}
                        onDelete={handleDelete}
                        onEdit={setEditingListing}
                      />
                    ))}
                  </div>
                );
            })()
      }

      {editingListing && (
        <AdminEditModal listing={editingListing}
          onSave={handleSaveEdit}
          onClose={() => setEditingListing(null)} />
      )}
    </div>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (_) {
      setError("Credenciales inválidas");
    } finally { setLoading(false); }
  };

  return (
    <div className="az-admin-login-wrap">
      <h2>Admin</h2>
      <form onSubmit={login}>
        <div className="az-field">
          <label className="az-label">Email</label>
          <input className="az-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="az-field">
          <label className="az-label">Contraseña</label>
          <input className="az-input" type="password" value={pass} onChange={e => setPass(e.target.value)} required />
        </div>
        {error && <p className="az-error-msg" style={{ marginBottom: 12 }}>{error}</p>}
        <button className="az-btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

function AdminCard({ listing, onApprove, onMarkSold, onHide, onUnhide, onToggleLocal, onDelete, onEdit }) {
  const fotos = listing.fotos || [];
  const [activeIdx, setActiveIdx] = useState(0);
  const showApprove = listing.status === "pending";
  const cat = listing.categoria || "palos";

  return (
    <div className="az-admin-card">
      {/* Banner principal */}
      <div className="az-admin-card-banner" onClick={() => onEdit(listing)}>
        {fotos.length > 0
          ? <img src={fotos[activeIdx]} alt="" />
          : <div className="az-admin-card-banner-placeholder">⛳</div>
        }
        {fotos.length > 1 && (
          <span className="az-admin-card-photo-count">📷 {fotos.length}</span>
        )}
        {listing.status === "sold" && (
          <span className="az-admin-card-sold-badge">Vendido</span>
        )}
      </div>

      {/* Strip de miniaturas */}
      {fotos.length > 1 && (
        <div className="az-admin-card-strip">
          {fotos.map((url, i) => (
            <img key={i} src={url} alt=""
              className={`az-admin-card-strip-thumb${activeIdx === i ? " active" : ""}`}
              onClick={() => setActiveIdx(i)}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="az-admin-card-info">
        {cat !== "palos" && (
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#aaa", display: "block", marginBottom: 3 }}>
            {CATEGORIA_LABELS[cat]}
          </span>
        )}
        <strong>
          {cat === "palos"
            ? `${TIPO_LABELS[listing.tipo] ?? ""} ${listing.marca} ${listing.modelo}${labelVersion(listing.version)}`
            : `${listing.marca}${listing.modelo ? " " + listing.modelo : ""}`}
        </strong>
        <span>
          {cat === "palos"
            ? (listing.tipo === "madera" || listing.tipo === "hibrido") && listing.numPalo
              ? `Nº${listing.numPalo} · ${listing.estado} · ${listing.mano}`
              : listing.tipo === "putter" && listing.estiloPutter
              ? `${listing.estiloPutter} · ${listing.estado} · ${listing.mano}`
              : listing.tipo === "hierros" && listing.composicion?.length > 0
              ? `${formatComposicion(listing.composicion)} · ${listing.estado}`
              : `${listing.estado} · ${listing.mano} · ${listing.anio}`
            : listing.estado}
        </span>
        <div className="az-admin-card-price">{formatPrecio(listing)}</div>
      </div>

      <div className="az-admin-card-body">
        {cat === "palos" && listing.flex && <span>Flex: {listing.flex} &nbsp;</span>}
        {cat === "palos" && listing.loft && <span>Loft: {listing.loft}° &nbsp;</span>}
        {listing.departamento && <span>📍 {listing.departamento}</span>}
        <br />
        <strong>Vendedor:</strong> {listing.vendedor?.nombre} — {listing.vendedor?.contacto}
        <br />
        <span style={{ fontSize: 11, color: "#bbb" }}>
          {listing.createdAt?.toDate?.().toLocaleDateString("es-UY") ?? "Sin fecha"}
        </span>
      </div>

      <div className="az-admin-actions">
        {listing.status === "pending"  && <button className="az-admin-btn approve" onClick={() => onApprove(listing.id)}>Aprobar</button>}
        {listing.status === "approved" && <button className="az-admin-btn sold"    onClick={() => onMarkSold(listing)}>Vendido</button>}
        {listing.status === "approved" && <button className="az-admin-btn hide"    onClick={() => onHide(listing.id)}>Ocultar</button>}
        {listing.status === "hidden"   && <button className="az-admin-btn unhide"  onClick={() => onUnhide(listing.id)}>Publicar</button>}
        {(listing.status === "approved" || listing.status === "hidden") && (
          <button
            className={`az-admin-btn ${listing.enElLocal ? "local-on" : "local-off"}`}
            onClick={() => onToggleLocal(listing)}
            title={listing.enElLocal ? "Quitar del local" : "Marcar en el local"}
          >
            📍 {listing.enElLocal ? "En local" : "Local"}
          </button>
        )}
        <button className="az-admin-btn edit" onClick={() => onEdit(listing)}>Editar</button>
        <button className="az-admin-btn del"  onClick={() => onDelete(listing)}>Eliminar</button>
      </div>
    </div>
  );
}

function AdminEditModal({ listing, onSave, onClose }) {
  const cat = listing.categoria || "palos";
  const isPalosEdit = cat === "palos";
  const [form, setForm] = useState({
    tipo: listing.tipo || "", marca: listing.marca || "", modelo: listing.modelo || "",
    version: listing.version || "", anio: listing.anio ? String(listing.anio) : "",
    estado: listing.estado || "", mano: listing.mano || "", flex: listing.flex || "",
    loft: listing.loft ? String(listing.loft) : "", material: listing.material || "",
    largo: listing.largo || "", bounce: listing.bounce ? String(listing.bounce) : "",
    grind: listing.grind || "", headcover: listing.headcover || false,
    estiloPutter: listing.estiloPutter || "",
    numPalo: listing.numPalo || "",
    composicion: listing.composicion || [],
    aConsultar: listing.aConsultar || false, precio: listing.precio ? String(listing.precio) : "",
    moneda: listing.moneda || "USD",
    descripcion: listing.descripcion || "", departamento: listing.departamento || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Photo management
  const [existingPhotos, setExistingPhotos] = useState(listing.fotos || []);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const addFileRef = useRef();
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const removeExisting = (i) =>
    setExistingPhotos(p => p.filter((_, idx) => idx !== i));

  const setMainExisting = (i) => {
    if (i === 0) return;
    setExistingPhotos(p => {
      const next = [...p];
      const [item] = next.splice(i, 1);
      next.unshift(item);
      return next;
    });
  };

  const setMainNew = (i) => {
    setNewFiles(p => { const n=[...p]; const [f]=n.splice(i,1); n.unshift(f); return n; });
    setNewPreviews(p => { const n=[...p]; const [f]=n.splice(i,1); n.unshift(f); return n; });
  };

  const addNewFiles = (files) => {
    const valid = [...files].filter(f => f.type.startsWith("image/"))
      .slice(0, 8 - existingPhotos.length - newFiles.length);
    if (!valid.length) return;
    setNewFiles(p => [...p, ...valid]);
    setNewPreviews(p => [...p, ...valid.map(f => URL.createObjectURL(f))]);
  };

  const removeNew = (i) => {
    URL.revokeObjectURL(newPreviews[i]);
    setNewFiles(p => p.filter((_, idx) => idx !== i));
    setNewPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const save = async (approve) => {
    setSaving(true);
    try {
      let uploadedUrls = [];
      if (newFiles.length > 0) {
        setUploadProgress(`Subiendo ${newFiles.length} foto${newFiles.length > 1 ? "s" : ""}…`);
        uploadedUrls = await Promise.all(newFiles.map(f => uploadToCloudinary(f)));
      }
      const fotos = [...existingPhotos, ...uploadedUrls];
      const base = {
        marca: form.marca, modelo: form.modelo,
        estado: form.estado, aConsultar: form.aConsultar,
        precio: form.aConsultar ? null : Number(form.precio),
        moneda: form.aConsultar ? null : (form.moneda || "USD"),
        descripcion: form.descripcion || null, departamento: form.departamento, fotos,
      };
      const palosExtra = isPalosEdit ? {
        tipo: form.tipo, version: form.version,
        anio: Number(form.anio), mano: form.mano,
        flex: form.flex || null, loft: form.loft ? Number(form.loft) : null,
        material: form.material || null, largo: form.largo || null,
        bounce: form.bounce ? Number(form.bounce) : null, grind: form.grind || null,
        headcover: form.headcover,
        estiloPutter: form.estiloPutter || null,
        numPalo: form.numPalo || null,
        composicion: form.composicion.length > 0 ? form.composicion : null,
      } : {};
      await onSave(listing.id, approve, { ...base, ...palosExtra });
    } finally {
      setSaving(false);
      setUploadProgress("");
    }
  };

  return (
    <div className="az-edit-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="az-edit-modal">
        <button className="az-edit-close" onClick={onClose}>✕</button>
        <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>
          Editar y aprobar
          {cat !== "palos" && (
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", background: "#f0f0f0", color: "#767676", padding: "2px 10px", borderRadius: 3 }}>
              {CATEGORIA_LABELS[cat]}
            </span>
          )}
        </h3>

        {/* ── Fotos ── */}
        <div className="az-edit-photos">
          <label className="az-label" style={{ marginBottom: 10 }}>Fotos</label>
          <div className="az-edit-photos-grid">
            {existingPhotos.map((url, i) => (
              <div key={url} className="az-edit-photo-thumb">
                <img src={url} alt="" />
                {i === 0
                  ? <span className="az-photo-main-badge">Principal</span>
                  : <button className="az-edit-photo-set-main" onClick={() => setMainExisting(i)}>★ Principal</button>
                }
                <button className="az-edit-photo-rm" onClick={() => removeExisting(i)}>✕</button>
              </div>
            ))}
            {newPreviews.map((url, i) => (
              <div key={`new-${i}`} className="az-edit-photo-thumb">
                <img src={url} alt="" />
                {existingPhotos.length === 0 && i !== 0 && (
                  <button className="az-edit-photo-set-main" onClick={() => setMainNew(i)}>★ Principal</button>
                )}
                {existingPhotos.length === 0 && i === 0 && (
                  <span className="az-photo-main-badge">Principal</span>
                )}
                <button className="az-edit-photo-rm" onClick={() => removeNew(i)}>✕</button>
              </div>
            ))}
            {existingPhotos.length + newFiles.length < 8 && (
              <div className="az-edit-add-photo" onClick={() => addFileRef.current.click()}>+</div>
            )}
          </div>
          <input ref={addFileRef} type="file" accept="image/*" multiple hidden
            onChange={e => addNewFiles(e.target.files)} />
          <p style={{ fontSize: 12, color: "#aaa" }}>
            {existingPhotos.length + newFiles.length}/8 fotos · La primera es la principal
          </p>
          {uploadProgress && <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{uploadProgress}</p>}
        </div>

        {isPalosEdit && (
          <>
            <div className="az-form-row">
              <div className="az-field">
                <label className="az-label">Tipo</label>
                <select className="az-select" value={form.tipo} onChange={e => set("tipo", e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="az-field">
                <label className="az-label">Año</label>
                <input className="az-input" type="number" value={form.anio} onChange={e => set("anio", e.target.value)} />
              </div>
            </div>
            {/* Número de madera / híbrido */}
            {(form.tipo === "madera" || form.tipo === "hibrido") && (
              <div className="az-field" style={{ maxWidth: 220 }}>
                <label className="az-label">Número {form.tipo === "madera" ? "de madera" : "del híbrido"}</label>
                <select className="az-select" value={form.numPalo} onChange={e => set("numPalo", e.target.value)}>
                  <option value="">—</option>
                  {(form.tipo === "madera" ? MADERA_NUM_OPTS : HIBRIDO_NUM_OPTS).map(n => (
                    <option key={n} value={n}>{form.tipo === "madera" ? "Madera" : "Híbrido"} {n}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
        <div className="az-form-row">
          <div className="az-field">
            <label className="az-label">Marca</label>
            <input className="az-input" type="text" value={form.marca} onChange={e => set("marca", e.target.value)} />
          </div>
          <div className="az-field">
            <label className="az-label">Modelo</label>
            <input className="az-input" type="text" value={form.modelo} onChange={e => set("modelo", e.target.value)} />
          </div>
        </div>
        <div className="az-form-row">
          <div className="az-field">
            <label className="az-label">Estado</label>
            <select className="az-select" value={form.estado} onChange={e => set("estado", e.target.value)}>
              {ESTADO_OPTS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          {isPalosEdit && (
            <div className="az-field">
              <label className="az-label">Mano</label>
              <select className="az-select" value={form.mano} onChange={e => set("mano", e.target.value)}>
                {MANO_OPTS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          )}
        </div>
        {isPalosEdit && (
          <>
            {/* Hierros: composición */}
            {form.tipo === "hierros" && (
              <div className="az-field">
                <label className="az-label">Composición del set</label>
                <div className="az-iron-set">
                  {IRON_OPTS.map(iron => {
                    const sel = form.composicion.includes(iron);
                    return (
                      <label key={iron} className={`az-iron-chip${sel ? " sel" : ""}`}>
                        <input type="checkbox" checked={sel} onChange={e => {
                          const next = e.target.checked
                            ? [...form.composicion, iron]
                            : form.composicion.filter(i => i !== iron);
                          set("composicion", next);
                        }} />
                        {iron}
                      </label>
                    );
                  })}
                </div>
                {form.composicion.length >= 2 && (
                  <p className="az-iron-summary">Set: <strong>{formatComposicion(form.composicion)}</strong> ({form.composicion.length} palos)</p>
                )}
              </div>
            )}

            {/* Flex + Loft (no hierros, no putter para loft) */}
            <div className="az-form-row">
              {form.tipo !== "putter" && (
                <div className="az-field">
                  <label className="az-label">Flex <span className="opt">(opcional)</span></label>
                  <select className="az-select" value={form.flex} onChange={e => set("flex", e.target.value)}>
                    <option value="">—</option>
                    {FLEX_OPTS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              )}
              {form.tipo !== "hierros" && form.tipo !== "putter" && (
                <div className="az-field">
                  <label className="az-label">Loft <span className="opt">(opcional)</span></label>
                  {LOFT_OPTS[form.tipo]
                    ? <select className="az-select" value={form.loft} onChange={e => set("loft", e.target.value)}>
                        <option value="">—</option>
                        {LOFT_OPTS[form.tipo].map(v => <option key={v} value={v}>{v}°</option>)}
                      </select>
                    : <input className="az-input" type="number" step="0.5" value={form.loft} onChange={e => set("loft", e.target.value)} placeholder="—" />
                  }
                </div>
              )}
              {form.tipo === "putter" && (
                <div className="az-field">
                  <label className="az-label">Estilo <span className="opt">(opcional)</span></label>
                  <select className="az-select" value={form.estiloPutter} onChange={e => set("estiloPutter", e.target.value)}>
                    <option value="">—</option>
                    {PUTTER_ESTILO_OPTS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Wedge: bounce + grind */}
            {form.tipo === "wedge" && (
              <div className="az-form-row">
                <div className="az-field">
                  <label className="az-label">Bounce <span className="opt">(opcional)</span></label>
                  <select className="az-select" value={form.bounce} onChange={e => set("bounce", e.target.value)}>
                    <option value="">—</option>
                    {BOUNCE_OPTS.map(v => <option key={v} value={v}>{v}°</option>)}
                  </select>
                </div>
                <div className="az-field">
                  <label className="az-label">Grind <span className="opt">(opcional)</span></label>
                  <select className="az-select" value={form.grind} onChange={e => set("grind", e.target.value)}>
                    <option value="">—</option>
                    {GRIND_OPTS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Material + largo shaft (no putter) */}
            {form.tipo !== "putter" && (
              <div className="az-form-row">
                <div className="az-field">
                  <label className="az-label">Material del shaft <span className="opt">(opcional)</span></label>
                  <select className="az-select" value={form.material} onChange={e => set("material", e.target.value)}>
                    <option value="">—</option>
                    {MATERIAL_OPTS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="az-field">
                  <label className="az-label">Largo del shaft <span className="opt">(opcional)</span></label>
                  <select className="az-select" value={form.largo} onChange={e => set("largo", e.target.value)}>
                    <option value="">Standard</option>
                    {LARGO_OPTS.filter(o => o !== "Standard").map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Putter: largo en pulgadas */}
            {form.tipo === "putter" && (
              <div className="az-field" style={{ maxWidth: 200 }}>
                <label className="az-label">Largo del putter <span className="opt">(opcional)</span></label>
                <select className="az-select" value={form.largo} onChange={e => set("largo", e.target.value)}>
                  <option value="">—</option>
                  {PUTTER_LARGO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}

            {/* Headcover */}
            {["driver","madera","hibrido","putter"].includes(form.tipo) && (
              <div className="az-checkbox-row">
                <input type="checkbox" id="edit-headcover" checked={form.headcover}
                  onChange={e => set("headcover", e.target.checked)} />
                <label htmlFor="edit-headcover">Incluye headcover</label>
              </div>
            )}
          </>
        )}
        <div className="az-field">
          <label className="az-label">Descripción <span className="opt">(opcional)</span></label>
          <textarea className="az-textarea" value={form.descripcion} onChange={e => set("descripcion", e.target.value)} />
        </div>
        <div className="az-form-row">
          <div className="az-field">
            <label className="az-label">Departamento</label>
            <select className="az-select" value={form.departamento} onChange={e => set("departamento", e.target.value)}>
              <option value="">—</option>
              {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="az-field">
            <div className="az-checkbox-row" style={{ paddingTop: 28 }}>
              <input type="checkbox" id="edit-aConsultar" checked={form.aConsultar} onChange={e => set("aConsultar", e.target.checked)} />
              <label htmlFor="edit-aConsultar">A consultar</label>
            </div>
            {!form.aConsultar && (
              <>
                <div className="az-currency-row" style={{ marginTop: 8 }}>
                  {MONEDA_OPTS.map(m => (
                    <button key={m} type="button"
                      className={`az-currency-btn${form.moneda === m ? " active" : ""}`}
                      onClick={() => set("moneda", m)}>{m}</button>
                  ))}
                </div>
                <div className="az-price-input-wrap">
                  <span className="az-price-prefix">{form.moneda === "UYU" ? "$" : "US$"}</span>
                  <input className="az-input has-prefix" type="number" value={form.precio} onChange={e => set("precio", e.target.value)} />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="az-form-nav" style={{ paddingTop: 16, gap: 10 }}>
          <button className="az-btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="az-btn-secondary" onClick={() => save(false)} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button className="az-btn-primary" onClick={() => save(true)} disabled={saving}>
              {saving ? "Guardando…" : "Guardar y aprobar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const TIPO_FILTER = [
  { value: "driver", label: "Driver" },
  { value: "madera", label: "Madera" },
  { value: "hibrido", label: "Híbrido" },
  { value: "hierros", label: "Hierros" },
  { value: "wedge", label: "Wedge" },
  { value: "putter", label: "Putter" },
];

export default function PalosUsados() {
  // Routing
  const getInitialView = () => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "admin") return "admin";
    if (hash === "publicar") return "publicar";
    if (hash.startsWith("listing/")) return "detalle";
    return "ver";
  };
  const [view, setView] = useState(getInitialView);

  const navigateTo = (v, listingId = null) => {
    setView(v);
    if (v === "detalle" && listingId) window.location.hash = `listing/${listingId}`;
    else window.location.hash = v === "ver" ? "" : v;
  };

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "admin") { setView("admin"); return; }
      if (hash === "publicar") { setView("publicar"); return; }
      if (hash.startsWith("listing/")) { setView("detalle"); return; }
      setSelectedListing(null);
      setView("ver");
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  // Listings state (ver view)
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingsError, setListingsError] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [activeTab, setActiveTab] = useState("todos");
  const [sort, setSort] = useState("reciente");
  const [filters, setFilters] = useState({ categoria: [], tipo: [], marca: [], estado: [], flex: [], mano: "", precio: [], enElLocal: false });
  const [published, setPublished] = useState(false);
  const [page, setPage] = useState(1);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Footer accordion
  const [openSection, setOpenSection] = useState(null);
  const toggleSection = (key) => setOpenSection(p => p === key ? null : key);

  // Load listings from Firestore
  useEffect(() => {
    if (view !== "ver") return;
    setLoadingListings(true);
    setListingsError(null);
    const q = query(collection(db, "listings"), where("status", "==", "approved"));
    getDocs(q)
      .then(snap => setListings(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setListingsError("No se pudieron cargar los avisos. Intentá de nuevo."))
      .finally(() => setLoadingListings(false));
  }, [view]);

  // Filter helpers
  const clearFilters = () => { setFilters({ categoria: [], tipo: [], marca: [], estado: [], flex: [], mano: "", precio: [], enElLocal: false }); setPage(1); };

  // Determine if we're showing palos-only or mixed
  const showingOnlyNonPalos = filters.categoria.length > 0 && !filters.categoria.includes("palos");
  const RECIENTES_DAYS = 15;

  // Fetch listing from Firestore when arriving via direct URL
  useEffect(() => {
    if (view !== "detalle" || selectedListing) return;
    const hash = window.location.hash.replace("#", "");
    const id = hash.startsWith("listing/") ? hash.slice(8) : null;
    if (!id) { navigateTo("ver"); return; }
    getDoc(doc(db, "listings", id))
      .then(snap => {
        if (snap.exists() && snap.data().status === "approved")
          setSelectedListing({ id: snap.id, ...snap.data() });
        else navigateTo("ver");
      })
      .catch(() => navigateTo("ver"));
  }, [view, selectedListing]);

  const handleOpenListing = (l) => {
    setSelectedListing(l);
    navigateTo("detalle", l.id);
  };
  const handleCloseListing = () => {
    setSelectedListing(null);
    navigateTo("ver");
  };

  // Compute filtered + sorted listings
  const filteredListings = listings.filter(l => {
    const lCat = l.categoria || "palos";
    if (filters.categoria.length && !filters.categoria.includes(lCat)) return false;
    if (filters.marca.length && !filters.marca.includes(l.marca)) return false;
    if (filters.estado.length && !filters.estado.includes(l.estado)) return false;
    if (filters.enElLocal && !l.enElLocal) return false;
    if (filters.precio.length) {
      const matches = filters.precio.some(label => {
        const range = PRICE_RANGES.find(r => r.label === label);
        if (!range) return false;
        if (range.consultar) return l.aConsultar;
        if (l.aConsultar) return false;
        if (l.moneda === "UYU") return true;
        return l.precio >= range.min && l.precio < range.max;
      });
      if (!matches) return false;
    }
    if (!showingOnlyNonPalos) {
      if (filters.tipo.length && lCat === "palos" && !filters.tipo.includes(l.tipo)) return false;
      if (filters.flex.length && lCat === "palos" && !filters.flex.includes(l.flex)) return false;
      if (filters.mano && lCat === "palos" && l.mano !== filters.mano) return false;
    }
    if (activeTab === "recientes") {
      const cutoff = Date.now() - RECIENTES_DAYS * 24 * 60 * 60 * 1000;
      const ts = l.createdAt?.seconds ? l.createdAt.seconds * 1000 : 0;
      if (ts < cutoff) return false;
    }
    return true;
  });

  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sort === "precio-asc") return (a.precio ?? Infinity) - (b.precio ?? Infinity);
    if (sort === "precio-desc") return (b.precio ?? Infinity) - (a.precio ?? Infinity);
    return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
  });

  const paginatedListings = sortedListings.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = sortedListings.length > page * ITEMS_PER_PAGE;

  const toggleFilter = (key, val) => {
    setFilters(f => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
    setPage(1);
  };

  const availableMarcas = [...new Set(listings.map(l => l.marca))].sort();
  const estatusBadge = (e) => {
    const map = {
      "Como nuevo": "como-nuevo", "Muy bueno": "muy-bueno",
      "Bueno": "bueno", "Regular": "regular", "Para reparar": "para-reparar",
    };
    return map[e] ?? "bueno";
  };

  return (
    <>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      {view !== "admin" && (
        <header className="az-header">
          <div className="az-header-inner">
            <button className="az-burger" aria-label="Menú" onClick={() => setMobileNavOpen(true)}>
              <span /><span /><span />
            </button>
            <a href={WP} className="az-logo">
              <img src={LOGO_COLOR} alt="Azalea Golf" />
            </a>
            <div className="az-nav-wrapper">
              <ul className="az-nav">
                {NAV.map(l => (
                  <li key={l.label} className={l.active ? "active" : ""}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <button className="az-search-btn" aria-label="Buscar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
        </header>
      )}

      {/* ── MOBILE NAV ── */}
      {mobileNavOpen && (
        <>
          <div className="az-mobile-overlay" onClick={() => setMobileNavOpen(false)} />
          <nav className={`az-mobile-nav open`}>
            <button className="az-mobile-nav-close" onClick={() => setMobileNavOpen(false)}>✕</button>
            <ul>
              {NAV.map(l => (
                <li key={l.label} className={l.active ? "active" : ""}>
                  <a href={l.href} onClick={() => setMobileNavOpen(false)}>{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}

      {/* ── ADMIN VIEW ── */}
      {view === "admin" && <AdminPanel />}

      {/* ── PUBLIC VIEWS ── */}
      {view !== "admin" && (
        <>

          {/* View toggle */}
          <div className="az-view-bar">
            <div className="az-view-bar-inner">
              <button
                className={`az-view-tab${view === "ver" ? " active" : ""}`}
                onClick={() => navigateTo("ver")}
              >
                Ver artículos usados
              </button>
              <button
                className={`az-view-tab${view === "publicar" ? " active" : ""}`}
                onClick={() => { setPublished(false); navigateTo("publicar"); }}
              >
                Publicar un artículo
              </button>
            </div>
          </div>

          {/* ── VER PALOS ── */}
          {view === "ver" && (
            <div className="az-layout">
              {/* Sidebar */}
              <aside className="az-sidebar">
                <div className="az-filter-section">
                  <div className="az-filter-section-title">Categoría</div>
                  <ul className="az-filter-list">
                    {CATEGORIA_OPTS.map(cat => (
                      <li key={cat} onClick={() => toggleFilter("categoria", cat)}>
                        <input type="checkbox" checked={filters.categoria.includes(cat)} readOnly />
                        <label>{CATEGORIA_LABELS[cat]}</label>
                      </li>
                    ))}
                  </ul>
                  <div className="az-filter-actions">
                    <button className="az-filter-btn secondary" onClick={() => setFilters(f => ({ ...f, categoria: [] }))}>Limpiar</button>
                  </div>
                </div>

                {!showingOnlyNonPalos && (
                <div className="az-filter-section">
                  <div className="az-filter-section-title">Tipo</div>
                  <ul className="az-filter-list">
                    {TIPO_FILTER.map(({ value, label }) => (
                      <li key={value} onClick={() => toggleFilter("tipo", value)}>
                        <input type="checkbox" checked={filters.tipo.includes(value)} readOnly />
                        <label>{label}</label>
                      </li>
                    ))}
                  </ul>
                  <div className="az-filter-actions">
                    <button className="az-filter-btn secondary" onClick={() => setFilters(f => ({ ...f, tipo: [] }))}>Limpiar</button>
                  </div>
                </div>
                )}

                <div className="az-filter-section">
                  <div className="az-filter-section-title">Marcas</div>
                  <ul className="az-filter-list">
                    {availableMarcas.map(m => (
                      <li key={m} onClick={() => toggleFilter("marca", m)}>
                        <input type="checkbox" checked={filters.marca.includes(m)} readOnly />
                        <label>{m}</label>
                      </li>
                    ))}
                  </ul>
                  <div className="az-filter-actions">
                    <button className="az-filter-btn secondary" onClick={() => setFilters(f => ({ ...f, marca: [] }))}>Limpiar</button>
                  </div>
                </div>

                <div className="az-filter-section">
                  <div className="az-filter-section-title">Estado</div>
                  <ul className="az-filter-list">
                    {ESTADO_OPTS.map(e => (
                      <li key={e} onClick={() => toggleFilter("estado", e)}>
                        <input type="checkbox" checked={filters.estado.includes(e)} readOnly />
                        <label>{e}</label>
                      </li>
                    ))}
                  </ul>
                </div>

                {!showingOnlyNonPalos && (
                <>
                <div className="az-filter-section">
                  <div className="az-filter-section-title">Flex</div>
                  <ul className="az-filter-list">
                    {FLEX_OPTS.map(f => (
                      <li key={f} onClick={() => toggleFilter("flex", f)}>
                        <input type="checkbox" checked={filters.flex.includes(f)} readOnly />
                        <label>{f}</label>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="az-filter-section">
                  <div className="az-filter-section-title">Mano</div>
                  <ul className="az-filter-list">
                    {MANO_OPTS.map(m => (
                      <li key={m} onClick={() => setFilters(f => ({ ...f, mano: f.mano === m ? "" : m }))}>
                        <input type="checkbox" checked={filters.mano === m} readOnly />
                        <label>{m}</label>
                      </li>
                    ))}
                  </ul>
                </div>
                </>
                )}

                <div className="az-filter-section">
                  <div className="az-filter-section-title">Precio</div>
                  <ul className="az-filter-list">
                    {PRICE_RANGES.map(r => (
                      <li key={r.label} onClick={() => toggleFilter("precio", r.label)}>
                        <input type="checkbox" checked={filters.precio.includes(r.label)} readOnly />
                        <label>{r.label}</label>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="az-filter-section">
                  <div className="az-filter-section-title">Disponibilidad</div>
                  <ul className="az-filter-list">
                    <li onClick={() => setFilters(f => ({ ...f, enElLocal: !f.enElLocal }))}>
                      <input type="checkbox" checked={filters.enElLocal} readOnly />
                      <label>En el local de Azalea</label>
                    </li>
                  </ul>
                </div>

                <div className="az-filter-actions">
                  <button className="az-filter-btn secondary" style={{ flex: "none", width: "100%" }} onClick={clearFilters}>
                    Limpiar todos
                  </button>
                </div>
              </aside>

              {/* Results */}
              <section className="az-results">
                <div className="az-tabs">
                  <div className={`az-tab${activeTab === "todos" ? " active" : ""}`}
                    onClick={() => { setActiveTab("todos"); setPage(1); }}>Todos</div>
                  <div className={`az-tab${activeTab === "recientes" ? " active" : ""}`}
                    onClick={() => { setActiveTab("recientes"); setPage(1); }}>
                    Últimos {RECIENTES_DAYS} días
                  </div>
                </div>

                <div className="az-results-bar">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="az-results-count">
                      <strong>{sortedListings.length}</strong> resultado{sortedListings.length !== 1 ? "s" : ""}
                    </span>
                    <button className="az-mobile-filter-btn" onClick={() => setMobileFiltersOpen(true)}>
                      <svg viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
                      Filtros
                    </button>
                  </div>
                  <select className="az-sort" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
                    <option value="reciente">Más reciente</option>
                    <option value="precio-asc">Precio: menor a mayor</option>
                    <option value="precio-desc">Precio: mayor a menor</option>
                  </select>
                </div>

                {loadingListings && <div className="az-loading-wrap"><div className="az-spinner" /></div>}
                {listingsError && <div className="az-empty"><p>{listingsError}</p></div>}

                {!loadingListings && !listingsError && sortedListings.length === 0 && (
                  <div className="az-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <p>No hay artículos disponibles con estos filtros.</p>
                  </div>
                )}

                {!loadingListings && !listingsError && sortedListings.length > 0 && (
                  <>
                  <div className="az-grid">
                    {paginatedListings.map(l => {
                      const lCat = l.categoria || "palos";
                      const cardTypeTag = lCat === "palos"
                        ? (l.tipo === "wedge" && l.loft ? `Wedge ${l.loft}°` : tipoTag(l.tipo))
                        : CATEGORIA_LABELS[lCat];
                      return (
                        <div className="az-card" key={l.id} onClick={() => handleOpenListing(l)}>
                          <div className="az-card-img">
                            {l.fotos?.[0]
                              ? <img src={l.fotos[0]} alt={`${l.marca} ${l.modelo}`} />
                              : <span className="az-card-img-placeholder">⛳</span>
                            }
                          </div>
                          <div className="az-card-body">
                            <div className="az-card-tipo-tag">{cardTypeTag}</div>
                            <div className="az-card-brand">{l.marca}</div>
                            <div className="az-card-title">
                              {l.modelo}{lCat === "palos" ? labelVersion(l.version) : ""}
                            </div>
                            {lCat === "palos" ? (
                              <div className="az-card-meta">
                                {l.tipo === "hierros" && l.composicion?.length > 0
                                  ? `${formatComposicion(l.composicion)} · ${l.mano}`
                                  : l.tipo === "madera" || l.tipo === "hibrido"
                                  ? [l.numPalo && `Nº${l.numPalo}`, l.mano].filter(Boolean).join(" · ")
                                  : [l.anio, l.mano, l.flex].filter(Boolean).join(" · ")
                                }
                              </div>
                            ) : l.estado ? <div className="az-card-meta">{l.estado}</div> : null}
                            <div className={`az-card-price${l.aConsultar ? " consultar" : ""}`}>{formatPrecio(l)}</div>
                            <div className={`az-card-estado ${estatusBadge(l.estado)}`}>{l.estado}</div>
                            {l.enElLocal && <div className="az-card-local-badge">En el local</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {hasMore && (
                    <button className="az-ver-mas" onClick={() => setPage(p => p + 1)}>
                      Ver más ({sortedListings.length - page * ITEMS_PER_PAGE} restantes)
                    </button>
                  )}
                  </>
                )}
              </section>
            </div>
          )}

          {/* ── DETALLE ── */}
          {view === "detalle" && (
            selectedListing
              ? <ListingDetail listing={selectedListing} onBack={handleCloseListing} />
              : <div className="az-loading-wrap"><div className="az-spinner" /></div>
          )}

          {/* ── PUBLICAR ── */}
          {view === "publicar" && (
            published
              ? (
                <div className="az-success-wrap" style={{ marginTop: 60 }}>
                  <div className="az-success-icon">✓</div>
                  <h2>¡Aviso enviado!</h2>
                  <p>Lo revisaremos y lo publicaremos en breve.</p>
                  <p style={{ fontSize: 14, marginTop: -10 }}>
                    ¿Necesitás modificar o dar de baja el aviso?{" "}
                    <a
                      href={`https://wa.me/${AZALEA_WA}?text=${encodeURIComponent("Hola, quisiera modificar/eliminar mi aviso en la sección de usados de Azalea.")}`}
                      target="_blank" rel="noreferrer"
                      className="az-success-wa"
                      style={{ display: "inline-flex", marginLeft: 4 }}
                    >
                      Escribinos por WhatsApp
                    </a>
                  </p>
                  <button className="az-btn-primary" onClick={() => { setPublished(false); navigateTo("ver"); }}>
                    Ver artículos usados
                  </button>
                </div>
              )
              : <PublicarForm onSuccess={() => setPublished(true)} />
          )}

          {/* ── FOOTER ── */}
          <footer className="az-footer">
            <div className="az-footer-inner">
              <div className="az-footer-logo-col">
                <div className="az-footer-logo">
                  <img src={LOGO_WHITE} alt="Azalea Golf" />
                </div>
              </div>

              <div className="az-footer-col">
                <div className="az-footer-col-header" onClick={() => toggleSection("productos")}>
                  <h4>Productos</h4>
                  <span className={`az-footer-chevron${openSection === "productos" ? " open" : ""}`}>▾</span>
                </div>
                <div className={`az-footer-col-body${openSection === "productos" ? " open" : ""}`}>
                  <ul>{PRODUCTS_FOOTER.map(l => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}</ul>
                </div>
              </div>

              <div className="az-footer-col">
                <div className="az-footer-col-header" onClick={() => toggleSection("paginas")}>
                  <h4>Páginas</h4>
                  <span className={`az-footer-chevron${openSection === "paginas" ? " open" : ""}`}>▾</span>
                </div>
                <div className={`az-footer-col-body${openSection === "paginas" ? " open" : ""}`}>
                  <ul>{PAGES_FOOTER.map(l => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}</ul>
                </div>
              </div>

              <div className="az-footer-col az-footer-col--split">
                <div className="az-footer-col-section">
                  <div className="az-footer-col-header" onClick={() => toggleSection("local")}>
                    <h4>Local y horario</h4>
                    <span className={`az-footer-chevron${openSection === "local" ? " open" : ""}`}>▾</span>
                  </div>
                  <div className={`az-footer-col-body${openSection === "local" ? " open" : ""}`}>
                    <p>Arocena 1572, Montevideo<br />(lunes a viernes de 13hs a 20hs)</p>
                  </div>
                </div>
                <div className="az-footer-col-section">
                  <div className="az-footer-col-header" onClick={() => toggleSection("contacto")}>
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

            <div className="az-footer-bottom">
              <p>©2025 Azalea Golf | Todos los derechos reservados</p>
              <div className="az-footer-simbionte-logo">
                <a href="https://www.simbiontecreativo.com" target="_blank" rel="noreferrer">
                  <img src="https://azaleasports.com.uy/wp-content/uploads/2024/03/simbionte-creativo-logo-monocolor.png" alt="Simbionte Creativo" />
                </a>
              </div>
              <p>Diseño y desarrollo: <a href="https://www.simbiontecreativo.com" target="_blank" rel="noreferrer">Simbionte Creativo</a></p>
            </div>
          </footer>
        </>
      )}

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <>
          <div className="az-filter-drawer-overlay" onClick={() => setMobileFiltersOpen(false)} />
          <div className="az-filter-drawer">
            <div className="az-filter-drawer-header">
              <h3>Filtros</h3>
              <button className="az-filter-drawer-close" onClick={() => setMobileFiltersOpen(false)}>✕</button>
            </div>

            <div className="az-filter-section">
              <div className="az-filter-section-title">Categoría</div>
              <ul className="az-filter-list">
                {CATEGORIA_OPTS.map(cat => (
                  <li key={cat} onClick={() => toggleFilter("categoria", cat)}>
                    <input type="checkbox" checked={filters.categoria.includes(cat)} readOnly />
                    <label>{CATEGORIA_LABELS[cat]}</label>
                  </li>
                ))}
              </ul>
            </div>
            {!showingOnlyNonPalos && (
              <div className="az-filter-section">
                <div className="az-filter-section-title">Tipo</div>
                <ul className="az-filter-list">
                  {TIPO_FILTER.map(({ value, label }) => (
                    <li key={value} onClick={() => toggleFilter("tipo", value)}>
                      <input type="checkbox" checked={filters.tipo.includes(value)} readOnly />
                      <label>{label}</label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="az-filter-section">
              <div className="az-filter-section-title">Marcas</div>
              <ul className="az-filter-list">
                {availableMarcas.map(m => (
                  <li key={m} onClick={() => toggleFilter("marca", m)}>
                    <input type="checkbox" checked={filters.marca.includes(m)} readOnly />
                    <label>{m}</label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="az-filter-section">
              <div className="az-filter-section-title">Estado</div>
              <ul className="az-filter-list">
                {ESTADO_OPTS.map(e => (
                  <li key={e} onClick={() => toggleFilter("estado", e)}>
                    <input type="checkbox" checked={filters.estado.includes(e)} readOnly />
                    <label>{e}</label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="az-filter-section">
              <div className="az-filter-section-title">Precio</div>
              <ul className="az-filter-list">
                {PRICE_RANGES.map(r => (
                  <li key={r.label} onClick={() => toggleFilter("precio", r.label)}>
                    <input type="checkbox" checked={filters.precio.includes(r.label)} readOnly />
                    <label>{r.label}</label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="az-filter-section">
              <div className="az-filter-section-title">Disponibilidad</div>
              <ul className="az-filter-list">
                <li onClick={() => setFilters(f => ({ ...f, enElLocal: !f.enElLocal }))}>
                  <input type="checkbox" checked={filters.enElLocal} readOnly />
                  <label>En el local de Azalea</label>
                </li>
              </ul>
            </div>
            <button className="az-filter-btn primary" style={{ width: "100%", marginTop: 8 }}
              onClick={() => setMobileFiltersOpen(false)}>
              Ver resultados ({sortedListings.length})
            </button>
            <button className="az-filter-btn secondary" style={{ width: "100%", marginTop: 8 }}
              onClick={() => { clearFilters(); setMobileFiltersOpen(false); }}>
              Limpiar todos
            </button>
          </div>
        </>
      )}
    </>
  );
}
