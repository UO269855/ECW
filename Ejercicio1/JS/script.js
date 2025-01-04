// Inicializamos el mapa
var map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

var markers = [];

function showLoadingOverlay() {
  document.getElementById("loadingOverlay").style.display = "flex";
}

function hideLoadingOverlay() {
  document.getElementById("loadingOverlay").style.display = "none";
}

/**
 * Función que indica el continente donde se ha producido el terremoto
 * @param {*} lat latitud del epicentro del terremoto
 * @param {*} lng longitud del epicentro del terremoto
 * @returns Continente donde está el epicentro
 */
function getContinent(lat, lng) {
  if (lat >= -37 && lat <= 37 && lng >= -18 && lng <= 51) {
    return "Africa";
  }

  if (lat >= -90 && lat <= -60 && lng >= -180 && lng <= 180) {
    return "Antartida";
  }

  if (lat >= 10 && lat <= 80 && lng >= 26 && lng <= 180) {
    return "Asia";
  }

  if (lat >= -55 && lat <= -10 && lng >= 112 && lng <= 180) {
    return "Australia/Oceanía";
  }

  if (lat >= 34 && lat <= 71 && lng >= -25 && lng <= 45) {
    return "Europa";
  }

  if (lat >= -60 && lat <= 83 && lng >= -180 && lng <= -35) {
    return "America";
  }

  return "Desconocido";
}

/**
 * Función que parsea un fichero quakeML para recuperar su información
 * @param {*} quakeML XML con los datos del terremoto
 * @returns Lista con los epicentros de los terremotos
 */
