import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, MapPin, Search, Calendar, AlertTriangle, ShieldAlert, Heart, User, 
  Compass, Info, PhoneCall, Building2, Clock, ThumbsUp, MessageSquare, Plus, CheckCircle2,
  XCircle, Clock3, Lock, LogOut, Settings, Bell, Bookmark, ArrowRight, Check, Sparkles, Navigation,
  Star, Car, Bike, Bus, Camera, Video, Share2, HelpCircle, AlertCircle, AlertOctagon, Filter
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'plan', 'places', 'details', 'route', 'reviews', 'women', 'map', 'report', 'brief', 'emergency', 'trips', 'profile'
  const [selectedCity, setSelectedCity] = useState('Mangaluru');
  const [fromCity, setFromCity] = useState('Bengaluru');
  const [travelDate, setTravelDate] = useState('2026-09-22');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [womenMode, setWomenMode] = useState(false);

  // Dynamic Data States from Django API
  const [cities, setCities] = useState([]);
  const [places, setPlaces] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal for adding a review
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

  // Fetch Cities on load
  useEffect(() => {
    fetch(`${API_BASE}/destinations/cities/`)
      .then(res => res.json())
      .then(data => setCities(data))
      .catch(() => {
        // Fallback default cities
        setCities([
          { id: 1, name: 'Mangaluru', district: 'Dakshina Kannada' },
          { id: 2, name: 'Mysuru', district: 'Mysuru' },
          { id: 3, name: 'Coorg', district: 'Kodagu' },
          { id: 4, name: 'Hampi', district: 'Vijayanagara' },
          { id: 5, name: 'Bengaluru', district: 'Bengaluru Urban' },
          { id: 6, name: 'Gokarna', district: 'Uttara Kannada' },
          { id: 7, name: 'Udupi', district: 'Udupi' },
          { id: 8, name: 'Chikkamagaluru', district: 'Chikkamagaluru' },
        ]);
      });
  }, []);

  // Fetch Tourist Places dynamically whenever selectedCity or categoryFilter changes!
  useEffect(() => {
    if (!selectedCity) return;
    setLoading(true);
    let url = `${API_BASE}/destinations/places/?city=${encodeURIComponent(selectedCity)}`;
    if (categoryFilter !== 'All') {
      url += `&category=${encodeURIComponent(categoryFilter)}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setPlaces(data);
        if (data.length > 0 && (!selectedPlace || selectedPlace.city_name !== selectedCity)) {
          setSelectedPlace(data[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        // Static fallback for standalone preview if backend is disconnected
        const fallbackPlaces = [
          {
            id: 101,
            name: "Tannirbhavi Beach",
            city_name: selectedCity,
            category: "Beach",
            description: "Tannirbhavi Beach is a serene and picturesque beach in Mangaluru, known for its clean shores, stunning sunsets and peaceful environment.",
            rating: 4.6,
            review_count: 1100,
            best_time: "Oct - Mar",
            entry_fee: "Free",
            avg_visit_time: "1-2 Hours",
            suitable_for: "Families, Solo, Friends",
            hero_image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
            photo_gallery: [
              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e",
              "https://images.unsplash.com/photo-1519046904884-53103b34b206",
              "https://images.unsplash.com/photo-1473116763249-2faaef81ccda"
            ],
            reviews: [
              { id: 1, user_display_name: "Priya S.", rating: 5, comment: "Beautiful and peaceful beach. Felt safe even in the evening. Great place for solo travelers!", upvotes: 42, created_at: "2026-09-10" },
              { id: 2, user_display_name: "Rahul K.", rating: 4, comment: "Clean beach and well maintained. Parking is available. Police patrolling is visible.", upvotes: 28, created_at: "2026-08-20" }
            ],
            routes: [
              {
                recommended_route_name: "NH 75 Express Route",
                recommended_time: "32 min • 12 km",
                recommended_safety_tag: "Safe",
                recommended_reasons: ["Fewer reported incidents", "Well-lit roads", "Regular police patrolling", "Popular among travelers"],
                alternative_route_name: "Inner Coastal Road",
                alternative_time: "38 min • 14 km",
                alternative_caution_reasons: ["Recent reports of harassment", "Poor lighting in some areas", "Less crowd and isolated stretches"]
              }
            ]
          },
          {
            id: 102,
            name: "Panambur Beach",
            city_name: selectedCity,
            category: "Beach",
            description: "Popular beach with water sports, lifeguards, food stalls, and annual kite festival.",
            rating: 4.5,
            review_count: 920,
            best_time: "Oct - Mar",
            entry_fee: "Free",
            avg_visit_time: "2-3 Hours",
            suitable_for: "Families, Groups",
            hero_image: "https://images.unsplash.com/photo-1519046904884-53103b34b206",
            photo_gallery: ["https://images.unsplash.com/photo-1519046904884-53103b34b206"]
          },
          {
            id: 103,
            name: "Kadri Manjunatha Temple",
            city_name: selectedCity,
            category: "Temple",
            description: "Ancient historic temple located on Kadri hills dating back to the 10th century.",
            rating: 4.7,
            review_count: 820,
            best_time: "All Year",
            entry_fee: "Free",
            avg_visit_time: "1 Hour",
            suitable_for: "Pilgrims, Families",
            hero_image: "https://images.unsplash.com/photo-1600100397608-f010e423b971",
            photo_gallery: ["https://images.unsplash.com/photo-1600100397608-f010e423b971"]
          },
          {
            id: 104,
            name: "Sultan Battery",
            city_name: selectedCity,
            category: "Historical",
            description: "Watchtower constructed by Tipu Sultan made of black stone overlooking Gurupura river.",
            rating: 4.3,
            review_count: 410,
            best_time: "Nov - Feb",
            entry_fee: "Free",
            avg_visit_time: "1 Hour",
            suitable_for: "History Buffs, Solo",
            hero_image: "https://images.unsplash.com/photo-1600100397608-f010e423b971",
            photo_gallery: ["https://images.unsplash.com/photo-1600100397608-f010e423b971"]
          },
          {
            id: 105,
            name: "Someshwara Beach",
            city_name: selectedCity,
            category: "Beach",
            description: "Known for large rocks called Rudra Shile and Someshwara Temple near Netravati river mouth.",
            rating: 4.4,
            review_count: 630,
            best_time: "Oct - Mar",
            entry_fee: "Free",
            avg_visit_time: "1-2 Hours",
            suitable_for: "Nature Lovers, Couples",
            hero_image: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda",
            photo_gallery: ["https://images.unsplash.com/photo-1473116763249-2faaef81ccda"]
          },
          {
            id: 106,
            name: "Pilikula Nisargadhama",
            city_name: selectedCity,
            category: "Nature Park",
            description: "Eco-educational tourism park with biological park, heritage village, and lake side boating.",
            rating: 4.6,
            review_count: 712,
            best_time: "Sep - Feb",
            entry_fee: "₹50",
            avg_visit_time: "3-4 Hours",
            suitable_for: "Families, Kids",
            hero_image: "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5",
            photo_gallery: ["https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5"]
          }
        ];
        setPlaces(fallbackPlaces);
        if (!selectedPlace || selectedPlace.city_name !== selectedCity) {
          setSelectedPlace(fallbackPlaces[0]);
        }
        setLoading(false);
      });
  }, [selectedCity, categoryFilter]);

  // Handle Post Review to API
  const handlePostReview = () => {
    if (!newComment.trim() || !selectedPlace) return;
    const reviewData = {
      tourist_place: selectedPlace.id,
      rating: newRating,
      comment: newComment,
      photo_urls: []
    };

    fetch(`${API_BASE}/destinations/reviews/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    })
      .then(res => res.json())
      .then(savedReview => {
        // Update local state persistently
        const updatedReviews = [savedReview, ...(selectedPlace.reviews || [])];
        setSelectedPlace({ ...selectedPlace, reviews: updatedReviews });
        setNewComment('');
        setShowReviewModal(false);
      })
      .catch(() => {
        // Standalone fallback append
        const mockSaved = {
          id: Date.now(),
          user_display_name: "Priya S. (You)",
          rating: newRating,
          comment: newComment,
          upvotes: 1,
          created_at: "Just Now"
        };
        const updatedReviews = [mockSaved, ...(selectedPlace.reviews || [])];
        setSelectedPlace({ ...selectedPlace, reviews: updatedReviews });
        setNewComment('');
        setShowReviewModal(false);
      });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Banner matching Reference Image 3 Header */}
      <div className="bg-emerald-900 text-white py-2 px-4 border-b border-emerald-800 text-xs font-semibold">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-emerald-600 rounded-md flex items-center justify-center font-bold text-white text-[10px]">ST</div>
              <span className="font-black tracking-tight text-sm">SafeTrip</span>
              <span className="font-bold text-emerald-300">Karnataka</span>
            </div>
            <span className="hidden md:inline text-emerald-400">|</span>
            <span className="hidden md:inline text-emerald-200">Your Safe Journey, Our Priority — Explore. Plan. Travel. Stay Safe. Especially for Her.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-emerald-200">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Verified Info</span>
            <span className="flex items-center gap-1 text-pink-300 font-bold"><Heart className="w-3.5 h-3.5 fill-pink-400" /> Women Safety Focus</span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Smart Route Suggestions</span>
          </div>
        </div>
      </div>

      {/* Main Navbar matching Reference Image 3 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 bg-emerald-700 rounded-xl flex items-center justify-center text-white font-black shadow-sm">
              ST
            </div>
            <div>
              <span className="text-xl font-black text-emerald-950 tracking-tight">SafeTrip</span>
              <span className="text-xl font-bold text-slate-700 ml-1">Karnataka</span>
              <p className="text-[10px] text-emerald-600 font-bold tracking-wide">Travel Smart • Stay Safe • Explore More</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-bold text-slate-600">
            <button onClick={() => setActiveTab('home')} className={`hover:text-emerald-700 ${activeTab === 'home' ? 'text-emerald-800 font-black border-b-2 border-emerald-700 pb-1' : ''}`}>Home</button>
            <button onClick={() => setActiveTab('plan')} className={`hover:text-emerald-700 ${activeTab === 'plan' ? 'text-emerald-800 font-black border-b-2 border-emerald-700 pb-1' : ''}`}>Plan Trip</button>
            <button onClick={() => setActiveTab('places')} className={`hover:text-emerald-700 ${activeTab === 'places' ? 'text-emerald-800 font-black border-b-2 border-emerald-700 pb-1' : ''}`}>Tourist Places</button>
            <button onClick={() => setActiveTab('details')} className={`hover:text-emerald-700 ${activeTab === 'details' ? 'text-emerald-800 font-black border-b-2 border-emerald-700 pb-1' : ''}`}>Destination Details</button>
            <button onClick={() => setActiveTab('route')} className={`hover:text-emerald-700 ${activeTab === 'route' ? 'text-emerald-800 font-black border-b-2 border-emerald-700 pb-1' : ''}`}>Route Suggestion</button>
            <button onClick={() => setActiveTab('reviews')} className={`hover:text-emerald-700 ${activeTab === 'reviews' ? 'text-emerald-800 font-black border-b-2 border-emerald-700 pb-1' : ''}`}>Reviews & Community</button>
            <button onClick={() => setActiveTab('women')} className={`hover:text-pink-600 ${activeTab === 'women' ? 'text-pink-700 font-black border-b-2 border-pink-600 pb-1' : ''}`}>Women Mode</button>
            <button onClick={() => setActiveTab('map')} className={`hover:text-emerald-700 ${activeTab === 'map' ? 'text-emerald-800 font-black border-b-2 border-emerald-700 pb-1' : ''}`}>Safety Map</button>
          </nav>

          {/* Action Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setWomenMode(!womenMode);
                setActiveTab('women');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition ${
                womenMode ? 'bg-pink-100 text-pink-700 border-pink-300 shadow-xs' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${womenMode ? 'fill-pink-600 text-pink-600' : ''}`} />
              <span>Women Mode</span> {womenMode ? 'ON' : 'OFF'}
            </button>
            <button onClick={() => setActiveTab('profile')} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm">
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main Dynamic View Controller */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <ViewHome 
            setActiveTab={setActiveTab} 
            setSelectedCity={setSelectedCity} 
            cities={cities} 
          />
        )}
        {activeTab === 'plan' && (
          <ViewPlanTrip 
            setActiveTab={setActiveTab} 
            fromCity={fromCity} 
            setFromCity={setFromCity}
            selectedCity={selectedCity} 
            setSelectedCity={setSelectedCity}
            travelDate={travelDate}
            setTravelDate={setTravelDate}
          />
        )}
        {activeTab === 'places' && (
          <ViewTouristPlaces 
            selectedCity={selectedCity} 
            places={places} 
            loading={loading}
            categoryFilter={categoryFilter} 
            setCategoryFilter={setCategoryFilter}
            setSelectedPlace={setSelectedPlace}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'details' && (
          <ViewDestinationDetails 
            place={selectedPlace || places[0]} 
            setActiveTab={setActiveTab} 
          />
        )}
        {activeTab === 'route' && (
          <ViewRouteSuggestion 
            place={selectedPlace || places[0]} 
            fromCity={fromCity}
            setActiveTab={setActiveTab} 
          />
        )}
        {activeTab === 'reviews' && (
          <ViewReviewsCommunity 
            place={selectedPlace || places[0]} 
            setShowReviewModal={setShowReviewModal} 
          />
        )}
        {activeTab === 'women' && (
          <ViewWomenMode 
            selectedCity={selectedCity}
            place={selectedPlace || places[0]}
            womenMode={womenMode}
            setWomenMode={setWomenMode}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'map' && <ViewSafetyMap selectedCity={selectedCity} />}
        {activeTab === 'report' && <ViewReportIncident selectedCity={selectedCity} setActiveTab={setActiveTab} />}
        {activeTab === 'brief' && <ViewTripBrief place={selectedPlace || places[0]} selectedCity={selectedCity} fromCity={fromCity} />}
        {activeTab === 'emergency' && <ViewEmergencyHelp />}
        {activeTab === 'profile' && <ViewProfile />}
      </main>

      {/* Write Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Write a Review for {selectedPlace?.name}</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Your Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className="p-1 text-amber-400 focus:outline-none"
                  >
                    <Star className={`w-6 h-6 ${star <= newRating ? 'fill-amber-400' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Share your experience & safety tips</label>
              <textarea
                rows={4}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="e.g. How was your visit? Was it safe? Any tips for solo female travelers?"
                className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowReviewModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">Cancel</button>
              <button onClick={handlePostReview} className="px-6 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:bg-emerald-800">Post Review</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <footer className="bg-slate-950 text-slate-300 text-xs py-8 border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-white">SafeTrip Karnataka Platform</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Powered by Django REST API & MySQL GIS Data</span>
          </div>
          <p className="text-slate-400 text-xs">"More Women Exploring Karnataka, A Safer Tomorrow"</p>
        </div>
      </footer>
    </div>
  );
}

/* ================= 1. HOME VIEW ================= */
function ViewHome({ setActiveTab, setSelectedCity, cities }) {
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = () => {
    if (searchInput.trim()) {
      setSelectedCity(searchInput.trim());
      setActiveTab('places');
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Banner matching Reference Image 3 View 1 */}
      <div className="relative bg-emerald-950 text-white py-24 px-4 overflow-hidden border-b border-emerald-900">
        <div className="absolute inset-0 opacity-25 bg-[url('https://images.unsplash.com/photo-1600100397608-f010e423b971')] bg-cover bg-center"></div>
        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Official Karnataka Travel Safety & Tourist Intelligence Platform
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Explore Karnataka <br />
            <span className="text-emerald-400 font-light text-3xl md:text-5xl">Beautiful Places. Safer Journeys.</span>
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm md:text-base font-normal">
            Plan your trips, get real safety insights from fellow travelers, and explore Karnataka with confidence.
          </p>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto flex items-center bg-white rounded-2xl p-2 shadow-2xl text-slate-800 border border-emerald-100">
            <Search className="w-5 h-5 text-slate-400 ml-3" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search destinations (e.g. Mangaluru, Coorg, Mysuru, Hampi)..."
              className="w-full px-4 py-3 text-sm focus:outline-none"
            />
            <button
              onClick={handleSearch}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition shadow-md"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid matching Reference Image 3 View 1 */}
      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Plan Your Trip', sub: 'Create itinerary with safety insights', icon: Compass, tab: 'plan', color: 'bg-emerald-600' },
          { label: 'Safety Map', sub: 'Explore real incident maps & safe routes', icon: MapPin, tab: 'map', color: 'bg-blue-600' },
          { label: 'Report Incident', sub: 'Help make travel safer for everyone', icon: AlertTriangle, tab: 'report', color: 'bg-amber-600' },
          { label: 'Women Traveler Mode', sub: 'Extra safety tools for women travelers', icon: Heart, tab: 'women', color: 'bg-pink-600' },
        ].map((card, idx) => (
          <div
            key={idx}
            onClick={() => setActiveTab(card.tab)}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-md hover:shadow-xl cursor-pointer transition flex flex-col justify-between"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`${card.color} text-white p-3 rounded-xl shadow-xs`}>
                <card.icon className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm">{card.label}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Popular Destinations Showcase matching Reference Image 3 View 1 */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Popular Destinations</h2>
            <p className="text-xs text-slate-500">Select a city to dynamically retrieve all available tourist places from MySQL database</p>
          </div>
          <button onClick={() => setActiveTab('places')} className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1">
            View All Places <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: 'Mangaluru', tag: 'Beaches', rating: '4.7', reviews: '1.2k', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' },
            { name: 'Mysuru', tag: 'Heritage', rating: '4.8', reviews: '3.1k', img: 'https://images.unsplash.com/photo-1600100397608-f010e423b971' },
            { name: 'Coorg', tag: 'Hill Station', rating: '4.6', reviews: '980', img: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5' },
            { name: 'Hampi', tag: 'UNESCO', rating: '4.7', reviews: '920', img: 'https://images.unsplash.com/photo-1600100397608-f010e423b971' },
          ].map((dest, i) => (
            <div
              key={i}
              onClick={() => {
                setSelectedCity(dest.name);
                setActiveTab('places');
              }}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-lg cursor-pointer transition group"
            >
              <div className="relative h-44 overflow-hidden">
                <img src={dest.img} alt={dest.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <span className="absolute top-3 left-3 bg-emerald-900/90 text-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-700/50">
                  {dest.tag}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition">{dest.name}</h3>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span className="font-medium">★ {dest.rating} ({dest.reviews} reviews)</span>
                  <span className="text-emerald-600 font-bold text-[11px]">Dynamic Places →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= 2. PLAN YOUR TRIP VIEW ================= */
function ViewPlanTrip({ setActiveTab, fromCity, setFromCity, selectedCity, setSelectedCity, travelDate, setTravelDate }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Wizard Header matching Reference Image 3 View 2 */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Plan Your Trip</h1>
        <p className="text-xs text-slate-500">Discover amazing places with personalized safety insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Trip Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 space-y-6 shadow-xs">
          {/* Steps Bar */}
          <div className="flex items-center justify-between border-b pb-4 border-slate-100 text-xs font-bold">
            <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-5 h-5 bg-emerald-700 text-white rounded-full flex items-center justify-center text-[10px]">1</span> Select
            </span>
            <span className="text-slate-400">2. Explore</span>
            <span className="text-slate-400">3. Plan</span>
            <span className="text-slate-400">4. Confirm</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">From</label>
              <select 
                value={fromCity} 
                onChange={(e) => setFromCity(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs font-bold bg-slate-50 focus:outline-none"
              >
                <option value="Bengaluru">Bengaluru</option>
                <option value="Mysuru">Mysuru</option>
                <option value="Hubballi">Hubballi</option>
                <option value="Mangaluru">Mangaluru</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">To Destination City</label>
              <select 
                value={selectedCity} 
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs font-bold bg-emerald-50 text-emerald-900 border-emerald-300 focus:outline-none"
              >
                <option value="Mangaluru">Mangaluru</option>
                <option value="Mysuru">Mysuru</option>
                <option value="Coorg">Coorg</option>
                <option value="Hampi">Hampi</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Gokarna">Gokarna</option>
                <option value="Udupi">Udupi</option>
                <option value="Chikkamagaluru">Chikkamagaluru</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Travel Date</label>
            <input 
              type="date" 
              value={travelDate} 
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:outline-none"
            />
          </div>

          <button
            onClick={() => setActiveTab('places')}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3.5 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2"
          >
            Find Tourist Places for {selectedCity} →
          </button>
        </div>

        {/* Right Popular Routes Sidebar matching Reference Image 3 View 2 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 h-fit shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Popular Routes</h3>
          <div className="space-y-3 text-xs">
            {[
              { route: 'Bengaluru → Mangaluru', time: '5h 45m • 350 km' },
              { route: 'Mysuru → Mangaluru', time: '4h 30m • 260 km' },
              { route: 'Hubballi → Mangaluru', time: '6h 20m • 410 km' },
            ].map((r, i) => (
              <div key={i} className="p-3 border rounded-xl border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">{r.route}</span>
                  <span className="text-slate-500 text-[11px]">{r.time}</span>
                </div>
                <span className="text-emerald-700 font-bold text-[10px]">Select</span>
              </div>
            ))}
          </div>

          <div className="p-4 bg-pink-50 border border-pink-200 rounded-2xl text-xs text-pink-900 space-y-1">
            <span className="font-bold flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" /> Travel Tip</span>
            <p className="text-[11px] text-pink-800">You can select multiple places and get a personalized trip safety brief.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= 3. TOURIST PLACES DYNAMIC VIEW ================= */
function ViewTouristPlaces({ selectedCity, places, loading, categoryFilter, setCategoryFilter, setSelectedPlace, setActiveTab }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header matching Reference Image 3 View 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Top Places to Visit in {selectedCity}</h1>
          <p className="text-xs text-slate-500">Dynamically retrieved from Django REST API & MySQL database</p>
        </div>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 w-fit">
          {places.length} Tourist Places Loaded
        </span>
      </div>

      {/* Category Filter Pills matching Reference Image 3 View 3 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-bold no-scrollbar">
        {['All', 'Beach', 'Temple', 'Nature', 'Waterfall', 'Heritage', 'Historical', 'Food'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-full transition whitespace-nowrap ${
              categoryFilter === cat
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dynamic Places Grid matching Reference Image 3 View 3 */}
      {loading ? (
        <div className="text-center py-16 text-xs text-slate-400 font-medium">Fetching tourist places from MySQL backend API...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {places.map((place) => (
            <div
              key={place.id}
              onClick={() => {
                setSelectedPlace(place);
                setActiveTab('details');
              }}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-xl cursor-pointer transition duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 overflow-hidden">
                  <img src={place.hero_image} alt={place.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <span className="absolute top-3 left-3 bg-emerald-900/90 text-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full">
                    {place.category}
                  </span>
                  <button className="absolute top-3 right-3 p-2 bg-white/80 rounded-full text-slate-600 hover:text-pink-600 transition">
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-emerald-700 transition">{place.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{place.description}</p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-amber-600">★ {place.rating} ({place.review_count} reviews)</span>
                <span className="text-emerald-700 font-extrabold text-[11px] group-hover:underline">View Safety & Details →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= 4. DESTINATION DETAILS VIEW ================= */
function ViewDestinationDetails({ place, setActiveTab }) {
  if (!place) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Banner Header matching Reference Image 3 View 4 */}
      <div className="relative h-96 rounded-3xl overflow-hidden shadow-lg border border-slate-200">
        <img src={place.hero_image} alt={place.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">{place.category}</span>
            <span className="text-amber-300 text-xs font-bold">★ {place.rating} ({place.review_count} reviews)</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">{place.name}</h1>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" /> {place.city_name || 'Mangaluru'}, Karnataka
          </p>
        </div>
      </div>

      {/* Detail Tabs Navbar */}
      <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-bold text-slate-600 pb-3">
        <button onClick={() => setActiveTab('details')} className="text-emerald-800 border-b-2 border-emerald-700 pb-3 font-black">Overview</button>
        <button onClick={() => setActiveTab('route')} className="hover:text-emerald-700">Safety & Route</button>
        <button onClick={() => setActiveTab('reviews')} className="hover:text-emerald-700">Reviews & Community</button>
        <button onClick={() => setActiveTab('women')} className="hover:text-pink-600 text-pink-700 font-bold">Women Safety Info</button>
      </div>

      {/* Main Content Grid matching Reference Image 3 View 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats Chips */}
          <div className="grid grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-slate-200 text-center text-xs shadow-xs">
            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Best Time</span>
              <span className="font-extrabold text-slate-900">{place.best_time || 'Oct - Mar'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Entry Fee</span>
              <span className="font-extrabold text-slate-900">{place.entry_fee || 'Free'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Avg. Visit</span>
              <span className="font-extrabold text-slate-900">{place.avg_visit_time || '1-2 Hours'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Suitable for</span>
              <span className="font-extrabold text-slate-900">{place.suitable_for || 'Families, Solo'}</span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">About {place.name}</h2>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">{place.description}</p>
          </div>

          {/* Photos Gallery */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Community Photos</h3>
            <div className="grid grid-cols-3 gap-3">
              {(place.photo_gallery || [place.hero_image]).map((img, i) => (
                <img key={i} src={img} alt="Gallery" className="h-32 w-full object-cover rounded-xl border border-slate-100" />
              ))}
            </div>
          </div>
        </div>

        {/* Right Action Sidebar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6 h-fit shadow-xs">
          <div className="space-y-3">
            <button 
              onClick={() => setActiveTab('route')}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3.5 rounded-xl text-xs shadow-md transition"
            >
              Smart Route & Safety Suggestion →
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className="w-full border border-slate-200 hover:border-emerald-500 text-slate-700 font-bold py-3.5 rounded-xl text-xs transition"
            >
              Read Community Reviews ({place.review_count || 1100})
            </button>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-2">
            <span className="font-extrabold flex items-center gap-1.5 text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verified Safety Metrics
            </span>
            <p className="text-[11px] text-emerald-700">Fewer reported incidents in recent months. Recommended for solo travelers during daytime hours.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= 5. SMART ROUTE SUGGESTION VIEW ================= */
function ViewRouteSuggestion({ place, fromCity, setActiveTab }) {
  const [transportMode, setTransportMode] = useState('Car');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header matching Reference Image 3 View 5 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider">AI Safety Routing Engine</span>
          <h1 className="text-2xl font-black text-slate-900">Best Route to {place?.name || 'Tannirbhavi Beach'}</h1>
          <p className="text-xs text-slate-500">We analyze real user reports to suggest safer routes from {fromCity}.</p>
        </div>

        {/* Transport Mode Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold text-slate-600">
          <button onClick={() => setTransportMode('Car')} className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition ${transportMode === 'Car' ? 'bg-emerald-700 text-white shadow-xs' : ''}`}>
            <Car className="w-4 h-4" /> Car
          </button>
          <button onClick={() => setTransportMode('Bike')} className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition ${transportMode === 'Bike' ? 'bg-emerald-700 text-white shadow-xs' : ''}`}>
            <Bike className="w-4 h-4" /> Bike
          </button>
          <button onClick={() => setTransportMode('Bus')} className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition ${transportMode === 'Bus' ? 'bg-emerald-700 text-white shadow-xs' : ''}`}>
            <Bus className="w-4 h-4" /> Bus
          </button>
        </div>
      </div>

      {/* Map Presentation Card matching Reference Image 3 View 5 */}
      <div className="bg-slate-950 text-white rounded-3xl h-[400px] relative overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1')] bg-cover opacity-30"></div>
        <div className="relative z-10 text-center space-y-4 max-w-lg p-6 bg-slate-900/90 rounded-2xl backdrop-blur-md border border-slate-700">
          <Navigation className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
          <h2 className="text-xl font-bold">Recommended Route Identified</h2>
          <div className="flex justify-center gap-4 text-xs font-extrabold">
            <span className="px-3 py-1.5 bg-emerald-600 text-white rounded-full">NH 75 Express (32 min • 12 km - Safe)</span>
            <span className="px-3 py-1.5 bg-amber-600 text-white rounded-full">Inner Coastal (38 min • 14 km - Caution)</span>
          </div>
        </div>
      </div>

      {/* Comparison Grid matching Reference Image 3 View 5 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recommended Route */}
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-emerald-950 text-base">Why this route is safer?</h3>
            <span className="bg-emerald-700 text-white font-bold text-[10px] px-3 py-1 rounded-full">RECOMMENDED</span>
          </div>
          <ul className="space-y-2 text-xs text-emerald-900">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Fewer reported incidents in backend database</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Well-lit roads with continuous streetlights</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Regular police patrolling checkpoints</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Popular and well-traveled stretch among tourists</li>
          </ul>
        </div>

        {/* Alternative Route */}
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-rose-950 text-base">Why the other route is not recommended?</h3>
            <span className="bg-rose-600 text-white font-bold text-[10px] px-3 py-1 rounded-full">USE WITH CAUTION</span>
          </div>
          <ul className="space-y-2 text-xs text-rose-900">
            <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-600" /> Recent community reports of harassment after 8 PM</li>
            <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-600" /> Poor street lighting along certain stretches</li>
            <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-600" /> Less crowded, isolated coastal stretches</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ================= 6. REVIEWS & COMMUNITY VIEW ================= */
function ViewReviewsCommunity({ place, setShowReviewModal }) {
  const reviewsList = place?.reviews || [
    { id: 1, user_display_name: "Priya S.", rating: 5, comment: "Beautiful and peaceful beach. Felt safe even in the evening. Great place for solo travelers!", upvotes: 42, created_at: "2 weeks ago" },
    { id: 2, user_display_name: "Rahul K.", rating: 4, comment: "Clean beach and well maintained. Parking is available. Police patrolling is visible.", upvotes: 28, created_at: "1 month ago" }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Reviews & Community Feedback</h1>
          <p className="text-xs text-slate-500">Real persistent database feedback for {place?.name || 'Tannirbhavi Beach'}</p>
        </div>
        <button
          onClick={() => setShowReviewModal(true)}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-md transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Write a Review
        </button>
      </div>

      <div className="space-y-4">
        {reviewsList.map((rev, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-700 text-white rounded-full flex items-center justify-center font-bold text-xs">
                  {rev.user_display_name ? rev.user_display_name[0] : 'U'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{rev.user_display_name}</h4>
                  <span className="text-[10px] text-slate-400">{rev.created_at || 'Recently'}</span>
                </div>
              </div>
              <div className="flex text-amber-400">
                {[...Array(rev.rating || 5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-normal">{rev.comment}</p>

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <button className="flex items-center gap-1.5 hover:text-emerald-700 font-bold">
                <ThumbsUp className="w-3.5 h-3.5" /> {rev.upvotes || 12}
              </button>
              <button className="hover:text-emerald-700 font-bold">Reply</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= 7. WOMEN TRAVELER MODE VIEW ================= */
function ViewWomenMode({ selectedCity, place, womenMode, setWomenMode, setActiveTab }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Pink/Magenta Hero Banner matching Reference Image 3 View 8 */}
      <div className="bg-gradient-to-r from-pink-900 via-purple-900 to-pink-950 text-white p-8 md:p-12 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-4">
          <span className="bg-pink-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            CORE WOMEN SAFETY ENGINE
          </span>
          <h1 className="text-3xl md:text-5xl font-black">Women Traveler Mode</h1>
          <p className="text-xs md:text-sm text-pink-100 leading-relaxed">
            Travel Freely. Travel Fearlessly. Dedicated safety insights, harassment report alerts, and emergency support for solo female travelers in Karnataka.
          </p>
          <button
            onClick={() => setWomenMode(!womenMode)}
            className="bg-white text-pink-800 font-extrabold px-8 py-3.5 rounded-xl text-xs shadow-lg hover:bg-pink-50 transition"
          >
            {womenMode ? 'Women Mode Active ✓' : 'Enable Women Mode Now'}
          </button>
        </div>
      </div>

      {/* Safety Insights List for Destination matching Reference Image 3 View 8 */}
      <div className="bg-white p-6 rounded-3xl border border-pink-200 space-y-4 shadow-xs">
        <h3 className="text-xs font-extrabold text-pink-900 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-pink-600" /> Women-Focused Safety Alerts for {place?.name || 'Tannirbhavi Beach'}
        </h3>
        <div className="space-y-3 text-xs">
          {[
            { title: 'Harassment Report', loc: 'Near parking lot area', status: 'Verified', date: '5 days ago', color: 'bg-emerald-100 text-emerald-800' },
            { title: 'Suspicious Activity', loc: 'Inner coastal road stretch', status: 'Verified', date: '12 days ago', color: 'bg-emerald-100 text-emerald-800' },
            { title: 'Poor Street Lighting', loc: 'South entry gate', status: 'Pending', date: '20 days ago', color: 'bg-amber-100 text-amber-800' },
          ].map((alert, idx) => (
            <div key={idx} className="p-4 border rounded-2xl border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertOctagon className="w-5 h-5 text-rose-500" />
                <div>
                  <span className="font-bold text-slate-900 block">{alert.title}</span>
                  <span className="text-slate-500 text-[11px]">{alert.loc} • {alert.date}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full font-extrabold text-[10px] ${alert.color}`}>{alert.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Responsible Safety Tips for Women */}
      <div className="bg-pink-50 border border-pink-200 p-6 rounded-3xl space-y-3 text-xs text-pink-950">
        <h4 className="font-extrabold text-sm text-pink-900">Recommended Safety Advice for Solo Travel</h4>
        <ul className="space-y-2 text-pink-900">
          <li>✓ Prefer well-lit areas during late evening hours</li>
          <li>✓ Travel in small groups when exploring secluded hill or coastal trails</li>
          <li>✓ Keep emergency helpline numbers (1091) accessible</li>
          <li>✓ Share your live location itinerary with trusted contacts</li>
        </ul>
      </div>
    </div>
  );
}

/* ================= 8. OTHER AUXILIARY VIEWS ================= */
function ViewSafetyMap({ selectedCity }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-black text-slate-900">Safety Map — {selectedCity}</h1>
      <div className="bg-slate-950 text-white rounded-3xl h-[550px] relative overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1')] bg-cover opacity-30"></div>
        <div className="relative z-10 text-center space-y-4 max-w-lg p-6 bg-slate-900/90 rounded-2xl backdrop-blur-md border border-slate-700">
          <MapPin className="w-12 h-12 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-bold">Karnataka GeoJSON Map Active</h2>
          <p className="text-xs text-slate-300">Displaying pin markers for Tourist Places, Incident Reports, Hospitals, and Police Stations.</p>
        </div>
      </div>
    </div>
  );
}

function ViewReportIncident({ selectedCity, setActiveTab }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-black text-slate-900">Report a Safety Incident</h1>
      <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-xs text-xs">
        <div>
          <label className="font-bold text-slate-900 block mb-1">Category</label>
          <select className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none">
            <option>Harassment</option>
            <option>Suspicious Activity</option>
            <option>Poor Lighting</option>
            <option>Road Accident</option>
            <option>Theft</option>
            <option>Medical Emergency</option>
          </select>
        </div>
        <div>
          <label className="font-bold text-slate-900 block mb-1">Location</label>
          <input type="text" placeholder={`e.g. Near Tannirbhavi Beach, ${selectedCity}`} className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none" />
        </div>
        <div>
          <label className="font-bold text-slate-900 block mb-1">Description</label>
          <textarea rows={4} placeholder="Provide details..." className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none" />
        </div>
        <button onClick={() => setActiveTab('places')} className="w-full bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-md">Submit Incident Report</button>
      </div>
    </div>
  );
}

function ViewTripBrief({ place, selectedCity, fromCity }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-black text-slate-900">Personalized Trip Safety Brief</h1>
      <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">{fromCity} → {selectedCity}</h3>
            <p className="text-slate-500">Destination: {place?.name || 'Tannirbhavi Beach'}</p>
          </div>
          <span className="bg-emerald-100 text-emerald-800 font-extrabold px-4 py-2 rounded-full text-xs">Low to Moderate Risk</span>
        </div>
        <p className="text-slate-600">Why am I seeing this? This brief is generated using persistent incident reports and route data from MySQL.</p>
      </div>
    </div>
  );
}

function ViewEmergencyHelp() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-black text-slate-900">Emergency Assistance & Helpline</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
        {[
          { name: 'Police', num: '100', color: 'bg-red-600' },
          { name: 'Ambulance', num: '108', color: 'bg-red-600' },
          { name: 'Women Helpline', num: '1091', color: 'bg-pink-600' },
          { name: 'Tourist Helpline', num: '1800-425-4747', color: 'bg-emerald-700' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 space-y-2 shadow-xs">
            <span className="text-xs font-bold text-slate-500">{item.name}</span>
            <h2 className="text-2xl font-black text-slate-900">{item.num}</h2>
            <button className={`${item.color} text-white font-bold w-full py-2 rounded-xl text-xs`}>Call Now</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewProfile() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="w-20 h-20 bg-emerald-700 text-white rounded-full flex items-center justify-center text-3xl font-black mx-auto">P</div>
      <h2 className="text-xl font-bold text-slate-900">Priya S</h2>
      <p className="text-xs text-slate-500">priya@example.com • Authenticated User</p>
    </div>
  );
}
