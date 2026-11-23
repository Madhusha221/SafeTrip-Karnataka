import "./WomenModePage.css";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  ZoomControl,
  useMap
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  Heart,
  ShieldCheck,
  MapPin,
  Users,
  Navigation,
  Siren,
  Phone,
  Share2,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  LocateFixed,
  Info,
  ArrowRight,
  BedDouble,
  Lightbulb,
  Bell,
  User,
  Activity
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api";

const DEFAULT_CENTER = [12.9716, 77.5946];

const userIcon = new L.DivIcon({
  className: "women-map-user",
  html: '<div class="women-user-dot"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const incidentIcon = new L.DivIcon({
  className: "women-map-incident",
  html: "<span>!</span>",
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.incidents)) return data.incidents;
  return [];
}

function getIncidentCoordinates(item) {
  const latitude = Number(
    item.latitude ?? item.lat ?? item.location?.latitude
  );

  const longitude = Number(
    item.longitude ??
      item.lng ??
      item.lon ??
      item.location?.longitude
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return [latitude, longitude];
}

function getRouteCoordinates(route) {
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
    });
}

function FitMap({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 1) {
      map.fitBounds(coordinates, { padding: [35, 35] });
    } else if (coordinates.length === 1) {
      map.setView(coordinates[0], 13);
    }
  }, [coordinates, map]);

  return null;
}

