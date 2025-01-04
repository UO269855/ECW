// Initialize the map
var map = L.map("map").setView([0, 0], 2);

// Add OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

var markers = [];

// Function to parse QuakeML and extract epicenter coordinates using XPath
function parseQuakeML(quakeML) {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(quakeML, "application/xml");
  var nsResolver = function (prefix) {
    var ns = {
      q: "http://quakeml.org/xmlns/bed/1.2",
    };
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

        if (
          !isNaN(latitude) &&
          !isNaN(longitude) &&
          latitude !== undefined &&
          longitude !== undefined
        ) {
          epicenters.push({
            lat: latitude,
            lng: longitude,
            magnitude: magnitude,
            place: place,
          });
        } else {
          console.error("Invalid latitude or longitude:", latitude, longitude);
        }
      } else {
        console.error("Missing required elements:", {
          latitudeElement,
          longitudeElement,
          magnitudeValueElement,
          placeElement,
        });
      }
    } else {
      console.error("Missing origin, magnitude, or description element:", {
        origin,
        magnitudeElement,
        descriptionElement,
      });
    }
  }
  return epicenters;
}

// Function to fetch and display real-time earthquake data
function fetchEarthquakeData(timeRange) {
  let url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_${timeRange}.quakeml`;

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      return response.text();
    })
    .then((data) => {
      var epicenters = parseQuakeML(data);
      if (epicenters.length > 0) {
        document.getElementById("message").textContent = "";

        // Clear existing markers
        markers.forEach((marker) => map.removeLayer(marker));
        markers = [];

        // Add new markers
        epicenters.forEach((epicenter) => {
          var marker = L.marker([epicenter.lat, epicenter.lng]).addTo(map);
          marker.bindPopup(
            `<b>${epicenter.place}</b><br>Magnitude: ${epicenter.magnitude}`
          );
          markers.push(marker);
        });
      } else {
        document.getElementById("message").textContent =
          "There is no earthquake info for that petition.";
      }
    })
    .catch((error) => {
      console.error("Error fetching earthquake data:", error);
      document.getElementById("message").textContent =
        "There is no earthquake info for that petition.";
    });
}

// Add event listeners to the buttons
document
  .getElementById("pastHour")
  .addEventListener("click", () => fetchEarthquakeData("hour"));
document
  .getElementById("pastDay")
  .addEventListener("click", () => fetchEarthquakeData("day"));
document
  .getElementById("past7Days")
  .addEventListener("click", () => fetchEarthquakeData("week"));
document
  .getElementById("past30Days")
  .addEventListener("click", () => fetchEarthquakeData("month"));
