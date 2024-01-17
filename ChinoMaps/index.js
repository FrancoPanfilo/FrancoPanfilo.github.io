let map;

function initMap() {
  // Configura las coordenadas iniciales del mapa
  const initialLatLng = { lat: 0, lng: 0 };

  // Crea un nuevo mapa centrado en las coordenadas iniciales
  map = new google.maps.Map(document.getElementById("main-container"), {
    center: initialLatLng,
    zoom: 15, // Ajusta el nivel de zoom según sea necesario
  });
}

function showConfirmationButton() {
  // Llama a la función para inicializar el mapa al presionar el botón
  initMap();

  var confirmationButton = document.getElementById("confirmation-button");
  confirmationButton.classList.remove("oculto");
  confirmationButton.classList.add("noOculto");
}

function confirmAction() {
  // Acciones a realizar al confirmar
  alert("Acción confirmada");
}
