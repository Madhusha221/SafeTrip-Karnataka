
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  ZoomControl,
  LayersControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Clock3,
  Search,
  Car,
  Bike,
  Bus,
  Footprints,
  LocateFixed,
  RefreshCw,
  List,
  X,
  Loader,
  Square,
} from "lucide-react";

import "leaflet/dist/leaflet.css";
import "./RouteMapPage.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const MAP_CENTER = [12.5, 76.5];
const COLORS = ["#087fca", "#8b9caf", "#8b5cf6"];

function createIcon(label, className) {
  return new L.DivIcon({
    className: `st-marker ${className}`,
    html: `<span>${label}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const originIcon = createIcon("A", "st-origin-marker");
const destinationIcon = createIcon("B", "st-destination-marker");

const incidentIcon = new L.DivIcon({
  className: "st-marker st-incident-marker",
  html: "<span>!</span>",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const userLocationIcon = new L.DivIcon({
  className: "st-marker st-user-marker",
  html: "<span><i></i></span>",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function getCoordinates(route) {
  const points =
    route?.geometry?.coordinates ||
    route?.geojson?.coordinates ||
    route?.coordinates;

  if (!Array.isArray(points)) return [];

  return points
    .filter(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1]))
    )
    .map(([first, second]) => {
      if (route?.geometry?.coordinates || route?.geojson?.coordinates) {
        return [Number(second), Number(first)];
      }

      const a = Number(first);
      const b = Number(second);

      if (a >= 74 && a <= 79 && b >= 11 && b <= 19) {
        return [b, a];
      }

      return [a, b];
    })
    .filter(
      ([lat, lng]) =>
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
    );
}

function formatDistance(route) {
  if (route?.distance_km != null) {
    const distance = Number(route.distance_km);
    return Number.isFinite(distance)
      ? `${distance.toFixed(1)} km`
      : "Unavailable";
  }

  const distance = Number(route?.distance);

  return Number.isFinite(distance)
    ? `${(distance / 1000).toFixed(1)} km`
    : "Unavailable";
}

function formatDuration(route) {
  if (route?.duration_text) return route.duration_text;

  let minutes;

  if (route?.duration_minutes != null) {
    minutes = Number(route.duration_minutes);
  } else if (route?.duration != null) {
    minutes = Number(route.duration) / 60;
  } else {
    return "Unavailable";
  }

  if (!Number.isFinite(minutes) || minutes < 0) {
    return "Unavailable";
  }

  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const remaining = total % 60;

  return hours ? `${hours} hr ${remaining} min` : `${remaining} min`;
}

function getIncidentCoordinates(item) {
  const lat = Number(
    item?.latitude ?? item?.lat ?? item?.location?.latitude
  );

  const lng = Number(
    item?.longitude ??
      item?.lng ??
      item?.lon ??
      item?.location?.longitude
  );

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  return [lat, lng];
}

function distanceKm(a, b) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = radians(b[0] - a[0]);
  const dLng = radians(b[1] - a[1]);
  const lat1 = radians(a[0]);
  const lat2 = radians(b[0]);

  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function remainingRouteKm(position, coordinates) {
  if (!position || coordinates.length < 2) return null;

  const current = [position.lat, position.lng];
  let closestIndex = 0;
  let closestDistance = Infinity;

  coordinates.forEach((point, index) => {
    const distance = distanceKm(current, point);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  let remaining = closestDistance;

  for (let i = closestIndex; i < coordinates.length - 1; i += 1) {
    remaining += distanceKm(coordinates[i], coordinates[i + 1]);
  }

  return remaining;
}

function FitRoute({ coordinates, enabled = true }) {
  const map = useMap();

  useEffect(() => {
    if (enabled && coordinates.length > 1) {
      map.fitBounds(coordinates, { padding: [35, 35] });
    }
  }, [coordinates, enabled, map]);

  return null;
}

function FollowUserLocation({ position, enabled }) {
  const map = useMap();

  useEffect(() => {
    if (enabled && position) {
      map.setView(
        [position.lat, position.lng],
        Math.max(map.getZoom(), 15),
        { animate: true }
      );
    }
  }, [position, enabled, map]);

  return null;
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

export default function RouteMapPage({
  setActiveTab,
  origin: initialOrigin = "Bengaluru",
  destination: initialDestination = "Mangaluru",
  destinationLatitude = null,
  destinationLongitude = null,
}) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [routes, setRoutes] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [clickedLocation, setClickedLocation] = useState(null);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [travelMode, setTravelMode] = useState("car");
  const [activeSafetyTab, setActiveSafetyTab] = useState("Reports");

  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  const [isNavigating, setIsNavigating] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [routeError, setRouteError] = useState("");
  const [placeError, setPlaceError] = useState("");
  const [incidentError, setIncidentError] = useState("");
  useEffect(() => {
    setOrigin(initialOrigin);
  }, [initialOrigin]);

  useEffect(() => {
    setDestination(initialDestination);
  }, [initialDestination]);
  
  const loadRoutes = useCallback(async () => {
    if (!origin.trim() || !destination.trim()) {
      setRouteError("Enter both a starting point and destination.");
      return;
    }

    setLoadingRoutes(true);
    setRouteError("");

    try {
      const params = new URLSearchParams({
        from: origin,
        to: destination,
      });

      if (
        destinationLatitude != null &&
        destinationLongitude != null
      ) {
        params.set("destination_lat", String(destinationLatitude));
        params.set("destination_lon", String(destinationLongitude));
      }

      const response = await fetch(
        `${API_BASE}/routes/safety-eval/?${params.toString()}`
      );
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Unable to calculate routes.");
      }

      if (!Array.isArray(data.routes) || !data.routes.length) {
        throw new Error("No route alternatives were returned.");
      }

      setRoutes(data.routes);
      setSelectedRoute(0);
      setIsNavigating(false);
      setCurrentPosition(null);
    } catch (error) {
      setRoutes([]);
      setRouteError(error.message || "Unable to load routes.");
    } finally {
      setLoadingRoutes(false);
    }
  }, [
    origin,
    destination,
    destinationLatitude,
    destinationLongitude,
  ]);


  const loadIncidents = useCallback(async () => {
    setLoadingIncidents(true);
    setIncidentError("");

    try {
      const response = await fetch(`${API_BASE}/incidents/`);

      if (!response.ok) {
        throw new Error("Incident service is unavailable.");
      }

      const data = await response.json();

      setIncidents(
        Array.isArray(data)
          ? data
          : data.results || data.incidents || []
      );
    } catch (error) {
      setIncidents([]);
      setIncidentError(error.message);
    } finally {
      setLoadingIncidents(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
    loadIncidents();
  }, [loadRoutes, loadIncidents]);

  const currentRoute = routes[selectedRoute] || null;

  const routeCoordinates = useMemo(
    () => (currentRoute ? getCoordinates(currentRoute) : []),
    [currentRoute]
  );

  const allRouteCoordinates = useMemo(
    () => routes.map(getCoordinates),
    [routes]
  );

  const mappedIncidents = useMemo(
    () =>
      incidents
        .map((item) => ({
          ...item,
          mapCoordinates: getIncidentCoordinates(item),
        }))
        .filter((item) => item.mapCoordinates),
    [incidents]
  );

  const remainingKm = useMemo(
    () => remainingRouteKm(currentPosition, routeCoordinates),
    [currentPosition, routeCoordinates]
  );

  useEffect(() => {
    if (!isNavigating) return undefined;

    if (!navigator.geolocation) {
      setGpsError("This browser does not support GPS location.");
      setIsNavigating(false);
      return undefined;
    }

    setGpsError("");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
      },
      (error) => {
        if (error.code === 1) {
          setGpsError("Allow location access in your browser settings.");
        } else if (error.code === 3) {
          setGpsError("GPS timed out. Try again in an open area.");
        } else {
          setGpsError("Unable to read your current GPS location.");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 15000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isNavigating]);

  async function searchPlaces(event) {
    event.preventDefault();

    if (!query.trim()) return;

    setSearching(true);
    setPlaceError("");
    setSearchResults([]);

    try {
      const url =
        "https://nominatim.openstreetmap.org/search" +
        `?format=jsonv2&limit=6&addressdetails=1` +
        `&q=${encodeURIComponent(query + ", Karnataka, India")}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Place search is unavailable.");
      }

      const results = await response.json();
      setSearchResults(results);

      if (!results.length) {
        setPlaceError("No matching places found.");
      }
    } catch (error) {
      setPlaceError(error.message);
    } finally {
      setSearching(false);
    }
  }

  async function selectPlace(place) {
    const lat = Number(place.lat);
    const lng = Number(place.lon);

    const name =
      place.name ||
      place.display_name?.split(",")[0] ||
      "Selected place";

    setSelectedPlace({
      name,
      address: place.display_name || "",
      lat,
      lng,
      type: place.type || place.category || "Place",
    });

    setClickedLocation({ lat, lng });
    setQuery(name);
    setSearchResults([]);
  }

  async function selectMapLocation(location) {
    setClickedLocation(location);
    setSelectedIncident(null);

    setSelectedPlace({
      name: "Selected map location",
      address: `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
      lat: location.lat,
      lng: location.lng,
      type: "Map location",
    });

    try {
      const response = await fetch(
        "https://nominatim.openstreetmap.org/reverse" +
          `?format=jsonv2&lat=${location.lat}&lon=${location.lng}`
      );

      if (response.ok) {
        const data = await response.json();

        setSelectedPlace({
          name:
            data.name ||
            data.display_name?.split(",")[0] ||
            "Selected map location",
          address:
            data.display_name ||
            `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
          lat: location.lat,
          lng: location.lng,
          type: data.type || data.category || "Map location",
        });
      }
    } catch {
      // Keep the selected coordinates if reverse lookup fails.
    }
  }

  function setSelectedEndpoint(endpoint) {
    if (!selectedPlace) return;

    if (endpoint === "origin") {
      setOrigin(selectedPlace.name);
    } else {
      setDestination(selectedPlace.name);
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setPlaceError("Your browser does not support GPS location.");
      return;
    }

    setLocating(true);
    setPlaceError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setClickedLocation({ lat, lng });

        setSelectedPlace({
          name: "My current location",
          address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
          type: "Current location",
        });

        setCurrentPosition({
          lat,
          lng,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });

        setLocating(false);
      },
      () => {
        setPlaceError(
          "Location permission was denied or GPS is unavailable."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function startNavigation() {
    if (!currentRoute || routeCoordinates.length < 2) {
      setRouteError("Select a route with valid map coordinates first.");
      return;
    }

    if (!navigator.geolocation) {
      setGpsError("This browser does not support GPS location.");
      return;
    }

    setRouteError("");
    setGpsError("");
    setIsNavigating(true);
  }

  function stopNavigation() {
    setIsNavigating(false);
    setGpsError("");
  }

  return (
    <main className="st-route-map-page">
      <div className="st-page-heading">
        <button
          type="button"
          className="st-back-button"
          onClick={() => setActiveTab?.("route")}
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <div>
          <h1>Safe Routes</h1>
          <p>Plan your journey and explore safety information.</p>
        </div>

        <button
          type="button"
          className="st-refresh-button"
          onClick={() => {
            loadRoutes();
            loadIncidents();
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="st-planner-grid">
        <aside className="st-left-column">
          <section className="st-panel">
            <div className="st-panel-heading">
              <span className="st-panel-icon">
                <Navigation size={22} />
              </span>
              <div>
                <h2>Plan your route</h2>
                <p>Choose your start and destination.</p>
              </div>
            </div>

            <label className="st-endpoint st-origin">
              <span>A</span>
              <input
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                placeholder="Starting point"
                aria-label="Starting point"
              />
            </label>

            <div className="st-swap-row">
              <button
                type="button"
                onClick={() => {
                  setOrigin(destination);
                  setDestination(origin);
                }}
                title="Swap locations"
              >
                ⇅ Swap locations
              </button>
            </div>

            <label className="st-endpoint st-destination">
              <span>B</span>
              <input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="Destination"
                aria-label="Destination"
              />
            </label>

            <h3 className="st-section-title">Travel mode</h3>

            <div className="st-mode-grid">
              {[
                { id: "car", label: "Car", Icon: Car },
                { id: "bike", label: "Bike", Icon: Bike },
                { id: "bus", label: "Bus", Icon: Bus },
                { id: "walk", label: "Walk", Icon: Footprints },
              ].map(({ id, label, Icon }) => (
                <button
                  type="button"
                  key={id}
                  className={`st-mode-button ${
                    travelMode === id ? "selected" : ""
                  }`}
                  onClick={() => setTravelMode(id)}
                >
                  <Icon size={22} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="st-get-routes"
              onClick={loadRoutes}
              disabled={loadingRoutes}
            >
              {loadingRoutes ? (
                <Loader size={18} className="st-spin" />
              ) : (
                <Search size={18} />
              )}
              {loadingRoutes ? "Finding routes..." : "Get Routes"}
            </button>

            {travelMode !== "car" && (
              <p className="st-mode-note">
                The current backend calculates driving routes only.
                Other travel modes require routing support.
              </p>
            )}

            {routeError && (
              <p className="st-error-message">{routeError}</p>
            )}
          </section>

          <section className="st-panel">
            <div className="st-panel-heading">
              <span className="st-panel-icon pale">
                <MapPin size={22} />
              </span>
              <div>
                <h2>Route options</h2>
                <p>Select a route to display it on the map.</p>
              </div>
            </div>

            {loadingRoutes ? (
              <p className="st-muted">Loading routes...</p>
            ) : routes.length ? (
              routes.map((route, index) => (
                <button
                  type="button"
                  key={route.id ?? index}
                  className={`st-route-option ${
                    selectedRoute === index ? "selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedRoute(index);
                    setIsNavigating(false);
                  }}
                >
                  <span className="st-route-number">{index + 1}</span>

                  <span className="st-route-info">
                    <strong>Route {index + 1}</strong>
                    <span>
                      <MapPin size={14} />
                      {formatDistance(route)}
                    </span>
                    <span>
                      <Clock3 size={14} />
                      {formatDuration(route)}
                    </span>
                  </span>

                  <span
                    className={`st-radio ${
                      selectedRoute === index ? "checked" : ""
                    }`}
                  />
                </button>
              ))
            ) : (
              <p className="st-muted">
                {routeError || "Route options will appear here."}
              </p>
            )}
          </section>
        </aside>

        <section className="st-map-column">
          <form className="st-map-search" onSubmit={searchPlaces}>
            <Search size={19} />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search places or cities..."
              aria-label="Search places"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearchResults([]);
                }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}

            <button type="submit" disabled={searching} aria-label="Search">
              {searching ? (
                <Loader size={18} className="st-spin" />
              ) : (
                <Search size={18} />
              )}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="st-search-results">
              {searchResults.map((place) => (
                <button
                  type="button"
                  key={place.place_id}
                  onClick={() => selectPlace(place)}
                >
                  <MapPin size={16} />
                  <span>
                    <strong>
                      {place.name || place.display_name?.split(",")[0]}
                    </strong>
                    <small>{place.display_name}</small>
                  </span>
                </button>
              ))}
            </div>
          )}

          {placeError && <p className="st-place-error">{placeError}</p>}

          <div className="st-map-filters">
            <span>Tourist places</span>
            <span>Police stations</span>
            <span>Hospitals</span>
            <span>Petrol pumps</span>
            <span>Incidents</span>
          </div>

          <div className="st-map-frame">
            <MapContainer
              center={MAP_CENTER}
              zoom={7}
              scrollWheelZoom
              zoomControl={false}
              className="st-leaflet-map"
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="OpenStreetMap">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer name="OpenStreetMap HOT">
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />
                </LayersControl.BaseLayer>
              </LayersControl>

              <ZoomControl position="topright" />

              <FitRoute
                coordinates={routeCoordinates}
                enabled={!isNavigating}
              />

              <FollowUserLocation
                position={currentPosition}
                enabled={isNavigating}
              />

              <MapClickHandler onSelect={selectMapLocation} />

              {allRouteCoordinates.map((coordinates, index) =>
                coordinates.length > 1 ? (
                  <Polyline
                    key={`route-${index}`}
                    positions={coordinates}
                    pathOptions={{
                      color: COLORS[index % COLORS.length],
                      weight: selectedRoute === index ? 6 : 4,
                      opacity: selectedRoute === index ? 0.95 : 0.65,
                    }}
                    eventHandlers={{
                      click: () => {
                        setSelectedRoute(index);
                        setIsNavigating(false);
                      },
                    }}
                  />
                ) : null
              )}

              {routeCoordinates.length > 1 && (
                <>
                  <Marker position={routeCoordinates[0]} icon={originIcon}>
                    <Popup>{origin}</Popup>
                  </Marker>

                  <Marker
                    position={routeCoordinates[routeCoordinates.length - 1]}
                    icon={destinationIcon}
                  >
                    <Popup>{destination}</Popup>
                  </Marker>
                </>
              )}

              {mappedIncidents.map((item, index) => (
                <Marker
                  key={item.id ?? index}
                  position={item.mapCoordinates}
                  icon={incidentIcon}
                  eventHandlers={{
                    click: () => setSelectedIncident(item),
                  }}
                >
                  <Popup>
                    <strong>
                      {item.title || item.incident_type || "Community report"}
                    </strong>
                    <p>{item.description || "No description provided."}</p>
                  </Popup>
                </Marker>
              ))}

              {currentPosition && (
                <Marker
                  position={[currentPosition.lat, currentPosition.lng]}
                  icon={userLocationIcon}
                  zIndexOffset={1000}
                >
                  <Popup>
                    <strong>Your current location</strong>
                    <br />
                    GPS accuracy: {Math.round(currentPosition.accuracy || 0)} m
                  </Popup>
                </Marker>
              )}

              {clickedLocation && (
                <Marker
                  position={[clickedLocation.lat, clickedLocation.lng]}
                >
                  <Popup>
                    <strong>
                      {selectedPlace?.name || "Selected location"}
                    </strong>
                    <br />
                    {clickedLocation.lat.toFixed(5)},{" "}
                    {clickedLocation.lng.toFixed(5)}
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            <button
              type="button"
              className="st-live-location"
              onClick={locateMe}
              disabled={locating}
            >
              <LocateFixed size={18} />
              {locating ? "Finding location..." : "Live Location"}
            </button>
          </div>

          {isNavigating && (
            <div className="st-navigation-status" role="status">
              <span className="st-navigation-live-dot" />
              <div>
                <strong>Navigation in progress</strong>
                <span>
                  {remainingKm == null
                    ? "Waiting for GPS location..."
                    : `${remainingKm.toFixed(1)} km estimated remaining`}
                </span>
                {gpsError && <small>{gpsError}</small>}
              </div>
            </div>
          )}

          <section className="st-bottom-bar">
            <div className="st-bottom-summary">
              <strong>Route {selectedRoute + 1}</strong>
              <span>
                {isNavigating && remainingKm != null
                  ? `${remainingKm.toFixed(1)} km remaining (estimate)`
                  : currentRoute
                    ? `${formatDistance(currentRoute)} · ${formatDuration(
                        currentRoute
                      )}`
                    : "Choose a route"}
              </span>
            </div>

            <button
              type="button"
              className="st-steps-button"
              onClick={() =>
                document
                  .querySelector(".st-left-column")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <List size={18} />
              Steps
            </button>

            {isNavigating ? (
              <button
                type="button"
                className="st-stop-button"
                onClick={() => setIsNavigating(false)}
              >
                <Square size={16} />
                Stop Navigation
              </button>
            ) : (
              <button
                type="button"
                className="st-start-button"
                onClick={startNavigation}
              >
                <Navigation size={18} />
                Start Navigation
              </button>
            )}
          </section>
        </section>

        <aside className="st-right-column">
          <section className="st-panel">
            <div className="st-panel-heading">
              <span className="st-panel-icon">
                <MapPin size={22} />
              </span>
              <div>
                <h2>Place details</h2>
                <p>Select a place on the map.</p>
              </div>
            </div>

            {selectedPlace ? (
              <>
                <h3 className="st-place-name">{selectedPlace.name}</h3>
                <p className="st-place-address">{selectedPlace.address}</p>
                <div className="st-place-actions">
                  <button
                    type="button"
                    onClick={() => setSelectedEndpoint("origin")}
                  >
                    Set as start
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEndpoint("destination")}
                  >
                    Set as destination
                  </button>
                </div>
              </>
            ) : (
              <div className="st-empty-place">
                <MapPin size={30} />
                <strong>No place selected</strong>
                <p>Search for a place or click the map.</p>
              </div>
            )}
          </section>

          <section className="st-panel">
            <div className="st-panel-heading">
              <span className="st-panel-icon orange">
                <ShieldCheck size={22} />
              </span>
              <div>
                <h2>Safety information</h2>
                <p>Reports loaded from your backend.</p>
              </div>
            </div>

            <div className="st-safety-tabs">
              <button
                type="button"
                className={activeSafetyTab === "Reports" ? "active" : ""}
                onClick={() => setActiveSafetyTab("Reports")}
              >
                Reports
              </button>
              <button
                type="button"
                className={activeSafetyTab === "Nearby" ? "active" : ""}
                onClick={() => setActiveSafetyTab("Nearby")}
              >
                Nearby
              </button>
            </div>

            {activeSafetyTab === "Reports" ? (
              loadingIncidents ? (
                <p className="st-muted">Loading reports...</p>
              ) : incidentError ? (
                <p className="st-muted">{incidentError}</p>
              ) : mappedIncidents.length ? (
                mappedIncidents.map((item, index) => (
                  <button
                    type="button"
                    className="st-safety-row"
                    key={item.id ?? index}
                    onClick={() => {
                      setSelectedIncident(item);
                      setClickedLocation({
                        lat: item.mapCoordinates[0],
                        lng: item.mapCoordinates[1],
                      });
                    }}
                  >
                    <AlertTriangle size={18} />
                    <span>
                      <strong>
                        {item.title || item.incident_type || "Community report"}
                      </strong>
                      <small>
                        {item.location_name ||
                          item.description ||
                          "Reported incident"}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <p className="st-muted">
                  No geolocated safety reports available.
                </p>
              )
            ) : (
              <p className="st-muted">
                Nearby police stations, hospitals and petrol pumps require a
                places-data integration.
              </p>
            )}

            {selectedIncident && (
              <div className="st-selected-incident">
                <strong>
                  {selectedIncident.title ||
                    selectedIncident.incident_type ||
                    "Selected report"}
                </strong>
                <p>
                  {selectedIncident.description || "No description provided."}
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
