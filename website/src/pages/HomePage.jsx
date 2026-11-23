
import React, { useState } from 'react';
import {
  Search,
  Heart,
  Navigation,
  AlertTriangle,
  ShieldCheck,
  Star,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function HomePage({
  setActiveTab,
  setWomenMode,
  setSelectedDistrict,
  onOpenReport
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const fallbackImage =
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80";

  const popularDestinations = [
    {
      name: "Mangaluru",
      category: "Beaches",
      rating: 4.7,
      reviews: "1.2k",
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      tagColor: "bg-cyan-100 text-cyan-800"
    },
    {
      name: "Mysuru",
      category: "Heritage",
      rating: 4.8,
      reviews: "3.1k",
      image:
        "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=800&q=80",
      tagColor: "bg-amber-100 text-amber-800"
    },
    {
      name: "Coorg",
      category: "Hill Station",
      rating: 4.6,
      reviews: "980",
      image:
        "https://images.unsplash.com/photo-1434394354979-a235cd36269d?auto=format&fit=crop&w=800&q=80",
      tagColor: "bg-emerald-100 text-emerald-800"
    },
    {
      name: "Hampi",
      category: "UNESCO",
      rating: 4.7,
      reviews: "920",
      image:
        "https://images.unsplash.com/photo-1627894483216-2138af692e32?auto=format&fit=crop&w=800&q=80",
      tagColor: "bg-purple-100 text-purple-800"
    }
  ];

  // Open all Karnataka tourist places
  const handleViewAll = () => {
    setSelectedDistrict?.('All');
    setActiveTab('places');
  };

  // Open a particular destination
  const handleDestinationClick = (destination) => {
    setSelectedDistrict?.(destination);
    setActiveTab('places');
  };

  // Search for a destination
  const handleSearch = (event) => {
    event.preventDefault();

    const destination = searchQuery.trim();

    if (!destination) {
      handleViewAll();
      return;
    }

    setSelectedDistrict?.(destination);
    setActiveTab('places');
  };

  return (
    <div className="space-y-10 pb-12">

      {/* HERO SECTION */}
      <section className="relative rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-800">

        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
          style={{
            backgroundImage:
              `url('https://images.unsplash.com/photo-1600100397608-f010e423b971?auto=format&fit=crop&w=1800&q=80')`
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center space-y-6">

          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-500/20 backdrop-blur-md border border-teal-400/40 text-teal-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>
              Official Travel Safety & Tourist Intelligence Platform
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Explore Karnataka <br />
            <span className="text-teal-400">
              Beautiful Places. Safer Journeys.
            </span>
          </h1>

          <p className="text-slate-200 text-sm md:text-base max-w-2xl mx-auto font-medium">
            Plan your trips, get real safety insights, and explore Karnataka with confidence.
          </p>

          {/* SEARCH */}
          <form
            onSubmit={handleSearch}
            className="max-w-2xl mx-auto bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-200"
          >
            <div className="pl-3 text-slate-400">
              <Search className="w-5 h-5" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              placeholder="Search destinations... (e.g., Mangaluru, Coorg, Mysuru...)"
              className="flex-1 min-w-0 py-2.5 text-sm bg-transparent border-none outline-none text-slate-900 font-medium placeholder-slate-400"
            />

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-all shadow-md shadow-teal-600/30 flex items-center space-x-1.5"
            >
              <span>Search</span>
            </button>
          </form>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <button
          onClick={() => setActiveTab('plan')}
          className="p-5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white shadow-lg transition-all text-left group flex flex-col justify-between h-32"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-base group-hover:translate-x-1 transition-transform">
              Plan Your Trip
            </h3>
            <p className="text-[11px] text-teal-100 font-medium mt-0.5">
              Custom itineraries & safety briefs
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('route')}
          className="p-5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white shadow-lg transition-all text-left group flex flex-col justify-between h-32"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-base group-hover:translate-x-1 transition-transform">
              Safety Map
            </h3>
            <p className="text-[11px] text-sky-100 font-medium mt-0.5">
              Compare safe vs caution routes
            </p>
          </div>
        </button>

        <button
          onClick={onOpenReport}
          className="p-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg transition-all text-left group flex flex-col justify-between h-32"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-base group-hover:translate-x-1 transition-transform">
              Report Incident
            </h3>
            <p className="text-[11px] text-amber-100 font-medium mt-0.5">
              Crowd-sourced safety alerts
            </p>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab('women');
            setWomenMode(true);
          }}
          className="p-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition-all text-left group flex flex-col justify-between h-32"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h3 className="font-black text-base group-hover:translate-x-1 transition-transform">
              Women Traveler Mode
            </h3>
            <p className="text-[11px] text-rose-100 font-medium mt-0.5">
              Solo safety & pink police booths
            </p>
          </div>
        </button>

      </section>

      {/* POPULAR DESTINATIONS */}
      <section className="space-y-4">

        <div className="flex items-center justify-between">

          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Popular Destinations
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Top safety rated tourist hubs in Karnataka
            </p>
          </div>

          <button
            onClick={handleViewAll}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {popularDestinations.map((dest) => (

            <div
              key={dest.name}
              onClick={() =>
                handleDestinationClick(dest.name)
              }
              className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
            >

              <div className="h-44 overflow-hidden relative">

                <img
                  src={dest.image}
                  alt={dest.name}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = fallbackImage;
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                <span
                  className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold ${dest.tagColor}`}
                >
                  {dest.category}
                </span>

              </div>

              <div className="p-4 space-y-2">

                <div className="flex items-center justify-between">

                  <h3 className="font-bold text-slate-900 text-base">
                    {dest.name}
                  </h3>

                  <div className="flex items-center space-x-1 text-xs font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{dest.rating}</span>
                    <span className="text-slate-400 font-normal">
                      ({dest.reviews})
                    </span>
                  </div>

                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">

                  <span className="flex items-center space-x-1 text-emerald-600 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>High Safety Zone</span>
                  </span>

                  <span className="text-teal-600 font-bold group-hover:translate-x-1 transition-transform">
                    Explore →
                  </span>

                </div>

              </div>
            </div>

          ))}

        </div>
      </section>

    </div>
  );
}
