// Aquí puedes agregar la funcionalidad para las animaciones
document.addEventListener("DOMContentLoaded", () => {
  // Ejemplo de desplazamiento suave
  const links = document.querySelectorAll("nav a");
  links.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      target.scrollIntoView({ behavior: "smooth" });
    });
  });
});
