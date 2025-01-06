// Inicializamos el mapa
var map = L.map("map", { maxZoom: 3 }).setView([0, 0], 2);
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
    // Recuperamos los datos del terremoto

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

        // Incluimos los datos en el terremoto
        if (!isNaN(latitude) && !isNaN(longitude)) {
          epicenters.push({
            lat: latitude,
            lng: longitude,
            magnitude: magnitude,
            place: place,
            depth: depth,
            time: time,
            radius: getRadius(magnitude),
            continent: getContinent(latitude, longitude),
          });
        }
      }
    }
  }
  return epicenters;
}

/**
 *Función que maneja si el filtro de magnitud está activo o no
 */
function toggleMagnitudeInputs() {
  var disableMagnitudeFilter = document.getElementById(
    "disableMagnitudeFilter"
  ).checked;
  var minMagnitudeInput = document.getElementById("minMagnitude");
  var maxMagnitudeInput = document.getElementById("maxMagnitude");

  if (disableMagnitudeFilter) {
    minMagnitudeInput.disabled = false;
    maxMagnitudeInput.disabled = false;
  } else {
    minMagnitudeInput.disabled = true;
    maxMagnitudeInput.disabled = true;
  }
}

document
  .getElementById("disableMagnitudeFilter")
  .addEventListener("change", toggleMagnitudeInputs);

toggleMagnitudeInputs();

/**
 * Función que se encarga de recuperar la información de los terremotos en base a los filtros aplicados.
 * Toda la información procede de https://earthquake.usgs.gov/earthquakes/feed/v1.0/quakeml.php
 * @param {*} timeRange Espacio de tiempo en el cual queremos consultar la actividad sísmica
 * @param {*} minMagnitude Magnitud mínima de los terremotos que queramos consultar
 * @param {*} maxMagnitude Magnitud máxima de los terremotos que queramos consultar
 * @param {*} continentFilter Filtro con el continente en el que queramos consultar la actividad sísmica
 */
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
        throw new Error(
          `Se ha producido un error conectando con el API: ${response.statusText}`
        );
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

        var bounds = L.latLngBounds();

        filteredEpicenters.forEach((epicenter) => {
          var roundedMagnitude = epicenter.magnitude.toFixed(2);
          var roundedLatitude = epicenter.lat.toFixed(2);
          var roundedLongitude = epicenter.lng.toFixed(2);
          var roundedDepth = epicenter.depth
            ? epicenter.depth.toFixed(2)
            : null;

          var marker = L.marker([roundedLatitude, roundedLongitude]).addTo(map);
          marker.bindPopup(
            `<h3>${epicenter.place}</h3>
            <ul><li>Magnitud: ${roundedMagnitude}</li>
            <li>Latitud: ${roundedLatitude}</li>
            <li>Longitud: ${roundedLongitude}</li>
            <li>Profundidad: ${roundedDepth ? roundedDepth + " km" : "N/A"}</li>
            <li>Fecha: ${new Date(epicenter.time).toLocaleString()}</li></ul>`
          );

          marker.on("click", function () {
            updateEarthquakeData(epicenter);
          });

          L.circle([epicenter.lat, epicenter.lng], {
            radius: epicenter.radius * 1000,
            color: "blue",
            fill: true,
            fillOpacity: 0.2,
          }).addTo(map);

          bounds.extend(marker.getLatLng());

          markers.push(marker);
        });

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

/**
 * Función que recupera el rango de tiempo que queremos consultar
 * @returns Rango a consultar con la nomenclatura de https://earthquake.usgs.gov/earthquakes/feed/v1.0/quakeml.php
 */
function getSelectedTimeRange() {
  var timeRange;
  document.querySelectorAll('input[name="timeRange"]').forEach((radio) => {
    if (radio.checked) {
      timeRange = radio.value;
    }
  });
  return timeRange;
}

/**
 * Función que recupera el continente que queremos consultar
 * @returns Nombre del continente
 */
function getSelectedContinent() {
  var continent = document.getElementById("continentFilter").value;
  return continent;
}

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
    return (300 * magnitude) / 7.0;
  } else if (magnitude >= 6.0) {
    return (100 * magnitude) / 6.0;
  } else if (magnitude >= 5.0) {
    return (30 * magnitude) / 5.0;
  } else if (magnitude >= 4.0) {
    return (10 * magnitude) / 4.0;
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
