
import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  MapPin,
  Clock,
  RefreshCw,
  Info
} from 'lucide-react';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000/api';

export default function SafeRoutePage({
  setActiveTab,
  origin = 'Bengaluru',
  destination = 'Mangaluru'
}) {
  const [routes, setRoutes] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(0);

  // Fetch actual routes from Django and OSRM.
  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE}/routes/safety-eval/?from=${encodeURIComponent(
          origin
        )}&to=${encodeURIComponent(destination)}`
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.error || 'Unable to calculate route.'
        );
      }

      if (!Array.isArray(data.routes) || data.routes.length === 0) {
        throw new Error(
          'The routing service did not return any routes.'
        );
      }

      setRoutes(data.routes);
      setRouteInfo(data);
      setSelectedRoute(0);
    } catch (err) {
      console.error('Route API error:', err);
      setRoutes([]);
      setRouteInfo(null);
      setError(err.message || 'Unable to load real routes.');
    } finally {
      setLoading(false);
    }
  }, [origin, destination]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const currentRoute = routes[selectedRoute] || null;

  const getRouteLabel = (index) => `Route ${index + 1}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-600 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Smart Route Safety Engine</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900">
              Route to {destination}
            </h1>

            <p className="text-xs text-slate-500 font-medium mt-1">
              Real road routes calculated using SafeTrip's routing service.
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500">
              Routing Source
            </div>
            <div className="text-sm font-black text-slate-800">
              {routeInfo?.source || 'OSRM'}
            </div>
          </div>
        </div>
      </section>

      {/* Origin and destination */}
      <section className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-teal-600" />
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Origin
              </span>
            </div>

            <p className="text-sm font-black text-slate-900">
              {routeInfo?.from?.district || origin}
            </p>

            {routeInfo?.from && (
              <p className="text-[10px] text-slate-500 mt-1">
                {routeInfo.from.latitude}, {routeInfo.from.longitude}
              </p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-4 h-4 text-teal-600" />
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Destination
              </span>
            </div>

            <p className="text-sm font-black text-slate-900">
              {routeInfo?.to?.district || destination}
            </p>

            {routeInfo?.to && (
              <p className="text-[10px] text-slate-500 mt-1">
                {routeInfo.to.latitude}, {routeInfo.to.longitude}
              </p>
            )}
          </div>

        </div>
      </section>

      {/* Loading */}
      {loading && (
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">
          <RefreshCw className="w-8 h-8 mx-auto text-teal-600 animate-spin mb-4" />
          <h2 className="text-sm font-black text-slate-900">
            Calculating real routes...
          </h2>
          <p className="text-xs text-slate-500 mt-2">
            Requesting road route information.
          </p>
        </section>
      )}

      {/* Error */}
      {!loading && error && (
        <section className="bg-white rounded-3xl border border-red-200 shadow-sm p-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />

            <div>
              <h2 className="text-sm font-black text-red-800">
                Unable to calculate route
              </h2>

              <p className="text-xs text-red-700 mt-2">{error}</p>

              <button
                type="button"
                onClick={fetchRoutes}
                className="mt-4 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Route alternatives */}
      {!loading && !error && routes.length > 0 && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {routes.map((route, index) => (
              <button
                type="button"
                key={route.route_number ?? route.id ?? index}
                onClick={() => setSelectedRoute(index)}
                className={`text-left p-5 rounded-3xl border-2 transition-all ${
                  selectedRoute === index
                    ? 'border-teal-500 bg-teal-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-teal-300'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Navigation
                      className={`w-5 h-5 ${
                        selectedRoute === index
                          ? 'text-teal-600'
                          : 'text-slate-500'
                      }`}
                    />

                    <span className="text-sm font-black text-slate-900">
                      {getRouteLabel(index)}
                    </span>
                  </div>

                  {selectedRoute === index && (
                    <span className="px-2 py-1 rounded-full bg-teal-600 text-white text-[9px] font-black uppercase">
                      Selected
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      Distance
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {route.distance_km ?? '—'} km
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      Travel Time
                    </div>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {route.duration_text || 'Not available'}
                    </div>
                  </div>
                </div>

                {route.summary && (
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <p className="text-[11px] text-slate-600">
                      Via {route.summary}
                    </p>
                  </div>
                )}
              </button>
            ))}
          </section>

          {/* Selected route details */}
          {currentRoute && (
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />
                    <h2 className="text-lg font-black text-slate-900">
                      {getRouteLabel(selectedRoute)}
                    </h2>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Route details returned by the routing service.
                  </p>
                </div>

                <div className="px-3 py-2 rounded-xl bg-teal-50 text-teal-700 text-xs font-black">
                  {currentRoute.distance_km ?? '—'} km
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <Navigation className="w-5 h-5 text-teal-600 mb-2" />
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Distance
                  </div>
                  <div className="text-lg font-black text-slate-900">
                    {currentRoute.distance_km ?? '—'} km
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <Clock className="w-5 h-5 text-teal-600 mb-2" />
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Duration
                  </div>
                  <div className="text-lg font-black text-slate-900">
                    {currentRoute.duration_text || 'Not available'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <Navigation className="w-5 h-5 text-teal-600 mb-2" />
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Routing
                  </div>
                  <div className="text-lg font-black text-slate-900">
                    {routeInfo?.source || 'OSRM'}
                  </div>
                </div>
              </div>

              <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-black text-amber-900">
                      Route safety analysis
                    </h3>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Route distance and travel time are provided by the
                      routing service. Incident matching is not yet confirmed
                      on this page, so SafeTrip does not assign an unsupported
                      safety score.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <h3 className="text-xs font-black text-slate-900 mb-2">
                  Route data
                </h3>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] text-slate-500">
                    Coordinates provided by the API:{' '}
                    <span className="font-bold text-slate-800">
                      {currentRoute.coordinates?.length || 0}
                    </span>
                  </p>

                  <p className="text-[10px] text-slate-400 mt-1">
                    The interactive map uses route geometry when it is
                    available from the backend.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Route comparison */}
          {routes.length > 1 && (
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <Navigation className="w-5 h-5 text-teal-600" />
                <h2 className="text-lg font-black text-slate-900">
                  Route Comparison
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-3 px-3 text-[10px] uppercase font-black text-slate-500">
                        Route
                      </th>
                      <th className="py-3 px-3 text-[10px] uppercase font-black text-slate-500">
                        Distance
                      </th>
                      <th className="py-3 px-3 text-[10px] uppercase font-black text-slate-500">
                        Duration
                      </th>
                      <th className="py-3 px-3 text-[10px] uppercase font-black text-slate-500">
                        Source
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {routes.map((route, index) => (
                      <tr
                        key={route.route_number ?? route.id ?? index}
                        className="border-b border-slate-100"
                      >
                        <td className="py-4 px-3 text-xs font-black text-slate-900">
                          {getRouteLabel(index)}
                        </td>
                        <td className="py-4 px-3 text-xs font-bold text-slate-700">
                          {route.distance_km ?? '—'} km
                        </td>
                        <td className="py-4 px-3 text-xs font-bold text-slate-700">
                          {route.duration_text || 'Not available'}
                        </td>
                        <td className="py-4 px-3 text-xs font-bold text-teal-700">
                          {routeInfo?.source || 'OSRM'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Safety and incident information */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50/70 p-6 rounded-3xl border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <h3 className="text-lg font-black">SafeTrip Analysis</h3>
              </div>
              <p className="text-xs text-emerald-900 mt-3 leading-relaxed">
                SafeTrip will use stored community reports to provide
                explainable route information when route incident matching
                is implemented.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-800">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <h3 className="text-lg font-black">Incident Matching</h3>
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Only actual reports stored in the backend should be used.
                A lack of reports does not guarantee that a route is safe.
              </p>
            </div>
          </section>

          {/* Open the separate interactive map page */}
          <button
            type="button"
            onClick={() => setActiveTab('route-map')}
            className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all"
          >
            <Navigation className="w-4 h-4" />
            <span>View Route on Map</span>
          </button>
        </>
      )}

      {/* No routes */}
      {!loading && !error && routes.length === 0 && (
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">
          <Navigation className="w-10 h-10 mx-auto text-slate-400 mb-4" />

          <h2 className="text-sm font-black text-slate-900">
            No routes found
          </h2>

          <p className="text-xs text-slate-500 mt-2">
            The routing service did not return a road route for this journey.
          </p>

          <button
            type="button"
            onClick={fetchRoutes}
            className="mt-5 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold"
          >
            Try Again
          </button>
        </section>
      )}
    </div>
  );
}
