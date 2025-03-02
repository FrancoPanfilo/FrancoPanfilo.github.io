const catalogo = [
  {
    codigo: "S1C1",
    imagen1: "../img/S1C1-1.jpeg",
    imagen2: "../img/S1C1-2.jpeg",
    imagen3: "../img/S1C1-3.jpeg",
    imagen4: "../img/S1C1-4.jpg",
    Titulo: "Season 1 - Chapter 1",
    Descripcion:
      "Camiseta negra de calidad superior, confeccionada con materiales suaves y resistentes. Su color profundo y acabado impecable la convierten en un básico esencial, fácil de combinar y perfecto para cualquier ocasión. Comodidad y estilo en una sola prenda.",

    Precio: "1190 $",
    Talles: ["S", "M", "L", "XL", "XXL"],
  },
  {
    codigo: "S1C2",
    imagen1: "../img/S1C2-1.JPG",
    imagen2: "../img/S1C2-2.JPG",
    imagen3: "../img/S1C2-3.jpeg",
    imagen4: "../img/S1C2-4.jpg",

    Titulo: "Season 1 - Chapter 2",
    Descripcion:
      "Camiseta crema de calidad premium, confeccionada con telas suaves y duraderas. Su tono neutro y elegante la convierte en una prenda versátil, ideal para combinar en cualquier ocasión.",

    Precio: "1190 $",
    Talles: ["S", "M", "L", "XL", "XXL"],
  },
  {
    codigo: "S1C3",
    imagen1: "https://example.com/product3_img1.jpg",
    imagen2: "https://example.com/product3_img2.jpg",
    imagen3: "https://example.com/product3_img3.jpg",
    imagen4: "https://example.com/product3_img4.jpg",
    imagen5: "https://example.com/product3_img5.jpg",
    Titulo: "Season 1 - Chapter 3",
    Descripcion: "Sudadera cómoda para entrenamiento",
    Precio: "1190 $",
    Talles: ["S", "M", "L", "XL", "XXL"],
  },
];
const urlParams = new URLSearchParams(window.location.search);
const remera = urlParams.get("Remera"); // "S1C1"

const producto = catalogo.find((producto) => producto.codigo === remera);
const titulo = document.getElementById("titulo");
const descripcion = document.getElementById("descripcion");
const precio = document.getElementById("precio");
const talles = document.getElementById("talles");
const imagen1 = document.getElementById("imagen1");
const imagen2 = document.getElementById("imagen2");
const imagen3 = document.getElementById("imagen3");
const imagen4 = document.getElementById("imagen4");
const label1 = document.getElementById("label1");
const label2 = document.getElementById("label2");
const label3 = document.getElementById("label3");
const label4 = document.getElementById("label4");
titulo.innerHTML = producto.Titulo;
descripcion.innerHTML = producto.Descripcion;
precio.innerHTML = producto.Precio;
producto.Talles.forEach((talle) => {
  const option = document.createElement("option");
  option.value = talle;
  option.text = talle;
  talles.appendChild(option);
});
imagen1.src = producto.imagen1;
imagen2.src = producto.imagen2;
imagen3.src = producto.imagen3;
imagen4.src = producto.imagen4;
label1.src = producto.imagen1;
label2.src = producto.imagen2;
label3.src = producto.imagen3;
label4.src = producto.imagen4;

document.getElementById("compra").addEventListener("click", comprar);
function comprar() {
  // Construye la URL de Instagram Direct con el mensaje
  const message = encodeURIComponent(
    "Hola! Estoy interesado/a en la remera " +
      producto.Titulo +
      " en talle " +
      talles.value
  );
  const instagramUrl = `https://www.instagram.com/direct/t/limitless_uy/?message=${message}`;

  // Redirige a la URL
  window.location.href = instagramUrl;
}