function parseQuakeML(quakeML) {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(quakeML, "application/xml");
  var nsResolver = function (prefix) {
    var ns = { q: "http://quakeml.org/xmlns/bed/1.2" };
    return ns[prefix] || null;
  };

  var events = xmlDoc.evaluate(
    "//q:event",
    xmlDoc,
    nsResolver,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  var epicenters = [];

  for (var i = 0; i < events.snapshotLength; i++) {
    var event = events.snapshotItem(i);
    var origin = xmlDoc.evaluate(
      ".//q:origin",
      event,
      nsResolver,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    var magnitudeElement = xmlDoc.evaluate(
      ".//q:magnitude",
      event,
      nsResolver,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    var descriptionElement = xmlDoc.evaluate(
      ".//q:description",
      event,
      nsResolver,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    var depthElement = xmlDoc.evaluate(
      ".//q:depth/q:value",
      origin,
      nsResolver,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    var timeElement = xmlDoc.evaluate(
      ".//q:time/q:value",
      origin,
      nsResolver,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (origin && magnitudeElement && descriptionElement) {
      var latitudeElement = xmlDoc.evaluate(
        ".//q:latitude/q:value",
        origin,
        nsResolver,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      var longitudeElement = xmlDoc.evaluate(
        ".//q:longitude/q:value",
        origin,
        nsResolver,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      var magnitudeValueElement = xmlDoc.evaluate(
        ".//q:mag/q:value",
        magnitudeElement,
        nsResolver,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      var placeElement = xmlDoc.evaluate(
        ".//q:text",
        descriptionElement,
        nsResolver,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;

      if (
        latitudeElement &&
        longitudeElement &&
        magnitudeValueElement &&
        placeElement
      ) {
        var latitude = parseFloat(latitudeElement.textContent);
        var longitude = parseFloat(longitudeElement.textContent);
        var magnitude = parseFloat(magnitudeValueElement.textContent);
        var place = placeElement.textContent;
        var depth = depthElement
          ? parseFloat(depthElement.textContent) / 1000
          : null;
        var time = timeElement ? timeElement.textContent : null;

        if (!isNaN(latitude) && !isNaN(longitude)) {
          var radius = getRadius(magnitude); // Calculate the radius based on magnitude
          epicenters.push({
            lat: latitude,
            lng: longitude,
            magnitude: magnitude,
            place: place,
            depth: depth,
            time: time,
            radius: radius, // Add the radius info
            continent: getContinent(latitude, longitude), // Add continent info
          });
        }
      }
    }
  }
  return epicenters;
}

// Function to enable or disable the magnitude inputs
function toggleMagnitudeInputs() {
  var disableMagnitudeFilter = document.getElementById(
    "disableMagnitudeFilter"
  ).checked;
  var minMagnitudeInput = document.getElementById("minMagnitude");
  var maxMagnitudeInput = document.getElementById("maxMagnitude");

  if (disableMagnitudeFilter) {
    // Disable the inputs when the checkbox is checked
    minMagnitudeInput.disabled = false;
    maxMagnitudeInput.disabled = false;
  } else {
    // Enable the inputs when the checkbox is unchecked
    minMagnitudeInput.disabled = true;
    maxMagnitudeInput.disabled = true;
  }
}

// Add an event listener to the checkbox to toggle the inputs
document
  .getElementById("disableMagnitudeFilter")
  .addEventListener("change", toggleMagnitudeInputs);

// Initial check to set the state of the inputs
toggleMagnitudeInputs();

function fetchEarthquakeData(
  timeRange,
  minMagnitude,
  maxMagnitude,
  continentFilter
) {
  let url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_${timeRange}.quakeml`;

  showLoadingOverlay();

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      return response.text();
    })
    .then((data) => {
      var epicenters = parseQuakeML(data);

      var disableMagnitudeFilter = document.getElementById(
        "disableMagnitudeFilter"
      ).checked;

      var filteredEpicenters = epicenters.filter((epicenter) => {
        var magnitudeCondition =
          !disableMagnitudeFilter ||
          (epicenter.magnitude >= minMagnitude &&
            epicenter.magnitude <= maxMagnitude);

        var continentCondition =
          continentFilter === "All" || epicenter.continent === continentFilter;

        return magnitudeCondition && continentCondition;
      });

      if (filteredEpicenters.length > 0) {
        document.getElementById("errorMessage").textContent = "";

        markers.forEach((marker) => map.removeLayer(marker));
        markers = [];

        // Create a LatLngBounds object to store the bounds of all markers
        var bounds = L.latLngBounds();

        filteredEpicenters.forEach((epicenter) => {
          // Round the values to 2 decimals
          var roundedMagnitude = epicenter.magnitude.toFixed(2);
          var roundedLatitude = epicenter.lat.toFixed(2);
          var roundedLongitude = epicenter.lng.toFixed(2);
          var roundedDepth = epicenter.depth
            ? epicenter.depth.toFixed(2)
            : null;

          var marker = L.marker([roundedLatitude, roundedLongitude]).addTo(map);
          marker.bindPopup(
            `<b>${epicenter.place}</b><br>
            Magnitude: ${roundedMagnitude}<br>
            Latitude: ${roundedLatitude}<br>
            Longitude: ${roundedLongitude}<br>
            Depth: ${roundedDepth ? roundedDepth + " km" : "N/A"}<br>
            Time: ${new Date(epicenter.time).toLocaleString()}`
          );

          marker.on("click", function () {
            updateEarthquakeData(epicenter);
          });

          L.circle([epicenter.lat, epicenter.lng], {
            radius: epicenter.radius * 1000, // Convert to meters
            color: "blue",
            fill: true,
            fillOpacity: 0.2,
          }).addTo(map);

          // Extend the bounds to include the current marker
          bounds.extend(marker.getLatLng());

          markers.push(marker);
        });

        // After all markers are added, adjust the map's view to fit the bounds of the markers
        map.fitBounds(bounds);
      } else {
        document.getElementById("errorMessage").textContent =
          "No se han encontrado terremotos con los filtros seleccionados";
      }
    })
    .catch((error) => {
      console.error(
        "Error recuperando información sobre los terremotos:",
        error
      );
      document.getElementById("errorMessage").textContent =
        "Error recuperando información sobre los terremotos:";
    })
    .finally(() => {
      hideLoadingOverlay();
    });
}

// Get the selected time range
function getSelectedTimeRange() {
  var timeRange;
  document.querySelectorAll('input[name="timeRange"]').forEach((radio) => {
    if (radio.checked) {
      timeRange = radio.value;
    }
  });
  return timeRange;
}

// Get selected continent
function getSelectedContinent() {
  var continent = document.getElementById("continentFilter").value;
  return continent;
}

// Add event listener for the submit button
document.getElementById("submit").addEventListener("click", () => {
  var minMagnitude = parseFloat(document.getElementById("minMagnitude").value);
  var maxMagnitude = parseFloat(document.getElementById("maxMagnitude").value);
  var timeRange = getSelectedTimeRange();
  var continentFilter = getSelectedContinent();

  var disableMagnitudeFilter = document.getElementById(
    "disableMagnitudeFilter"
  ).checked;

  if (timeRange) {
    if (
      minMagnitude <= maxMagnitude ||
      (disableMagnitudeFilter && minMagnitude > maxMagnitude)
    ) {
      fetchEarthquakeData(
        timeRange,
        minMagnitude,
        maxMagnitude,
        continentFilter
      );
    } else {
      document.getElementById("errorMessage").textContent =
        "La magnitud mínima debe ser menor o igual que la magnitud máxima";
    }
  } else {
    document.getElementById("errorMessage").textContent =
      "Por favor, seleccione un rango de tiempo";
  }
});

/**
 * Función que estima el radio del terremoto en base a su magnitud
 * @param {*} magnitude Magnitud del terremoto
 * @returns Radio en kilómetros del terremoto
 */
function getRadius(magnitude) {
  if (magnitude >= 7.0) {
    return 300;
  } else if (magnitude >= 6.0) {
    return 100;
  } else if (magnitude >= 5.0) {
    return 30;
  } else if (magnitude >= 4.0) {
    return 10;
  } else {
    return 5;
  }
}

/**
 * Función que recupera los datos del terremoto y muestra sus datos en el html
 * @param {*} epicenter Datos del epicentro del terremoto
 */
function updateEarthquakeData(epicenter) {
  const earthquakeDataDiv = document.getElementById("earthquakeData");

  var continent = getContinent(epicenter.lat, epicenter.lng);

  const dataContent = `
    <h2>Terremoto seleccionado</h2>
    <h3>Localización:</h3> <p>${epicenter.place}</p>
    <h3>Magnitud:</h3><p>${epicenter.magnitude.toFixed(2)}</p>
    <h3>Latitud:</h3><p>${epicenter.lat.toFixed(2)}º</p>
    <h3>Longitud:</h3><p>${epicenter.lng.toFixed(2)}º</p>
    <h3>Profundidad:</h3><p>${
      epicenter.depth ? epicenter.depth.toFixed(2) + " km" : "N/A"
    }</p>
    <h3>Fecha:</h3><p>${new Date(epicenter.time).toLocaleString()}</p>
    <h3>Radio:</h3><p>${epicenter.radius} km</p>
    <h3>Continente:</h3><p>${continent}</p>
  `;

  earthquakeDataDiv.innerHTML = dataContent;
}

/**
 * Función que limpia la lista de marcadores de los epicentros y los elimina del mapa
 */
function clearMarkers() {
  markers.forEach(function (marker) {
    map.removeLayer(marker);
  });
  markers = [];
}
