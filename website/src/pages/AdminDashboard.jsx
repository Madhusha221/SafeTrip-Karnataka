
import React, { useCallback, useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

const getToken = () =>
  localStorage.getItem("safetrip_access_token");

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `http://127.0.0.1:8000${url.startsWith("/") ? "" : "/"}${url}`;
};

const statusStyles = {
  Pending: "bg-amber-100 text-amber-700",
  Verified: "bg-emerald-100 text-emerald-700",
  Resolved: "bg-blue-100 text-blue-700",
};

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Authentication failed. Please log out and sign in again with your administrator account."
    );
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.detail || data.message || "The request failed."
    );
  }

  return data;
}

function StatCard({ title, value, note, icon, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{title}</p>
        <span className={`text-2xl ${color}`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold mt-4 text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-2">{note}</p>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-slate-800 mt-2 break-words">
        {value !== null && value !== undefined && value !== ""
          ? String(value)
          : "Not available"}
      </p>
    </div>
  );
}

export default function AdminDashboard({ onLogout, adminUser }) {
    const handleLogout = () => {
    localStorage.removeItem("safetrip_access_token");
    localStorage.removeItem("safetrip_refresh_token");
    localStorage.removeItem("safetrip_user");

    if (typeof onLogout === "function") {
      onLogout();
    }

    window.location.replace("/");
  };
  const [activeMenu, setActiveMenu] = useState("overview");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    resolved: 0,
  });

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedIncident, setSelectedIncident] = useState(null);

  const fetchStats = useCallback(async () => {
    const data = await apiRequest("/incidents/admin-overview/");
    setStats({
      total: data.total ?? 0,
      pending: data.pending ?? 0,
      verified: data.verified ?? 0,
      resolved: data.resolved ?? 0,
    });
  }, []);

  const fetchIncidents = useCallback(async () => {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const query = params.toString();
    const data = await apiRequest(
      `/incidents/${query ? `?${query}` : ""}`
    );

    setIncidents(
      Array.isArray(data) ? data : data.results || []
    );
  }, [search]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([fetchStats(), fetchIncidents()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchStats, fetchIncidents]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const refreshData = async () => {
    setError("");

    try {
      await Promise.all([fetchStats(), fetchIncidents()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateStatus = async (incidentId, newStatus) => {
    const confirmed = window.confirm(
      `Are you sure you want to mark this report as ${newStatus}?`
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError("");

    try {
      const data = await apiRequest(`/incidents/${incidentId}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      await refreshData();

      if (data?.incident) {
        setSelectedIncident(data.incident);
      } else if (selectedIncident?.id === incidentId) {
        setSelectedIncident({
          ...selectedIncident,
          status: newStatus,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const deleteIncident = async (incidentId) => {
    const confirmed = window.confirm(
      "Permanently delete this incident report? This action cannot be undone."
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError("");

    try {
      await apiRequest(`/incidents/${incidentId}/`, {
        method: "DELETE",
      });

      setSelectedIncident(null);
      await refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openIncident = async (incident) => {
    setSelectedIncident(incident);

    try {
      const detail = await apiRequest(`/incidents/${incident.id}/`);
      setSelectedIncident(detail);
    } catch (err) {
      setError(`Could not load report details: ${err.message}`);
    }
  };

  const filteredIncidents = incidents.filter(
    (incident) =>
      statusFilter === "All" || incident.status === statusFilter
  );

  const statCards = [
    {
      title: "Total Reports",
      value: stats.total,
      note: "All submitted incidents",
      icon: "▤",
      color: "text-teal-600",
    },
    {
      title: "Pending Reports",
      value: stats.pending,
      note: "Awaiting verification",
      icon: "◷",
      color: "text-amber-500",
    },
    {
      title: "Verified Reports",
      value: stats.verified,
      note: "Confirmed incidents",
      icon: "✓",
      color: "text-emerald-600",
    },
    {
      title: "Resolved Reports",
      value: stats.resolved,
      note: "Resolved incidents",
      icon: "◆",
      color: "text-blue-600",
    },
  ];

  const menuItems = [
    { id: "overview", label: "Overview", icon: "▦" },
    { id: "incidents", label: "Incident Reports", icon: "⚑" },
  ];

  const IncidentDetails = ({ incident }) => {
    const evidencePhotos = incident.evidence_photos || [];

    return (
      <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex justify-between items-center z-10">
            <div>
              <p className="text-xs uppercase tracking-wider text-teal-600 font-semibold">
                Incident Report #{incident.id}
              </p>
              <h2 className="text-xl font-bold mt-1">Incident Details</h2>
            </div>

            <button
              onClick={() => setSelectedIncident(null)}
              className="text-slate-500 hover:text-slate-900 text-2xl"
              aria-label="Close incident details"
            >
              ×
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-bold">{incident.title}</h3>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  statusStyles[incident.status] ||
                  "bg-slate-100 text-slate-700"
                }`}
              >
                {incident.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Detail label="Incident Type" value={incident.incident_type} />
              <Detail label="Severity" value={incident.severity} />
              <Detail label="Location" value={incident.location_name} />
              <Detail
                label="District"
                value={incident.district_name || incident.district?.name}
              />
              <Detail
                label="Reporter"
                value={
                  incident.reporter_username ||
                  incident.reported_by_username ||
                  incident.reported_by
                }
              />
              <Detail
                label="Reported On"
                value={
                  incident.created_at
                    ? new Date(incident.created_at).toLocaleString()
                    : null
                }
              />
              <Detail label="Latitude" value={incident.latitude} />
              <Detail label="Longitude" value={incident.longitude} />
            </div>

            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm text-slate-600 leading-7 whitespace-pre-wrap">
                {incident.description || "No description provided."}
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Main Incident Image</h4>

              {incident.image_url || incident.image ? (
                <img
                  src={getImageUrl(incident.image_url || incident.image)}
                  alt="Main incident"
                  className="w-full max-h-80 object-contain rounded-xl bg-slate-100"
                />
              ) : (
                <p className="text-sm text-slate-400">
                  No main image uploaded.
                </p>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-3">
                Evidence Photos ({evidencePhotos.length})
              </h4>

              {evidencePhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {evidencePhotos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <img
                        src={getImageUrl(photo.image_url || photo.image)}
                        alt={photo.caption || "Incident evidence"}
                        className="w-full h-40 object-cover rounded-xl bg-slate-100"
                      />
                      <p className="text-xs text-slate-500">
                        {photo.caption || "Evidence photo"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No additional evidence photos.
                </p>
              )}
            </div>

            <div className="border-t border-slate-200 pt-5">
              <h4 className="font-semibold mb-3">Manage Report</h4>

              <div className="flex flex-wrap gap-3">
                {incident.status !== "Verified" && (
                  <button
                    disabled={actionLoading}
                    onClick={() => updateStatus(incident.id, "Verified")}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Processing..." : "Verify Report"}
                  </button>
                )}

                {incident.status !== "Resolved" && (
                  <button
                    disabled={actionLoading}
                    onClick={() => updateStatus(incident.id, "Resolved")}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Mark Resolved
                  </button>
                )}

                <button
                  disabled={actionLoading}
                  onClick={() => deleteIncident(incident.id)}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Delete Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-950 text-white px-5 md:px-8 py-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-wide">
            SAFETRIP <span className="text-teal-400">ADMIN</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Karnataka Travel Safety Management
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold">
              {adminUser?.username || adminUser?.first_name || "Administrator"}
            </p>
            <p className="text-xs text-teal-300">Administrator</p>
          </div>

                    <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-76px)]">
        <aside className="w-64 bg-white border-r border-slate-200 p-5 hidden md:block">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-4">
            Administration
          </p>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left ${
                  activeMenu === item.id
                    ? "bg-teal-50 text-teal-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-10 border-t border-slate-200 pt-5">
            <p className="text-xs text-slate-400 leading-5">
              SafeTrip Karnataka
              <br />
              Admin Management Portal
            </p>
          </div>
        </aside>

        <main className="flex-1 p-5 md:p-8 min-w-0">
          <div className="mb-7 flex flex-wrap justify-between items-end gap-4">
            <div>
              <p className="text-sm text-slate-500">
                SafeTrip Karnataka / Admin
              </p>

              <h2 className="text-2xl font-bold mt-2">
                {activeMenu === "overview"
                  ? "Dashboard Overview"
                  : "Incident Reports"}
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Manage and review community safety reports.
              </p>
            </div>

            <button
              onClick={refreshData}
              disabled={loading}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
            >
              ↻ Refresh
            </button>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              <p className="font-semibold">Dashboard request failed</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-slate-500 mt-4">
                Loading dashboard data...
              </p>
            </div>
          ) : (
            <>
              {activeMenu === "overview" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {statCards.map((stat) => (
                      <StatCard key={stat.title} {...stat} />
                    ))}
                  </div>

                  <div className="mt-7 bg-white border border-slate-200 rounded-2xl p-6">
                    <div className="flex flex-wrap justify-between items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          Recent Incident Reports
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          Latest reports submitted by travelers.
                        </p>
                      </div>

                      <button
                        onClick={() => setActiveMenu("incidents")}
                        className="text-sm text-teal-700 font-semibold hover:underline"
                      >
                        View all reports →
                      </button>
                    </div>

                    <div className="mt-5 space-y-3">
                      {incidents.slice(0, 5).map((incident) => (
                        <button
                          key={incident.id}
                          onClick={() => openIncident(incident)}
                          className="w-full text-left flex flex-wrap justify-between items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30"
                        >
                          <div>
                            <p className="font-semibold text-sm">
                              {incident.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {incident.location_name || "Location unavailable"}
                            </p>
                          </div>

                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              statusStyles[incident.status] ||
                              "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {incident.status}
                          </span>
                        </button>
                      ))}

                      {incidents.length === 0 && (
                        <p className="text-sm text-slate-400 py-5 text-center">
                          No incident reports found.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeMenu === "incidents" && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row gap-3 justify-between">
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") refreshData();
                      }}
                      placeholder="Search reports..."
                      className="w-full lg:max-w-sm px-4 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none"
                    >
                      <option value="All">All statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Verified">Verified</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                          <th className="px-5 py-4">Report</th>
                          <th className="px-5 py-4">Location</th>
                          <th className="px-5 py-4">Severity</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4">Date</th>
                          <th className="px-5 py-4">Action</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredIncidents.map((incident) => (
                          <tr key={incident.id} className="hover:bg-slate-50">
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-800">
                                {incident.title}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                #{incident.id} · {incident.incident_type}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {incident.location_name || "—"}
                            </td>

                            <td className="px-5 py-4">
                              {incident.severity || "—"}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  statusStyles[incident.status] ||
                                  "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {incident.status}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                              {incident.created_at
                                ? new Date(incident.created_at).toLocaleDateString()
                                : "—"}
                            </td>

                            <td className="px-5 py-4">
                              <button
                                onClick={() => openIncident(incident)}
                                className="text-teal-700 font-semibold hover:underline"
                              >
                                Manage report
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredIncidents.length === 0 && (
                    <div className="p-12 text-center text-sm text-slate-400">
                      No matching incident reports found.
                    </div>
                  )}

                  <div className="p-4 border-t border-slate-100 text-xs text-slate-400">
                    Showing {filteredIncidents.length} report(s)
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {selectedIncident && (
        <IncidentDetails incident={selectedIncident} />
      )}
    </div>
  );
}
