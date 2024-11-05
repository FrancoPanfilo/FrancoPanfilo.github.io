// script.js
document.addEventListener("DOMContentLoaded", () => {
  const mainImage = document.getElementById("mainImage1");
  const thumbnails = document.querySelectorAll(".thumbnail1");

  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener("click", () => {
      // Intercambiar la imagen principal con la miniatura seleccionada
      const mainSrc = mainImage.src;
      mainImage.src = thumbnail.src;
      thumbnail.src = mainSrc;
    });
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const mainImage = document.getElementById("mainImage2");
  const thumbnails = document.querySelectorAll(".thumbnail2");

  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener("click", () => {
      // Intercambiar la imagen principal con la miniatura seleccionada
      const mainSrc = mainImage.src;
      mainImage.src = thumbnail.src;
      thumbnail.src = mainSrc;
    });
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const mainImage = document.getElementById("mainImage3");
  const thumbnails = document.querySelectorAll(".thumbnail3");

  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener("click", () => {
      // Intercambiar la imagen principal con la miniatura seleccionada
      const mainSrc = mainImage.src;
      mainImage.src = thumbnail.src;
      thumbnail.src = mainSrc;
    });
  });
});
