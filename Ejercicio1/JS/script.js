// Initialize the map
var map = L.map("map").setView([0, 0], 2);

// Add OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

var markers = [];

// Function to show the loading overlay
function showLoadingOverlay() {
  document.getElementById("loadingOverlay").style.display = "flex";
}

// Function to hide the loading overlay
function hideLoadingOverlay() {
  document.getElementById("loadingOverlay").style.display = "none";
}

// Function to determine continent based on latitude and longitude
function getContinent(lat, lng) {
  if (lat >= -37.5 && lat <= 37.5 && lng >= -18.5 && lng <= 51.5) {
    return "Africa";
  }
  if (lat >= -90 && lat <= -60 && lng >= -180 && lng <= 180) {
    return "Antarctica";
  }
  if (lat >= 0 && lat <= 80 && lng >= 26 && lng <= 180) {
    return "Asia";
  }
  if (lat >= -55 && lat <= 10 && lng >= 112 && lng <= 180) {
    return "Australia/Oceania";
  }
  if (lat >= 34.5 && lat <= 71.5 && lng >= -25.5 && lng <= 45.5) {
    return "Europe";
  }
  if (lat >= 7 && lat <= 83 && lng >= -180 && lng <= -60) {
    return "North America";
  }
  if (lat >= -60 && lat <= 13 && lng >= -90 && lng <= -35) {
    return "South America";
  }
  return "Unknown";
}

// Modified parseQuakeML function
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

    // Extracting Depth and Time
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
        var depth = depthElement ? parseFloat(depthElement.textContent) : null;
        var time = timeElement ? timeElement.textContent : null;

        if (!isNaN(latitude) && !isNaN(longitude)) {
          epicenters.push({
            lat: latitude,
            lng: longitude,
            magnitude: magnitude,
            place: place,
            depth: depth,
            time: time,
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
    minMagnitudeInput.disabled = true;
    maxMagnitudeInput.disabled = true;
  } else {
    // Enable the inputs when the checkbox is unchecked
    minMagnitudeInput.disabled = false;
    maxMagnitudeInput.disabled = false;
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

      // Get the state of the "Disable Magnitude Filter" checkbox
      var disableMagnitudeFilter = document.getElementById(
        "disableMagnitudeFilter"
      ).checked;

      // Filter by magnitude and continent
      var filteredEpicenters = epicenters.filter((epicenter) => {
        // Apply magnitude filter only if it's not disabled
        var magnitudeCondition =
          disableMagnitudeFilter ||
          (epicenter.magnitude >= minMagnitude &&
            epicenter.magnitude <= maxMagnitude);

        // Apply continent filter if selected
        var continentCondition =
          continentFilter === "All" || epicenter.continent === continentFilter;

        return magnitudeCondition && continentCondition;
      });

      if (filteredEpicenters.length > 0) {
        document.getElementById("message").textContent = "";

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
            fetchShakeMap(epicenter.id); // Assuming `id` is a unique earthquake identifier
          });

          // Extend the bounds to include the current marker
          bounds.extend(marker.getLatLng());

          markers.push(marker);
        });

        // After all markers are added, adjust the map's view to fit the bounds of the markers
        map.fitBounds(bounds);
      } else {
        document.getElementById("message").textContent =
          "No earthquakes found within the selected parameters.";
      }
    })
    .catch((error) => {
      console.error("Error fetching earthquake data:", error);
      document.getElementById("message").textContent =
        "There was an error fetching earthquake data.";
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

  if (timeRange) {
    if (minMagnitude <= maxMagnitude) {
      fetchEarthquakeData(
        timeRange,
        minMagnitude,
        maxMagnitude,
        continentFilter
      );
    } else {
      document.getElementById("message").textContent =
        "Minimum magnitude must be less than or equal to maximum magnitude.";
    }
  } else {
    document.getElementById("message").textContent =
      "Please select a time range.";
  }
});

// ShakeMap function (no changes)
function fetchShakeMap(earthquakeID) {
  // Fetch the ShakeMap URL for the earthquake (USGS API provides a ShakeMap URL)
  let shakeMapUrl = `https://earthquake.usgs.gov/earthquakes/eventpage/${earthquakeID}/shakemap`;

  // Fetch the ShakeMap data from the USGS (this is a simplified example; you'd need the actual URL for your earthquake)
  fetch(shakeMapUrl)
    .then((response) => response.json())
    .then((data) => {
      // Assuming the ShakeMap URL is in the data response:
      var shakeMapImageUrl = data.shakeMapUrl; // This will vary based on the API

      // If the ShakeMap URL is valid, overlay it on the map
      if (shakeMapImageUrl) {
        var bounds = [
          [epicenter.lat - 0.1, epicenter.lng - 0.1], // Adjust these bounds for proper overlay
          [epicenter.lat + 0.1, epicenter.lng + 0.1],
        ];

        var imageOverlay = L.imageOverlay(shakeMapImageUrl, bounds).addTo(map);
        imageOverlay.bringToFront(); // Ensure it is on top of other layers

        // Optionally, you can close the overlay if the marker is clicked again
        imageOverlay.on("click", function () {
          map.removeLayer(imageOverlay);
        });
      } else {
        console.error("ShakeMap not found for this earthquake.");
      }
    })
    .catch((error) => {
      console.error("Error fetching ShakeMap:", error);
    });
}
