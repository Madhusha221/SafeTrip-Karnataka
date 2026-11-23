
import React, { useEffect, useMemo, useState } from "react";
import {
  Star, Heart, ThumbsUp, MessageSquare, Camera, Video,
  PenTool, Image as ImageIcon, MapPin, Search, SlidersHorizontal,
  Send, X, ChevronDown, Users, Award, TrendingUp, Loader2,
  RefreshCw, Map, CalendarDays
} from "lucide-react";

const API_BASE = "http://127.0.0.1:8000/api";

const getToken = () => localStorage.getItem("safetrip_access_token");

const getHeaders = (json = true) => {
  const headers = {};
  const token = getToken();

  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";

  return headers;
};

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const formatDate = (date) => {
  if (!date) return "Recently";

  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );

  if (!Number.isFinite(seconds)) return "Recently";
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

export default function ReviewsCommunityPage() {
  const [activeTab, setActiveTab] = useState("reviews");

  const [reviews, setReviews] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [places, setPlaces] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedPlace, setSelectedPlace] = useState("All Places");
  const [selectedRating, setSelectedRating] = useState("All Ratings");
  const [sortBy, setSortBy] = useState("recent");

  const [showReviewModal, setShowReviewModal] = useState(false);

  const [newReview, setNewReview] = useState({
    place: "",
    rating: 5,
    comment: "",
    is_solo_female: false
  });

  const loadCommunityData = async () => {
    setLoading(true);
    setError("");

    try {
      const [reviewsResponse, photosResponse, placesResponse, districtsResponse] =
        await Promise.all([
          fetch(`${API_BASE}/reviews/`),
          fetch(`${API_BASE}/place-photos/`),
          fetch(`${API_BASE}/places/`),
          fetch(`${API_BASE}/districts/`)
        ]);

      if (!reviewsResponse.ok || !photosResponse.ok ||
          !placesResponse.ok || !districtsResponse.ok) {
        throw new Error("Unable to load community information.");
      }

      const [reviewData, photoData, placeData, districtData] =
        await Promise.all([
          reviewsResponse.json(),
          photosResponse.json(),
          placesResponse.json(),
          districtsResponse.json()
        ]);

      setReviews(getList(reviewData));
      setPhotos(getList(photoData));
      setPlaces(getList(placeData));
      setDistricts(getList(districtData));
    } catch (err) {
      setError(err.message || "Something went wrong while loading.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunityData();
  }, []);

  const getPlace = (placeId) =>
    places.find((place) => String(place.id) === String(placeId));

  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    if (selectedDistrict !== "All Districts") {
      result = result.filter((review) => {
        const place = getPlace(review.place);
        return place?.district_name === selectedDistrict;
      });
    }

    if (selectedPlace !== "All Places") {
      result = result.filter(
        (review) => String(review.place) === selectedPlace
      );
    }

    if (selectedRating !== "All Ratings") {
      result = result.filter(
        (review) => Number(review.rating) === Number(selectedRating)
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase();

      result = result.filter((review) => {
        const place = getPlace(review.place);

        return (
          (review.comment || "").toLowerCase().includes(term) ||
          (review.user_name || review.username || "").toLowerCase().includes(term) ||
          (place?.name || "").toLowerCase().includes(term) ||
          (place?.district_name || "").toLowerCase().includes(term)
        );
      });
    }

    if (sortBy === "recent") {
      result.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    } else if (sortBy === "oldest") {
      result.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
    } else if (sortBy === "rating") {
      result.sort((a, b) => Number(b.rating) - Number(a.rating));
    }

    return result;
  }, [reviews, places, selectedDistrict, selectedPlace, selectedRating, search, sortBy]);

  const filteredPhotos = useMemo(() => {
    let result = [...photos];

    if (selectedDistrict !== "All Districts") {
      result = result.filter((photo) => {
        const place = getPlace(photo.place);
        return place?.district_name === selectedDistrict;
      });
    }

    if (selectedPlace !== "All Places") {
      result = result.filter(
        (photo) => String(photo.place) === selectedPlace
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase();

      result = result.filter((photo) => {
        const place = getPlace(photo.place);

        return (
          (photo.caption || "").toLowerCase().includes(term) ||
          (photo.username || "").toLowerCase().includes(term) ||
          (place?.name || "").toLowerCase().includes(term)
        );
      });
    }

    return result;
  }, [photos, places, selectedDistrict, selectedPlace, search]);

  const averageRating = reviews.length
    ? (
        reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
        reviews.length
      ).toFixed(1)
    : "0.0";

  const handleAddReview = async (e) => {
    e.preventDefault();

    if (!getToken()) {
      alert("Please log in before writing a review.");
      return;
    }

    if (!newReview.place) {
      alert("Please select a tourist place.");
      return;
    }

    if (!newReview.comment.trim()) {
      alert("Please write your experience.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/reviews/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          place: Number(newReview.place),
          rating: newReview.rating,
          comment: newReview.comment.trim(),
          is_solo_female: newReview.is_solo_female
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          data.error ||
          "Unable to submit your review."
        );
      }

      setShowReviewModal(false);
      setNewReview({
        place: "",
        rating: 5,
        comment: "",
        is_solo_female: false
      });

      await loadCommunityData();
      alert("Your review was published successfully!");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedDistrict("All Districts");
    setSelectedPlace("All Places");
    setSelectedRating("All Ratings");
    setSortBy("recent");
  };

  const currentCount =
    activeTab === "reviews"
      ? filteredReviews.length
      : activeTab === "photos"
      ? filteredPhotos.length
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">

      {/* COMMUNITY HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-950 via-teal-800 to-emerald-700">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center" />

        <div className="relative max-w-[1500px] mx-auto px-6 py-12 md:py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white mb-5">
              <Users className="w-4 h-4" />
              SAFETRIP KARNATAKA COMMUNITY
            </span>

            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
              Travel Together.
              <br />
              Share Your Experience.
            </h1>

            <p className="text-teal-50 text-sm md:text-base mt-4 max-w-xl leading-relaxed">
              Discover authentic experiences, helpful reviews and real
              travel photographs shared by travellers across Karnataka.
            </p>

            <button
              onClick={() => setShowReviewModal(true)}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-teal-800 shadow-lg hover:bg-teal-50 transition"
            >
              <PenTool className="w-4 h-4" />
              Share Your Experience
            </button>
          </div>
        </div>
      </div>

      {/* COMMUNITY STATISTICS */}
      <div className="max-w-[1500px] mx-auto px-5 -mt-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Traveller Reviews",
              value: reviews.length,
              icon: MessageSquare
            },
            {
              label: "Community Photos",
              value: photos.length,
              icon: Camera
            },
            {
              label: "Tourist Places",
              value: places.length,
              icon: MapPin
            },
            {
              label: "Average Rating",
              value: averageRating,
              icon: Star
            }
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>

                <div>
                  <p className="text-xl font-black text-slate-900">
                    {item.value}
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    {item.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN THREE COLUMN LAYOUT */}
      <div className="max-w-[1500px] mx-auto px-5 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT FILTER SIDEBAR */}
          <aside className="lg:col-span-3 space-y-5">

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-5">
                <SlidersHorizontal className="w-5 h-5 text-teal-700" />
                <h2 className="font-black text-slate-900">Filter Community</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-2">
                    Search
                  </label>

                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search reviews or places..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-2">
                    District
                  </label>

                  <select
                    value={selectedDistrict}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value);
                      setSelectedPlace("All Places");
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-teal-500"
                  >
                    <option>All Districts</option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.name}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-2">
                    Tourist Place
                  </label>

                  <select
                    value={selectedPlace}
                    onChange={(e) => setSelectedPlace(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-teal-500"
                  >
                    <option value="All Places">All Places</option>

                    {places
                      .filter(
                        (place) =>
                          selectedDistrict === "All Districts" ||
                          place.district_name === selectedDistrict
                      )
                      .map((place) => (
                        <option key={place.id} value={String(place.id)}>
                          {place.name}
                        </option>
                      ))}
                  </select>
                </div>

                {activeTab === "reviews" && (
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-2">
                      Rating
                    </label>

                    <select
                      value={selectedRating}
                      onChange={(e) => setSelectedRating(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-teal-500"
                    >
                      <option>All Ratings</option>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <option key={rating} value={String(rating)}>
                          {rating} Stars
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={resetFilters}
                  className="w-full rounded-xl border border-teal-200 bg-teal-50 py-2.5 text-xs font-bold text-teal-700 hover:bg-teal-100"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-800 to-emerald-700 rounded-2xl p-5 text-white shadow-sm">
              <Camera className="w-7 h-7 mb-3" />
              <h3 className="font-black text-lg">Your Experience Matters!</h3>
              <p className="text-xs text-teal-50 leading-relaxed mt-2">
                Help other travellers explore Karnataka with confidence.
                Share your genuine experiences and photographs.
              </p>

              <button
                onClick={() => setShowReviewModal(true)}
                className="mt-4 bg-white text-teal-800 rounded-xl px-4 py-2.5 text-xs font-bold hover:bg-teal-50"
              >
                Write a Review
              </button>
            </div>

          </aside>

          {/* CENTRE COMMUNITY FEED */}
          <main className="lg:col-span-6 space-y-5">

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Community Feed
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Real experiences from travellers
                  </p>
                </div>

                <button
                  onClick={loadCommunityData}
                  className="flex items-center gap-2 text-xs font-bold text-teal-700 hover:text-teal-900"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              <div className="flex gap-2 mt-5 border-b border-slate-100 pb-3 overflow-x-auto">
                {[
                  { id: "reviews", label: "Reviews", count: reviews.length, icon: MessageSquare },
                  { id: "photos", label: "Photos", count: photos.length, icon: ImageIcon },
                  { id: "videos", label: "Videos", count: 0, icon: Video }
                ].map((tab) => {
                  const Icon = tab.icon;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                        activeTab === tab.id
                          ? "bg-teal-700 text-white shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label} ({tab.count})
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-slate-500">
                  Showing <strong>{currentCount}</strong> contributions
                </p>

                {activeTab === "reviews" && (
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 outline-none"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="oldest">Oldest First</option>
                    <option value="rating">Highest Rating</option>
                  </select>
                )}
              </div>
            </div>

            {loading && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto" />
                <p className="text-sm text-slate-500 mt-3">
                  Loading community contributions...
                </p>
              </div>
            )}

            {!loading && error && (
              <div className="bg-white rounded-2xl border border-red-200 p-6 text-center">
                <p className="text-sm text-red-600 font-semibold">{error}</p>
                <button
                  onClick={loadCommunityData}
                  className="mt-4 text-xs font-bold text-teal-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && activeTab === "reviews" && (
              <div className="space-y-4">
                {filteredReviews.map((review) => {
                  const place = getPlace(review.place);
                  const author =
                    review.user_name || review.username || "Traveller";

                  const reviewPhotos = photos.filter(
                    (photo) => String(photo.place) === String(review.place)
                  );

                  return (
                    <article
                      key={review.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {review.user_avatar ? (
                            <img
                              src={review.user_avatar}
                              alt={author}
                              className="w-11 h-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-black">
                              {author.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <h3 className="text-sm font-black text-slate-900">
                              {author}
                            </h3>

                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(review.created_at)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 bg-amber-50 rounded-lg px-2.5 py-1.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-black text-amber-700">
                            {review.rating}
                          </span>
                        </div>
                      </div>

                      {place && (
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 text-teal-800 px-3 py-1.5 text-[11px] font-bold">
                            <MapPin className="w-3 h-3" />
                            {place.name}
                          </span>

                          <span className="text-[11px] text-slate-400">
                            {place.district_name}
                          </span>
                        </div>
                      )}

                      {review.is_solo_female && (
                        <span className="inline-block mt-3 rounded-full bg-rose-50 text-rose-700 px-3 py-1 text-[10px] font-bold">
                          Solo Female Traveller
                        </span>
                      )}

                      <p className="text-sm text-slate-700 leading-relaxed mt-4 whitespace-pre-line">
                        {review.comment}
                      </p>

                      {reviewPhotos.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          {reviewPhotos.slice(0, 4).map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.image_url || photo.image}
                              alt={photo.caption || "Traveller photograph"}
                              className="w-full h-36 object-cover rounded-xl"
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-6 border-t border-slate-100 mt-5 pt-4 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <ThumbsUp className="w-4 h-4" />
                          {review.helpful_count || 0} Helpful
                        </span>

                        <span className="flex items-center gap-1.5 text-slate-400">
                          <MessageSquare className="w-4 h-4" />
                          Replies not available yet
                        </span>
                      </div>
                    </article>
                  );
                })}

                {filteredReviews.length === 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="font-bold text-slate-800 mt-3">
                      No reviews found
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">
                      Try changing your filters or be the first to share an experience.
                    </p>
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="mt-4 bg-teal-700 text-white rounded-xl px-5 py-2.5 text-xs font-bold"
                    >
                      Write a Review
                    </button>
                  </div>
                )}
              </div>
            )}

            {!loading && !error && activeTab === "photos" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                {filteredPhotos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredPhotos.map((photo) => {
                      const place = getPlace(photo.place);

                      return (
                        <div
                          key={photo.id}
                          className="rounded-xl border border-slate-200 overflow-hidden"
                        >
                          <img
                            src={photo.image_url || photo.image}
                            alt={photo.caption || "Community photograph"}
                            className="w-full h-56 object-cover"
                          />

                          <div className="p-4">
                            <h3 className="font-bold text-sm text-slate-900">
                              {place?.name || "Tourist Place"}
                            </h3>

                            <p className="text-xs text-slate-500 mt-1">
                              {photo.caption || "Shared by a traveller"}
                            </p>

                            <div className="flex justify-between items-center mt-3 text-[11px] text-slate-400">
                              <span>{photo.username || "Traveller"}</span>
                              <span>{formatDate(photo.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="font-bold text-slate-800 mt-3">
                      No community photos found
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">
                      Photos uploaded by travellers will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!loading && !error && activeTab === "videos" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Video className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-black text-slate-800 mt-4">
                  Community Videos
                </h3>
                <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
                  Video sharing is not connected yet. We'll add video uploads
                  and the video gallery in a later development step.
                </p>
              </div>
            )}

          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="lg:col-span-3 space-y-5">

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-black text-slate-900">
                Share with Community
              </h2>

              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Your experience can help another traveller plan a safer trip.
              </p>

              <button
                onClick={() => setShowReviewModal(true)}
                className="w-full mt-4 rounded-xl bg-teal-700 text-white py-3 text-xs font-bold flex items-center justify-center gap-2 hover:bg-teal-800"
              >
                <PenTool className="w-4 h-4" />
                Write a Review
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-teal-700" />
                <h2 className="font-black text-slate-900">
                  Community Highlights
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Total Reviews
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Shared experiences
                    </p>
                  </div>
                  <span className="text-lg font-black text-teal-700">
                    {reviews.length}
                  </span>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Total Photos
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Traveller uploads
                    </p>
                  </div>
                  <span className="text-lg font-black text-teal-700">
                    {photos.length}
                  </span>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Average Rating
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Across community reviews
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-lg font-black text-amber-600">
                    {averageRating}
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-amber-500" />
                <h2 className="font-black text-slate-900">
                  Top Contributors
                </h2>
              </div>

              <div className="space-y-3">
                {(() => {
                  const contributors = {};

                  reviews.forEach((review) => {
                    const name =
                      review.user_name || review.username || "Traveller";

                    contributors[name] = (contributors[name] || 0) + 1;
                  });

                  const top = Object.entries(contributors)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);

                  return top.length ? (
                    top.map(([name, count], index) => (
                      <div
                        key={name}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center text-xs font-black">
                            {name.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {count} {count === 1 ? "review" : "reviews"}
                            </p>
                          </div>
                        </div>

                        {index === 0 && (
                          <Award className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">
                      Contributors will appear when reviews are shared.
                    </p>
                  );
                })()}
              </div>
            </div>

            <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
              <Map className="w-6 h-6 text-teal-700 mb-3" />
              <h3 className="font-black text-teal-950 text-sm">
                Explore Karnataka
              </h3>
              <p className="text-xs text-teal-800 mt-2 leading-relaxed">
                Discover places and learn from the experiences of other
                travellers.
              </p>
            </div>

          </aside>
        </div>
      </div>

      {/* WRITE REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8">

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Write a Review
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Share your real travel experience.
                </p>
              </div>

              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-5 mt-5">

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Tourist Place
                </label>

                <select
                  value={newReview.place}
                  onChange={(e) =>
                    setNewReview({ ...newReview, place: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
                >
                  <option value="">Choose a place</option>

                  {places.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.name} — {place.district_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Your Rating
                </label>

                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() =>
                        setNewReview({ ...newReview, rating: star })
                      }
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= newReview.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    </button>
                  ))}

                  <span className="text-xs font-bold text-slate-600 ml-2">
                    {newReview.rating}/5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Share Your Experience
                </label>

                <textarea
                  rows="5"
                  value={newReview.comment}
                  onChange={(e) =>
                    setNewReview({ ...newReview, comment: e.target.value })
                  }
                  placeholder="How was your visit? Share your experience and helpful travel tips..."
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <label className="flex items-center gap-3 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={newReview.is_solo_female}
                  onChange={(e) =>
                    setNewReview({
                      ...newReview,
                      is_solo_female: e.target.checked
                    })
                  }
                  className="w-4 h-4 accent-teal-700"
                />
                I am sharing this review as a solo female traveller.
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white py-3 font-bold text-sm flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publish Review
                  </>
                )}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
