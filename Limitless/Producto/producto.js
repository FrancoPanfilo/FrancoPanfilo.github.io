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
const imagenPre = document.getElementById("imagenPre");
const imagenActiva = document.getElementById("imagenActiva");
const imagenPost = document.getElementById("imagenPost");

titulo.innerHTML = producto.Titulo;
descripcion.innerHTML = producto.Descripcion;
precio.innerHTML = producto.Precio;
producto.Talles.forEach((talle) => {
  const option = document.createElement("option");
  option.value = talle;
  option.text = talle;
  talles.appendChild(option);
});
imagenPre.src = producto.imagen4;
imagenActiva.src = producto.imagen1;
imagenPost.src = producto.imagen2;
function extraerRutaImagen(cadena) {
  const index = cadena.indexOf("/img");
  if (index !== -1) {
    return "../" + cadena.slice(index + 1);
  }
  return ""; // Devuelve una cadena vacía si no se encuentra "/img"
}
document.getElementById("fIzq").addEventListener("click", () => {
  let ruta = extraerRutaImagen(imagenActiva.src);

  if (ruta === producto.imagen1) {
    imagenActiva.src = producto.imagen4;
    imagenPre.src = producto.imagen3;
    imagenPost.src = producto.imagen1;
  } else if (ruta === producto.imagen2) {
    imagenActiva.src = producto.imagen1;
    imagenPre.src = producto.imagen4;
    imagenPost.src = producto.imagen2;
  } else if (ruta === producto.imagen3) {
    imagenActiva.src = producto.imagen2;
    imagenPre.src = producto.imagen1;
    imagenPost.src = producto.imagen3;
  } else if (ruta === producto.imagen4) {
    imagenActiva.src = producto.imagen3;
    imagenPre.src = producto.imagen2;
    imagenPost.src = producto.imagen4;
  }
});
document.getElementById("fDer").addEventListener("click", () => {
  let ruta = extraerRutaImagen(imagenActiva.src);
  if (ruta === producto.imagen1) {
    imagenActiva.src = producto.imagen2;
    imagenPre.src = producto.imagen1;
    imagenPost.src = producto.imagen3;
  } else if (ruta === producto.imagen2) {
    imagenActiva.src = producto.imagen3;
    imagenPre.src = producto.imagen2;
    imagenPost.src = producto.imagen4;
  } else if (ruta === producto.imagen3) {
    imagenActiva.src = producto.imagen4;
    imagenPre.src = producto.imagen3;
    imagenPost.src = producto.imagen1;
  } else if (ruta === producto.imagen4) {
    imagenActiva.src = producto.imagen1;
    imagenPre.src = producto.imagen4;
    imagenPost.src = producto.imagen2;
  }
});
document.getElementById("compra").addEventListener("click", comprar);
function comprar() {
  // Construye la URL de Instagram Direct con el mensaje
  const message = encodeURIComponent(
    "Hola! Estoy interesado/a en la remera " +
      producto.Titulo +
      " en talle " +
      talles.value
  );
  const appUrl = `https://wa.me/<número>?text=${message}`;
  // URL fallback para la web con ig.me
  const webUrl = `https://wa.me/59898731913?text=${message}`;

  // Intenta abrir la app primero
  window.location.href = appUrl;

  // Fallback a la web si la app no se abre después de 2 segundos
  setTimeout(() => {
    if (document.hidden) {
      // Si la app se abrió, la pestaña está en segundo plano, no hacemos nada
      return;
    }
    window.location.href = webUrl;
  }, 2000);
}

//nuevo
const activeImage = document.querySelector(".product-image .active");
const productImages = document.querySelectorAll(".image-list img");
const navItem = document.querySelector("a.toggle-nav");

function changeImage(e) {
  activeImage.src = e.target.src;
}
