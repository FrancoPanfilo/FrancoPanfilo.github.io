let map;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 0, lng: 0 },
    zoom: 2,
  });
}

function showConfirmationButton() {
  const addressInput = document.getElementById("address-input");
  const address = addressInput.value;

  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: address }, function (results, status) {
    if (status === "OK" && results[0]) {
      map.setCenter(results[0].geometry.location);
      map.setZoom(15);

      const marker = new google.maps.Marker({
        map: map,
        position: results[0].geometry.location,
        title: "Ubicación",
      });

      document.getElementById("map-container").classList.remove("oculto");
    } else {
      alert("No se pudo geocodificar la dirección.");
    }
  });

  const confirmationButton = document.getElementById("confirmation-button");
  confirmationButton.classList.remove("oculto");
  confirmationButton.classList.add("noOculto");
}

function confirmAction() {
  // Acciones a realizar al confirmar
  alert("Acción confirmada");
}
