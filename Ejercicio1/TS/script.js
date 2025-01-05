let map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
let markers = [];
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
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(quakeML, "application/xml");
    const nsResolver = (prefix) => {
        const ns = { q: "http://quakeml.org/xmlns/bed/1.2" };
        return prefix ? ns[prefix] : null;
    };
    const events = xmlDoc.evaluate("//q:event", xmlDoc, nsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const epicenters = [];
    for (let i = 0; i < events.snapshotLength; i++) {
        const event = events.snapshotItem(i);
        const origin = xmlDoc.evaluate(".//q:origin", event, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const magnitudeElement = xmlDoc.evaluate(".//q:magnitude", event, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const descriptionElement = xmlDoc.evaluate(".//q:description", event, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const depthElement = xmlDoc.evaluate(".//q:depth/q:value", origin, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const timeElement = xmlDoc.evaluate(".//q:time/q:value", origin, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (origin && magnitudeElement && descriptionElement) {
            const latitudeElement = xmlDoc.evaluate(".//q:latitude/q:value", origin, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            const longitudeElement = xmlDoc.evaluate(".//q:longitude/q:value", origin, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            const magnitudeValueElement = xmlDoc.evaluate(".//q:mag/q:value", magnitudeElement, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            const placeElement = xmlDoc.evaluate(".//q:text", descriptionElement, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (latitudeElement &&
                longitudeElement &&
                magnitudeValueElement &&
                placeElement) {
                const latitude = parseFloat(latitudeElement.textContent);
                const longitude = parseFloat(longitudeElement.textContent);
                const magnitude = parseFloat(magnitudeValueElement.textContent);
                const place = placeElement.textContent;
                const depth = depthElement
                    ? parseFloat(depthElement.textContent) / 1000
                    : null;
                const time = timeElement ? timeElement.textContent : null;
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
    const disableMagnitudeFilter = document.getElementById("disableMagnitudeFilter").checked;
    const minMagnitudeInput = document.getElementById("minMagnitude");
    const maxMagnitudeInput = document.getElementById("maxMagnitude");
    if (disableMagnitudeFilter) {
        minMagnitudeInput.disabled = false;
        maxMagnitudeInput.disabled = false;
    }
    else {
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
function fetchEarthquakeData(timeRange, minMagnitude, maxMagnitude, continentFilter) {
    let url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_${timeRange}.quakeml`;
    showLoadingOverlay();
    fetch(url)
        .then((response) => {
        if (!response.ok) {
            throw new Error(`Se ha producido un error conectando con el API: ${response.statusText}`);
        }
        return response.text();
    })
        .then((data) => {
        const epicenters = parseQuakeML(data);
        const disableMagnitudeFilter = document.getElementById("disableMagnitudeFilter").checked;
        const filteredEpicenters = epicenters.filter((epicenter) => {
            const magnitudeCondition = !disableMagnitudeFilter ||
                (epicenter.magnitude >= minMagnitude &&
                    epicenter.magnitude <= maxMagnitude);
            const continentCondition = continentFilter === "All" || epicenter.continent === continentFilter;
            return magnitudeCondition && continentCondition;
        });
        if (filteredEpicenters.length > 0) {
            document.getElementById("errorMessage").textContent = "";
            markers.forEach((marker) => map.removeLayer(marker));
            markers = [];
            const bounds = L.latLngBounds([]);
            filteredEpicenters.forEach((epicenter) => {
                const roundedMagnitude = epicenter.magnitude.toFixed(2);
                const roundedLatitude = epicenter.lat.toFixed(2);
                const roundedLongitude = epicenter.lng.toFixed(2);
                const roundedDepth = epicenter.depth
                    ? epicenter.depth.toFixed(2)
                    : null;
                const marker = L.marker([parseFloat(roundedLatitude), parseFloat(roundedLongitude)]).addTo(map);
                marker.bindPopup(`<h3>${epicenter.place}</h3>
            <ul><li>Magnitude: ${roundedMagnitude}</li>
            <li>Latitude: ${roundedLatitude}</li>
            <li>Longitude: ${roundedLongitude}</li>
            <li>Depth: ${roundedDepth ? roundedDepth + " km" : "N/A"}</li>
            <li>Time: ${new Date(epicenter.time).toLocaleString()}</li></ul>`);
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
        }
        else {
            document.getElementById("errorMessage").textContent =
                "No se han encontrado terremotos con los filtros seleccionados";
        }
    })
        .catch((error) => {
        console.error("Error recuperando información sobre los terremotos:", error);
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
    let timeRange = "";
    document.querySelectorAll('input[name="timeRange"]').forEach((radio) => {
        const radioInput = radio;
        if (radioInput.checked) {
            timeRange = radioInput.value;
        }
    });
    return timeRange;
}
/**
 * Función que recupera el continente que queremos consultar
 * @returns Nombre del continente
 */
function getSelectedContinent() {
    const continent = document.getElementById("continentFilter").value;
    return continent;
}
document.getElementById("submit").addEventListener("click", () => {
    const minMagnitude = parseFloat(document.getElementById("minMagnitude").value);
    const maxMagnitude = parseFloat(document.getElementById("maxMagnitude").value);
    const timeRange = getSelectedTimeRange();
    const continentFilter = getSelectedContinent();
    const disableMagnitudeFilter = document.getElementById("disableMagnitudeFilter").checked;
    if (timeRange) {
        if (minMagnitude <= maxMagnitude ||
            (disableMagnitudeFilter && minMagnitude > maxMagnitude)) {
            fetchEarthquakeData(timeRange, minMagnitude, maxMagnitude, continentFilter);
        }
        else {
            document.getElementById("errorMessage").textContent =
                "La magnitud mínima debe ser menor o igual que la magnitud máxima";
        }
    }
    else {
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
    }
    else if (magnitude >= 6.0) {
        return (100 * magnitude) / 6.0;
    }
    else if (magnitude >= 5.0) {
        return (30 * magnitude) / 5.0;
    }
    else if (magnitude >= 4.0) {
        return (10 * magnitude) / 4.0;
    }
    else {
        return 5;
    }
}
/**
 * Función que recupera los datos del terremoto y muestra sus datos en el html
 * @param {*} epicenter Datos del epicentro del terremoto
 */
function updateEarthquakeData(epicenter) {
    const earthquakeDataDiv = document.getElementById("earthquakeData");
    const continent = getContinent(epicenter.lat, epicenter.lng);
    const dataContent = `
    <h2>Terremoto seleccionado</h2>
    <h3>Localización:</h3> <p>${epicenter.place}</p>
    <h3>Magnitud:</h3><p>${epicenter.magnitude.toFixed(2)}</p>
    <h3>Latitud:</h3><p>${epicenter.lat.toFixed(2)}º</p>
    <h3>Longitud:</h3><p>${epicenter.lng.toFixed(2)}º</p>
    <h3>Profundidad:</h3><p>${epicenter.depth ? epicenter.depth.toFixed(2) + " km" : "N/A"}</p>
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