function StatCard({ icon: Icon, title, value, subtitle, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3 min-w-0">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={23} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-600">{title}</p>
        <p className="text-xl font-black text-slate-900 truncate">{value}</p>
        <p className="text-[10px] text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

export default function WomenModePage({ onOpenReport, setActiveTab }) {
  const [womenModeEnabled, setWomenModeEnabled] = useState(true);

  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [incidentError, setIncidentError] = useState("");

  const [currentPosition, setCurrentPosition] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);

  const [origin, setOrigin] = useState("Bengaluru");
  const [destination, setDestination] = useState("Mysuru");

  const [routes, setRoutes] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(0);

  const [activeMapFilter, setActiveMapFilter] = useState("All");

  const [trustedContacts, setTrustedContacts] = useState([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [sosNotice, setSosNotice] = useState("");

  const loadIncidents = useCallback(async () => {
    setLoadingIncidents(true);
    setIncidentError("");

    try {
      const response = await fetch(`${API_BASE}/incidents/`);

      if (!response.ok) {
        throw new Error("Unable to load community safety reports.");
      }

      const data = await response.json();
      setIncidents(getList(data));
    } catch (error) {
      setIncidents([]);
      setIncidentError(error.message);
    } finally {
      setLoadingIncidents(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const mappedIncidents = useMemo(
    () =>
      incidents
        .map((item) => ({
          ...item,
          mapCoordinates: getIncidentCoordinates(item)
        }))
        .filter((item) => item.mapCoordinates),
    [incidents]
  );

  const routeCoordinates = useMemo(() => {
    const route = routes[selectedRoute];
    return route ? getRouteCoordinates(route) : [];
  }, [routes, selectedRoute]);

  const loadRoutes = async (event) => {
    event?.preventDefault();

    if (!origin.trim() || !destination.trim()) {
      setRouteError("Enter both starting point and destination.");
      return;
    }

    setLoadingRoutes(true);
    setRouteError("");
    setRoutes([]);
    setRouteInfo(null);

    try {
      const params = new URLSearchParams({
        from: origin.trim(),
        to: destination.trim()
      });

      const response = await fetch(
        `${API_BASE}/routes/safety-eval/?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || "Unable to calculate route.");
      }

      if (!Array.isArray(data.routes) || !data.routes.length) {
        throw new Error("No route alternatives were returned.");
      }

      setRoutes(data.routes);
      setRouteInfo(data);
      setSelectedRoute(0);
    } catch (error) {
      setRouteError(error.message);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support GPS.");
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocating(false);
      },
      () => {
        setLocationError(
          "Location permission denied or GPS is unavailable."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const addTrustedContact = (event) => {
    event.preventDefault();

    if (!contactName.trim() || !contactPhone.trim()) return;

    setTrustedContacts((previous) => [
      ...previous,
      {
        id: Date.now(),
        name: contactName.trim(),
        phone: contactPhone.trim()
      }
    ]);

    setContactName("");
    setContactPhone("");
    setShowContactForm(false);
  };

  const triggerSOS = () => {
    const confirmed = window.confirm(
      "This will open your phone dialler to call India's emergency number 112. Continue?"
    );

    if (confirmed) {
      window.location.href = "tel:112";

      setSosNotice(
        "Your phone dialler has been opened. Complete the call if you need emergency assistance."
      );
    }
  };

  const shareLocation = async () => {
    if (!currentPosition) {
      setSosNotice(
        "Please enable GPS location before sharing your location."
      );
      return;
    }

    const url =
      `https://www.google.com/maps?q=${currentPosition.latitude},${currentPosition.longitude}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "My SafeTrip location",
          text: "Here is my current location.",
          url
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setSosNotice("Your location link has been copied.");
      } else {
        setSosNotice(url);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setSosNotice("Unable to share your location.");
      }
    }
  };

  const filteredIncidents = mappedIncidents.filter(() => true);

  const currentRoute = routes[selectedRoute];

  const safetyTips = [
    "Prefer well-lit and busy routes, especially during late evening travel.",
    "Use verified cabs or registered Karnataka Tourism taxis.",
    "Keep emergency number 112 handy at all times.",
    "Share your trip details with someone you trust.",
    "Keep your phone charged and emergency contacts accessible."
  ];

  const recentUpdates = incidents.slice(0, 3);

  return (
    <main className="w-full min-h-screen bg-[#fff8fc] px-3 md:px-6 py-5 space-y-5">

      {/* HERO BANNER */}
      <section
        className="relative overflow-hidden rounded-3xl min-h-[220px] md:min-h-[230px] bg-cover bg-center shadow-lg"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(100,10,65,.82), rgba(180,25,115,.55)), url('https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=1800&q=85')"
        }}
      >
        <div className="relative z-10 min-h-[220px] md:min-h-[230px] p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-xs font-bold mb-3">
              <ShieldCheck size={16} />
              WOMEN TRAVELLER SAFETY HUB
            </div>

            <h1 className="text-3xl md:text-5xl font-black leading-tight">
              Travel Confidently.
              <br />
              Stay Protected.
            </h1>

            <p className="mt-3 text-sm md:text-base text-pink-50 max-w-xl">
              A dedicated safety space for women travellers in Karnataka
              with safety information, route insights and emergency help.
            </p>
          </div>

          <div className="w-full md:w-80 rounded-2xl border border-white/30 bg-white/20 backdrop-blur-lg p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center">
                <ShieldCheck size={26} />
              </div>

              <div className="flex-1">
                <p className="font-black">Women Safety Mode</p>
                <p className="text-xs text-pink-50">
                  {womenModeEnabled ? "Mode enabled" : "Mode disabled"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setWomenModeEnabled((value) => !value)}
                aria-pressed={womenModeEnabled}
                className={`w-12 h-7 rounded-full p-1 transition ${
                  womenModeEnabled ? "bg-emerald-400" : "bg-slate-400"
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition ${
                    womenModeEnabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            <div className="mt-4 text-center rounded-xl bg-emerald-400 text-slate-950 py-2 text-xs font-black">
              {womenModeEnabled ? "✓ WOMEN MODE ACTIVE" : "WOMEN MODE OFF"}
            </div>
          </div>
        </div>
      </section>

      {/* SUMMARY CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <StatCard
          icon={ShieldCheck}
          title="My Safety Score"
          value="Not calculated"
          subtitle="Safety scoring not integrated"
          color="bg-emerald-100 text-emerald-700"
        />

        <StatCard
          icon={MapPin}
          title="Geolocated Reports"
          value={mappedIncidents.length}
          subtitle="Community incident reports"
          color="bg-purple-100 text-purple-700"
        />

        <StatCard
          icon={Navigation}
          title="Trip Status"
          value="Not travelling"
          subtitle="No active trip tracking"
          color="bg-sky-100 text-sky-700"
        />

        <StatCard
          icon={Users}
          title="Trusted Contacts"
          value={trustedContacts.length}
          subtitle="Added in this session"
          color="bg-orange-100 text-orange-700"
        />

        <button
          type="button"
          onClick={triggerSOS}
          className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white p-4 flex items-center justify-between shadow-lg hover:brightness-105 transition"
        >
          <div className="text-left">
            <p className="font-black text-lg">EMERGENCY SOS</p>
            <p className="text-xs text-pink-100">Call 112 for help</p>
          </div>
          <Siren size={34} />
        </button>
      </section>

      {sosNotice && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 text-blue-900 p-3 text-sm flex items-start gap-2">
          <Info size={18} className="shrink-0 mt-0.5" />
          <span>{sosNotice}</span>

          <button
            type="button"
            onClick={() => setSosNotice("")}
            className="ml-auto font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* MAIN DASHBOARD GRID */}
      <section className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_310px] gap-4 items-start">

        {/* QUICK ACTIONS */}
        <aside className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-black text-lg flex items-center gap-2 text-slate-900">
            <Activity className="text-pink-600" />
            Quick Actions
          </h2>

          <button
            type="button"
            onClick={locateMe}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-pink-100 hover:bg-pink-50 text-sm font-bold text-slate-800"
          >
            <MapPin className="text-pink-600" size={19} />
            Find My Location
            <ArrowRight className="ml-auto" size={16} />
          </button>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("women-route-check")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-pink-100 hover:bg-pink-50 text-sm font-bold text-slate-800"
          >
            <Navigation className="text-pink-600" size={19} />
            Check Route Safety
            <ArrowRight className="ml-auto" size={16} />
          </button>

          <button
            type="button"
            onClick={shareLocation}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-pink-100 hover:bg-pink-50 text-sm font-bold text-slate-800"
          >
            <Share2 className="text-pink-600" size={19} />
            Share My Location
            <ArrowRight className="ml-auto" size={16} />
          </button>

          <button
            type="button"
            onClick={() => setShowContactForm((value) => !value)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-pink-100 hover:bg-pink-50 text-sm font-bold text-slate-800"
          >
            <Users className="text-pink-600" size={19} />
            Manage Trusted Contacts
            <ArrowRight className="ml-auto" size={16} />
          </button>

          <a
            href="tel:112"
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-rose-600 text-white text-sm font-bold"
          >
            <Phone size={19} />
            Call 112 Emergency
            <ArrowRight className="ml-auto" size={16} />
          </a>

          {showContactForm && (
            <form
              onSubmit={addTrustedContact}
              className="space-y-2 border-t pt-4"
            >
              <p className="text-sm font-black">Add trusted contact</p>

              <input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Contact name"
                className="w-full border rounded-lg p-2 text-sm"
                required
              />

              <input
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="Phone number"
                className="w-full border rounded-lg p-2 text-sm"
                required
              />

              <button className="w-full rounded-lg bg-teal-700 text-white py-2 text-sm font-bold">
                Add Contact
              </button>
            </form>
          )}

          {trustedContacts.length > 0 && (
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-black text-slate-600">
                Your contacts (session only)
              </p>

              {trustedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <User size={15} className="text-teal-700" />

                  <span className="flex-1">{contact.name}</span>

                  <a
                    href={`tel:${contact.phone}`}
                    className="text-teal-700 font-bold"
                  >
                    Call
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      setTrustedContacts((items) =>
                        items.filter((item) => item.id !== contact.id)
                      )
                    }
                    className="text-rose-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* SAFETY MAP */}
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <MapPin className="text-pink-600" />
              Your Safety Map
            </h2>

            <button
              type="button"
              onClick={loadIncidents}
              className="flex items-center gap-2 text-xs font-bold text-teal-700"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {["All", "Reports"].map((filter) => (
              <button
                type="button"
                key={filter}
                onClick={() => setActiveMapFilter(filter)}
                className={`px-3 py-1.5 rounded-full border text-xs font-bold ${
                  activeMapFilter === filter
                    ? "bg-teal-700 text-white border-teal-700"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {filter}
              </button>
            ))}

            <span className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-500">
              Police / Hospitals: data not connected
            </span>
          </div>

          <div className="h-[420px] md:h-[520px] rounded-2xl overflow-hidden border border-slate-200 relative z-0">
            <MapContainer
              center={
                currentPosition
                  ? [currentPosition.latitude, currentPosition.longitude]
                  : DEFAULT_CENTER
              }
              zoom={7}
              scrollWheelZoom
              zoomControl={false}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <ZoomControl position="topright" />

              <FitMap coordinates={routeCoordinates} />

              {routeCoordinates.length > 1 && (
                <Polyline
                  positions={routeCoordinates}
                  pathOptions={{
                    color: "#078f87",
                    weight: 6,
                    opacity: 0.9
                  }}
                />
              )}

              {currentPosition && (
                <Marker
                  position={[
                    currentPosition.latitude,
                    currentPosition.longitude
                  ]}
                  icon={userIcon}
                >
                  <Popup>Your current GPS location</Popup>
                </Marker>
              )}

              {filteredIncidents.map((item, index) => (
                <Marker
                  key={item.id ?? index}
                  position={item.mapCoordinates}
                  icon={incidentIcon}
                >
                  <Popup>
                    <strong>
                      {item.title || item.incident_type || "Community report"}
                    </strong>

                    <p>
                      {item.description || "No description available."}
                    </p>

                    <small>
                      {item.location_name || "Reported location"}
                    </small>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            <button
              type="button"
              onClick={locateMe}
              disabled={locating}
              className="absolute z-[500] bottom-4 right-4 rounded-xl bg-white shadow-lg border px-4 py-3 text-xs font-bold flex items-center gap-2 text-blue-700"
            >
              <LocateFixed size={17} />
              {locating ? "Locating..." : "My Location"}
            </button>
          </div>

          {locationError && (
            <p className="mt-2 text-xs text-rose-600">{locationError}</p>
          )}

          {incidentError && (
            <p className="mt-2 text-xs text-amber-700">{incidentError}</p>
          )}

          <p className="text-[11px] text-slate-500 mt-3">
            Map markers show geolocated community reports returned by your
            backend. Absence of a report does not mean a location is safe.
          </p>
        </section>

        {/* ROUTE SAFETY CHECK */}
        <aside
          id="women-route-check"
          className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-black flex items-center gap-2">
            <Navigation className="text-pink-600" />
            Route Safety Check
          </h2>

          <form onSubmit={loadRoutes} className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-600">From</span>

              <input
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-teal-600"
                placeholder="Starting location"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-slate-600">To</span>

              <input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-teal-600"
                placeholder="Destination"
              />
            </label>

            <button
              type="submit"
              disabled={loadingRoutes}
              className="w-full bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white rounded-xl py-3 font-black text-sm flex justify-center items-center gap-2"
            >
              {loadingRoutes ? (
                <RefreshCw className="animate-spin" size={17} />
              ) : (
                <Navigation size={17} />
              )}

              {loadingRoutes ? "Checking Route..." : "Check Safety Route"}
            </button>
          </form>

          {routeError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {routeError}
            </div>
          )}

          {currentRoute && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-black text-sm">
                  Route {selectedRoute + 1}
                </p>

                <span className="text-[10px] bg-white px-2 py-1 rounded-full text-teal-800 font-bold">
                  Route returned
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-500">Distance</p>
                <p className="font-black text-xl">
                  {currentRoute.distance_km ?? "Unavailable"} km
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Travel time</p>
                <p className="font-bold">
                  {currentRoute.duration_text || "Unavailable"}
                </p>
              </div>

              <p className="text-[11px] text-slate-600">
                Source: {routeInfo?.source || "Routing API"}
              </p>

              <p className="text-[11px] text-amber-800 bg-amber-100 rounded-lg p-2">
                A safety score is not available yet. Route distance and time
                do not establish that a route is safe.
              </p>

              {routes.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold">Other route options</p>

                  {routes.map((route, index) => (
                    <button
                      type="button"
                      key={route.id ?? index}
                      onClick={() => setSelectedRoute(index)}
                      className={`w-full text-left rounded-lg border p-2 text-xs ${
                        selectedRoute === index
                          ? "bg-teal-700 text-white border-teal-700"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      Route {index + 1} · {route.distance_km ?? "—"} km ·{" "}
                      {route.duration_text || "Time unavailable"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!currentRoute && !loadingRoutes && !routeError && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
              Enter your starting point and destination to calculate available
              road routes.
            </p>
          )}

          <div className="border-t pt-4">
            <p className="text-xs font-black mb-2">Emergency numbers</p>

            <a
              href="tel:112"
              className="flex justify-between items-center text-sm font-bold text-rose-700 py-2"
            >
              <span className="flex items-center gap-2">
                <Phone size={16} />
                Emergency assistance
              </span>
              112
            </a>

            <a
              href="tel:1091"
              className="flex justify-between items-center text-sm font-bold text-slate-700 py-2"
            >
              <span className="flex items-center gap-2">
                <Phone size={16} />
                Women helpline
              </span>
              1091
            </a>
          </div>
        </aside>
      </section>

      {/* BOTTOM DASHBOARD */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* RECENT UPDATES */}
        <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black flex items-center gap-2">
              <Bell className="text-rose-600" />
              Recent Safety Updates
            </h2>

            <button
              type="button"
              onClick={onOpenReport}
              className="text-xs text-teal-700 font-bold"
            >
              Report an issue
            </button>
          </div>

          {loadingIncidents ? (
            <p className="text-xs text-slate-500">Loading reports...</p>
          ) : recentUpdates.length ? (
            <div className="space-y-3">
              {recentUpdates.map((item, index) => (
                <div
                  key={item.id ?? index}
                  className="flex items-start gap-3 border-b border-slate-100 pb-3"
                >
                  <span className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={16} />
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">
                      {item.title ||
                        item.incident_type ||
                        "Community safety report"}
                    </p>

                    <p className="text-[11px] text-slate-500 mt-1">
                      {item.location_name ||
                        item.description ||
                        "Location details unavailable"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              {incidentError ||
                "No community reports are currently available."}
            </p>
          )}
        </div>

        {/* SAFETY TIPS */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black flex items-center gap-2 mb-4">
            <Lightbulb className="text-amber-500" />
            Safety Tips for Women Travellers
          </h2>

          <div className="space-y-3">
            {safetyTips.map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs text-slate-700"
              >
                <CheckCircle2
                  size={17}
                  className="text-emerald-500 shrink-0"
                />
                {tip}
              </div>
            ))}
          </div>
        </div>

        {/* WOMEN FRIENDLY STAYS */}
        <div className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm">
          <h2 className="font-black flex items-center gap-2 mb-4">
            <BedDouble className="text-rose-600" />
            Women-Friendly Stays
          </h2>

          <div className="rounded-2xl bg-pink-50 p-4 text-center">
            <Building2
              size={30}
              className="mx-auto text-pink-600 mb-2"
            />

            <p className="text-sm font-black text-slate-800">
              Accommodation data integration pending
            </p>

            <p className="text-xs text-slate-600 mt-2">
              Verified women-friendly accommodation listings will appear here
              when a trusted data source is connected.
            </p>
          </div>
        </div>
      </section>

      {/* MAP / DATA STATUS */}
      <section className="rounded-2xl bg-slate-900 text-white p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div>
          <p className="font-black text-sm">SafeTrip Women Safety Hub</p>

          <p className="text-xs text-slate-300 mt-1">
            Community reports and route data are loaded from your SafeTrip backend.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-slate-200">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={14} className="text-emerald-400" />
            Incident API
          </span>

          <span className="flex items-center gap-1">
            <CheckCircle2 size={14} className="text-emerald-400" />
            Route API
          </span>

          <span className="flex items-center gap-1">
            <Info size={14} className="text-sky-300" />
            Nearby services pending
          </span>
        </div>
      </section>
    </main>
  );
}