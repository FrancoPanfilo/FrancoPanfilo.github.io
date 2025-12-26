/**
 * Navbar/Navigation Functionality
 * Archivo centralizado para la funcionalidad del navbar
 * Utilizado en todas las páginas de la aplicación
 */

// Toggle para el menú móvil
function toggleMobileMenu() {
  const nav = document.querySelector(".nav");
  const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");

  if (nav && mobileMenuToggle) {
    nav.classList.toggle("active");
    mobileMenuToggle.classList.toggle("active");
  }
}

// Cerrar menú móvil cuando se hace click en un enlace
function closeMobileMenuOnLink() {
  const nav = document.querySelector(".nav");
  const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (nav) {
        nav.classList.remove("active");
      }
      if (mobileMenuToggle) {
        mobileMenuToggle.classList.remove("active");
      }
    });
  });
}

// Agregar efecto de scroll al header
function addHeaderScrollEffect() {
  const header = document.querySelector(".header");

  if (header) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 0) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    });
  }
}

// Inicializar la navbar
function initNavbar() {
  const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", toggleMobileMenu);
  }

  closeMobileMenuOnLink();
  addHeaderScrollEffect();
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNavbar);
} else {
  initNavbar();
}
