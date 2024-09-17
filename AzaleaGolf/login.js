let qi10 = localStorage.getItem("qi10");

let d = document.getElementById("acceso");
console.log(d);
d.addEventListener("click", function iSSS() {
  console.log("object");
  let i = prompt("Ingrese la contraseña");
  localStorage.setItem("qi10", i);
});
