const mobileNav = document.querySelector(".hamburger");
const navbar = document.querySelector(".menubar");

const toggleNav = () => {
  navbar.classList.toggle("active");
  mobileNav.classList.toggle("hamburger-active");
};
mobileNav.addEventListener("click", () => toggleNav());
function sendEmail(event) {
  event.preventDefault();
  const message = document.getElementById("message").value;
  const email = "contacto.limitlessuy@gmail.com";
  window.location.href = `mailto:${email}?subject=Contacto&body=${encodeURIComponent(
    message
  )}`;
}
const productos = [
  ["img/S1C1-1.jpg", "img/S1C1-2.jpg", "img/S1C1-3.jpeg", "img/S1C1-4.jpg"],
  ["img/S1C2-1.jpeg", "img/S1C2-2.jpeg", "img/S1C2-3.jpeg", "img/S1C2-4.jpeg"],
];

let productoActual = 0;
let imagenActual = 0;

function verProducto(index) {
  productoActual = index;
  imagenActual = 0;
  document.getElementById("catalogo").style.display = "none";
  document.getElementById("producto").style.display = "block";
  document.getElementById("imagenProducto").src =
    productos[productoActual][imagenActual];
}

function cambiarImagen(direccion) {
  imagenActual += direccion;
  if (imagenActual < 0) {
    imagenActual = productos[productoActual].length - 1;
  } else if (imagenActual >= productos[productoActual].length) {
    imagenActual = 0;
  }
  document.getElementById("imagenProducto").src =
    productos[productoActual][imagenActual];
}

function volverCatalogo() {
  document.getElementById("catalogo").style.display = "flex";
  document.getElementById("producto").style.display = "none";
}
