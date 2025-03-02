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
