function initMap() {
  var msd = { lat: 53.094098, lng: -2.179907 };
  var map = new google.maps.Map(document.getElementById("map"), {
    zoom: 11,
    center: msd,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#fafafa" }] },
      {
        elementType: "labels.text.stroke",
        stylers: [{ color: "#fafafa" }]
      },
      {
        elementType: "labels.text.fill",
        stylers: [{ color: "#1a1a1a" }]
      },
      {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#1a1a1a" }]
      },
      {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#666666" }]
      },
      {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#eeeeee" }]
      },
      {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#666666" }]
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#cccccc" }]
      },
      {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#fafafa" }]
      },
      {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#1a1a1a" }]
      },
      {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#1A5798" }]
      },
      {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#fafafa" }]
      },
      {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#666666" }]
      },
      {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#aaaaaa" }]
      },
      {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#666666" }]
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#9bc3ee" }]
      },
      {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#aaaaaa" }]
      },
      {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#1a1a1a" }]
      }
    ]
  });
  var marker = new google.maps.Marker({
    position: msd,
    map: map
  });
}
