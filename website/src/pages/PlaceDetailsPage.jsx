import React, { useEffect, useState } from 'react';
import {
  Star,
  ShieldCheck,
  MapPin,
  Clock,
  DollarSign,
  Bookmark,
  ArrowLeft,
  Navigation,
  ExternalLink,
  Phone,
  AlertTriangle,
  Info,
  Image as ImageIcon,
  Users,
  CheckCircle2,
  Map,
  Tag,
  Heart
} from 'lucide-react';



export default function PlaceDetailsPage({
  place,
  setActiveTab,
  onOpenBrief,
  onOpenRoute,
}) {


  const [activeTab, setSubTab] = useState('overview');

const API_BASE = "http://127.0.0.1:8000/api";

// Community Reviews and Photos
const [communityReviews, setCommunityReviews] = useState([]);
const [communityPhotos, setCommunityPhotos] = useState([]);
const [reviewRating, setReviewRating] = useState(5);
const [reviewComment, setReviewComment] = useState("");
const [photoCaption, setPhotoCaption] = useState("");
const [selectedPhoto, setSelectedPhoto] = useState(null);
const [communityLoading, setCommunityLoading] = useState(false);
const [communityError, setCommunityError] = useState("");
const [communitySuccess, setCommunitySuccess] = useState("");

// Safety Incidents
const [incidents, setIncidents] = useState([]);
const [incidentLoading, setIncidentLoading] = useState(false);

// New Incident Report Form
const [incidentTitle, setIncidentTitle] = useState("");
const [incidentType, setIncidentType] = useState("");
const [incidentSeverity, setIncidentSeverity] = useState("Medium");
const [incidentDescription, setIncidentDescription] = useState("");

// Photo Upload Selection
const [shareType, setShareType] = useState("place");
const [selectedIncidentId, setSelectedIncidentId] = useState("");
const [evidenceFiles, setEvidenceFiles] = useState([]);
const [evidenceCaption, setEvidenceCaption] = useState("");

  const getAccessToken = () =>
    localStorage.getItem("safetrip_access_token");

  const getErrorMessage = (data) => {
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.error === "string") return data.error;

    if (data && typeof data === "object") {
      const firstValue = Object.values(data).flat()[0];
      if (typeof firstValue === "string") return firstValue;
    }

    return "Something went wrong. Please try again.";
  };

  const loadCommunityData = async (placeId) => {
  if (!placeId) return;

  setCommunityError("");
  setIncidentLoading(true);

  try {
    const [reviewsResponse, photosResponse, incidentsResponse] =
      await Promise.all([
        fetch(`${API_BASE}/reviews/?place=${placeId}`),
        fetch(`${API_BASE}/place-photos/?place=${placeId}`),
        fetch(`${API_BASE}/incidents/?place=${placeId}`)
      ]);

    if (
      !reviewsResponse.ok ||
      !photosResponse.ok ||
      !incidentsResponse.ok
    ) {
      throw new Error("Could not load place information.");
    }

    const [reviewsData, photosData, incidentsData] =
      await Promise.all([
        reviewsResponse.json(),
        photosResponse.json(),
        incidentsResponse.json()
      ]);

    const reviews = Array.isArray(reviewsData)
      ? reviewsData
      : reviewsData.results || [];

    const photos = Array.isArray(photosData)
      ? photosData
      : photosData.results || [];

    const reports = Array.isArray(incidentsData)
      ? incidentsData
      : incidentsData.results || [];

    setCommunityReviews(reviews);
    setCommunityPhotos(photos);
    setIncidents(reports);

    setSelectedIncidentId((previousId) =>
      reports.some(
        (incident) =>
          String(incident.id) === String(previousId)
      )
        ? previousId
        : ""
    );

  } catch (error) {
    setCommunityError(error.message);
  } finally {
    setIncidentLoading(false);
  }
};

 useEffect(() => {
  setCommunityReviews([]);
  setCommunityPhotos([]);
  setIncidents([]);
  setSelectedIncidentId("");
  setCommunityError("");
  setCommunitySuccess("");

  if (place?.id) {
    loadCommunityData(place.id);
  }
}, [place?.id]);

const deleteReview = async (reviewId) => {
  if (!window.confirm("Are you sure you want to delete this review?")) {
    return;
  }

  const token = getAccessToken();

  if (!token) {
    setCommunityError("Please sign in to delete your review.");
    return;
  }

  setCommunityLoading(true);
  setCommunityError("");
  setCommunitySuccess("");

  try {
    const response = await fetch(`${API_BASE}/reviews/${reviewId}/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(getErrorMessage(data));
    }

    setCommunitySuccess("Review deleted successfully.");
    await loadCommunityData(place.id);
  } catch (error) {
    setCommunityError(error.message);
  } finally {
    setCommunityLoading(false);
  }
};

const deletePlacePhoto = async (photoId) => {
  if (!window.confirm("Are you sure you want to delete this photo?")) {
    return;
  }

  const token = getAccessToken();

  if (!token) {
    setCommunityError("Please sign in to delete your photo.");
    return;
  }

  setCommunityLoading(true);
  setCommunityError("");
  setCommunitySuccess("");

  try {
    const response = await fetch(`${API_BASE}/place-photos/${photoId}/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(getErrorMessage(data));
    }

    setCommunitySuccess("Photo deleted successfully.");
    await loadCommunityData(place.id);
  } catch (error) {
    setCommunityError(error.message);
  } finally {
    setCommunityLoading(false);
  }
};

const submitReview = async (event) => {
  event.preventDefault();
  setCommunityError("");
  setCommunitySuccess("");

  const token = getAccessToken();

  if (!token) {
    setCommunityError("Please sign in before submitting a review.");
    return;
  }

  if (!reviewComment.trim()) {
    setCommunityError("Please enter your review.");
    return;
  }

  setCommunityLoading(true);

  try {
    const response = await fetch(`${API_BASE}/reviews/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        place: place.id,
        rating: Number(reviewRating),
        comment: reviewComment.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(data));
    }

    setReviewComment("");
    setReviewRating(5);
    setCommunitySuccess("Review submitted successfully.");

    await loadCommunityData(place.id);
  } catch (error) {
    setCommunityError(error.message);
  } finally {
    setCommunityLoading(false);
  }
};

const uploadPlacePhoto = async (event) => {
  event.preventDefault();
  setCommunityError("");
  setCommunitySuccess("");

  const token = getAccessToken();

  if (!token) {
    setCommunityError("Please sign in before uploading a photo.");
    return;
  }

  if (!selectedPhoto) {
    setCommunityError("Please select a photo.");
    return;
  }

  if (!selectedPhoto.type.startsWith("image/")) {
    setCommunityError("Please select a valid image file.");
    return;
  }

  const formData = new FormData();
  formData.append("place", place.id);
  formData.append("image", selectedPhoto);
  formData.append("caption", photoCaption.trim());

  setCommunityLoading(true);

  try {
    const response = await fetch(`${API_BASE}/place-photos/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(getErrorMessage(data));
    }

    setSelectedPhoto(null);
    setPhotoCaption("");
    event.target.reset();
    setCommunitySuccess("Photo uploaded successfully.");

    await loadCommunityData(place.id);
  } catch (error) {
    setCommunityError(error.message);
  } finally {
    setCommunityLoading(false);
  }
};
// ============================================================
// SUBMIT NEW SAFETY INCIDENT REPORT
// ============================================================

const submitIncidentReport = async (event) => {
  event.preventDefault();

  setCommunityError("");
  setCommunitySuccess("");

  const token = getAccessToken();

  if (!token) {
    setCommunityError("Please sign in before reporting an incident.");
    return;
  }

  if (!place?.id) {
    setCommunityError("Tourist place information is missing.");
    return;
  }

  if (!incidentTitle.trim()) {
    setCommunityError("Please enter an incident title.");
    return;
  }

  if (!incidentType) {
    setCommunityError("Please select an incident category.");
    return;
  }

  if (!incidentDescription.trim()) {
    setCommunityError("Please describe the incident.");
    return;
  }

  setCommunityLoading(true);

  try {
    const response = await fetch(`${API_BASE}/incidents/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        place: place.id,
        district: place.district,
        title: incidentTitle.trim(),
        location_name: place.name,
        incident_type: incidentType,
        severity: incidentSeverity,
        description: incidentDescription.trim(),
        latitude: place.latitude,
        longitude: place.longitude,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(getErrorMessage(data));
    }

    // Clear the form
    setIncidentTitle("");
    setIncidentType("");
    setIncidentSeverity("Medium");
    setIncidentDescription("");

    setCommunitySuccess(
      "Incident report submitted successfully. It is awaiting verification."
    );

    // Refresh incidents for the selected tourist place
    await loadCommunityData(place.id);

  } catch (error) {
    setCommunityError(error.message);
  } finally {
    setCommunityLoading(false);
  }
};

  // ============================================================
  // REAL PLACE DATA ONLY
  // No fake tourist place / image / rating data.
  // ============================================================
const uploadIncidentEvidence = async (event) => {
  event.preventDefault();
  setCommunityError("");
  setCommunitySuccess("");

  const token = getAccessToken();

  if (!token) {
    setCommunityError("Please sign in before uploading incident evidence.");
    return;
  }

  if (!selectedIncidentId) {
    setCommunityError("Please select an incident.");
    return;
  }

  if (evidenceFiles.length === 0) {
    setCommunityError("Please select at least one photo.");
    return;
  }

  const invalidFile = evidenceFiles.find(
    (file) => !file.type.startsWith("image/")
  );

  if (invalidFile) {
    setCommunityError("Please select valid image files only.");
    return;
  }

  const formData = new FormData();

  evidenceFiles.forEach((file) => {
    formData.append("images", file);
  });

  formData.append("caption", evidenceCaption.trim());

  setCommunityLoading(true);

  try {
    const response = await fetch(
      `${API_BASE}/incidents/${selectedIncidentId}/evidence-photos/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(getErrorMessage(data));
    }

    setEvidenceFiles([]);
    setEvidenceCaption("");
    event.target.reset();

    setCommunitySuccess("Incident evidence uploaded successfully.");

    await loadCommunityData(place.id);
  } catch (error) {
    setCommunityError(error.message);
  } finally {
    setCommunityLoading(false);
  }
};
  if (!place) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4">

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center">

          <Info className="w-12 h-12 mx-auto text-slate-400 mb-4" />

          <h2 className="text-xl font-black text-slate-900">
            Place information is not available
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            Please go back and select a tourist place.
          </p>

          <button
            onClick={() => setActiveTab('places')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Places
          </button>

        </div>

      </div>
    );
  }


  const currentPlace = place;


  // ============================================================
  // REAL SAFE TRIP DATA
  // ============================================================

 const reviews = Array.isArray(currentPlace.reviews)
  ? currentPlace.reviews
  : [];

const verifiedIncidents = incidents.filter(
  (incident) => incident.status === 'Verified'
);

const pendingIncidents = incidents.filter(
  (incident) => incident.status === 'Pending'
);

const rating =
  currentPlace.rating !== null &&
  currentPlace.rating !== undefined
    ? currentPlace.rating
    : null;

const reviewCount =
  currentPlace.review_count !== null &&
  currentPlace.review_count !== undefined
    ? currentPlace.review_count
    : reviews.length;

  // ============================================================
  // VERIFIED / REAL PLACE INFORMATION
  // ============================================================

  const openingHours =
  typeof currentPlace.opening_hours === "string" &&
  currentPlace.opening_hours.trim()
    ? currentPlace.opening_hours.trim()
    : "Hours vary by destination. Please verify locally before visiting.";

const entryFee =
  typeof currentPlace.fee === "string" &&
  currentPlace.fee.trim()
    ? currentPlace.fee.trim()
    : "Entry charges may vary. Check with the destination before visiting.";

  const description =
  typeof currentPlace.description === "string" &&
  currentPlace.description.trim()
    ? currentPlace.description.trim()
    : `Discover ${currentPlace.name} with SafeTrip Karnataka. Explore its location, check available visitor information, review community safety reports, and plan your journey with confidence.`;
      const category =
    currentPlace.category &&
    currentPlace.category.trim()
      ? currentPlace.category
      : 'Tourist Place';


  // ============================================================
  // ADDRESS FORMAT
  // ============================================================

  const rawAddress =
    currentPlace.address &&
    currentPlace.address.trim()
      ? currentPlace.address.trim()
      : 'Location details not available';


  const formatAddress = (value) => {

    if (!value || value === 'Location details not available') {
      return {
        line1: 'Location details not available',
        line2: currentPlace.district_name
          ? `${currentPlace.district_name}, Karnataka, India`
          : 'Karnataka, India'
      };
    }


    const parts = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);


    const districtName =
      currentPlace.district_name &&
      currentPlace.district_name.trim()
        ? currentPlace.district_name.trim()
        : '';


    if (parts.length === 1) {

      return {
        line1: parts[0],
        line2: districtName
          ? `${districtName}, Karnataka, India`
          : 'Karnataka, India'
      };

    }


    const firstLine = parts
      .slice(0, -1)
      .join(', ');


    const lastPart = parts[parts.length - 1];


    const city =
      districtName ||
      lastPart.charAt(0).toUpperCase() +
        lastPart.slice(1);


    return {
      line1: firstLine || lastPart,
      line2: `${city}, Karnataka, India`
    };
  };


  const formattedAddress = formatAddress(rawAddress);


  // ============================================================
  // HANDLERS
  // ============================================================

  const handleBack = () => {
    setActiveTab('places');
  };


  
const handleRoute = () => {
  if (onOpenRoute) {
    onOpenRoute(place);
  } else {
    setActiveTab('route');
  }
};



  // ============================================================
  // UI
  // ============================================================

  return (

    <div className="max-w-7xl mx-auto pb-16">


      {/* ========================================================
          BACK BUTTON
      ======================================================== */}

      <div className="mb-5">

        <button
          onClick={handleBack}
          className="
            inline-flex items-center gap-2
            px-5 py-2.5
            bg-white
            border border-slate-200
            rounded-xl
            text-sm font-bold
            text-slate-700
            hover:bg-slate-50
            hover:border-teal-300
            transition-all
            shadow-sm
          "
        >

          <ArrowLeft className="w-4 h-4" />

          Back to Places

        </button>

      </div>



      
      
      {/* HERO SECTION */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Destination photo gallery */}
        <div className="relative h-[220px] sm:h-[300px] md:h-[380px] bg-slate-100">
          {communityPhotos.length > 0 ? (
            <img
              src={
                communityPhotos[0].image_url ||
                communityPhotos[0].image
              }
              alt={currentPlace.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
              <ImageIcon className="h-14 w-14" />
              <p className="text-sm font-medium">
                No destination photos available
              </p>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

          <button
            type="button"
            onClick={handleBack}
            className="absolute left-4 top-4 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-md hover:bg-slate-50"
          >
            <ArrowLeft className="mr-2 inline h-4 w-4" />
            Back to Explore Places
          </button>

          <button
            type="button"
            onClick={() => setSubTab("photos")}
            className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-md hover:bg-slate-50"
          >
            <ImageIcon className="h-4 w-4" />
            View Photos ({communityPhotos.length})
          </button>
        </div>

        {/* Place details */}
        <div className="p-5 sm:p-7">

          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
            {category}
          </span>

          <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="min-w-0">
              <h1 className="break-words text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {currentPlace.name}
              </h1>

              <p className="mt-3 flex items-start gap-2 text-sm font-medium text-slate-600">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                <span>
                  {formattedAddress.line1}
                  {formattedAddress.line2
                    ? `, ${formattedAddress.line2}`
                    : ""}
                </span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
              <div>
                <p className="font-black text-slate-900">
                  {rating !== null ? rating : "Not rated"}
                </p>
                <p className="text-xs text-slate-500">
                  {reviewCount} reviews
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 max-w-4xl text-sm leading-6 text-slate-600">
            {description}
          </p>

        </div>
      </section>



      {/* ========================================================
          TABS
      ======================================================== */}

      <div
        className="
          mt-5
          bg-white
          border
          border-slate-200
          rounded-2xl
          shadow-sm
          p-2
          flex
          flex-wrap
          gap-2
        "
      >

        <button
          onClick={() => setSubTab('overview')}
          className={`
            flex
            items-center
            gap-2
            px-6
            py-3
            rounded-xl
            text-sm
            font-bold
            transition-all
            ${
              activeTab === 'overview'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }
          `}
        >

          <Info className="w-4 h-4" />

          Overview

        </button>


        <button
          onClick={() => setSubTab('safety')}
          className={`
            flex
            items-center
            gap-2
            px-6
            py-3
            rounded-xl
            text-sm
            font-bold
            transition-all
            ${
              activeTab === 'safety'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }
          `}
        >

          <ShieldCheck className="w-4 h-4" />

          Safety & Incidents

        </button>


        <button
          onClick={() => setSubTab('reviews')}
          className={`
            flex
            items-center
            gap-2
            px-6
            py-3
            rounded-xl
            text-sm
            font-bold
            transition-all
            ${
              activeTab === 'reviews'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }
          `}
        >

          <Star className="w-4 h-4" />

          Reviews

        </button>


        <button
          onClick={() => setSubTab('photos')}
          className={`
            flex
            items-center
            gap-2
            px-6
            py-3
            rounded-xl
            text-sm
            font-bold
            transition-all
            ${
              activeTab === 'photos'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }
          `}
        >

          <ImageIcon className="w-4 h-4" />

          Photos

        </button>

      </div>



      {/* ========================================================
          MAIN TWO COLUMN AREA
      ======================================================== */}

      {activeTab === 'overview' && (

        <div
          className="
            grid
            grid-cols-1
            lg:grid-cols-3
            gap-6
            mt-6
          "
        >


          {/* ====================================================
              LEFT CONTENT
          ==================================================== */}

          <div className="lg:col-span-2 space-y-6">


            {/* ABOUT */}

            <section
              className="
                bg-white
                rounded-[28px]
                border
                border-slate-200
                shadow-sm
                p-7
              "
            >

              <div className="flex items-start gap-4 mb-6">

                <div
                  className="
                    w-12
                    h-12
                    rounded-2xl
                    bg-teal-50
                    text-teal-700
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                  "
                >

                  <Info className="w-6 h-6" />

                </div>

                <div>

                  <h2 className="text-2xl font-black text-slate-900">
                    About This Place
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Information collected from available place data
                  </p>

                </div>

              </div>


              <p
                className="
                  text-slate-600
                  leading-7
                  text-[15px]
                "
              >
                {description}
              </p>


              
<div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

  {/* Opening Hours */}
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50">
        <Clock className="h-5 w-5 text-teal-700" />
      </div>
      <p className="text-xs font-bold uppercase text-slate-600">
        Opening Hours
      </p>
    </div>

    <p className="mt-3 text-sm font-black leading-5 text-slate-900">
      {openingHours}
    </p>

    <p className="mt-2 text-xs leading-5 text-slate-500">
      {currentPlace.opening_hours
        ? "Hours listed for this destination"
        : "Hours not confirmed — check before visiting"}
    </p>
  </div>

  {/* Entry Fee */}
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
        <DollarSign className="h-5 w-5 text-amber-600" />
      </div>
      <p className="text-xs font-bold uppercase text-slate-600">
        Entry Fee
      </p>
    </div>

    <p className="mt-3 text-sm font-black leading-5 text-slate-900">
      {entryFee}
    </p>

    <p className="mt-2 text-xs leading-5 text-slate-500">
      {currentPlace.fee
        ? "Fee information available"
        : "Fee not confirmed — check before visiting"}
    </p>
  </div>

  {/* Coordinates */}
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
        <MapPin className="h-5 w-5 text-emerald-600" />
      </div>
      <p className="text-xs font-bold uppercase text-slate-600">
        Coordinates
      </p>
    </div>

    <p className="mt-3 break-words text-sm font-black leading-5 text-slate-900">
      {currentPlace.latitude != null &&
      currentPlace.latitude !== "" &&
      currentPlace.longitude != null &&
      currentPlace.longitude !== ""
        ? `${Number(currentPlace.latitude).toFixed(5)}°, ${Number(currentPlace.longitude).toFixed(5)}°`
        : "Coordinates unavailable"}
    </p>

    <p className="mt-2 text-xs leading-5 text-slate-500">
      Destination location
    </p>
  </div>

  {/* Category */}
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
        <Tag className="h-5 w-5 text-purple-600" />
      </div>
      <p className="text-xs font-bold uppercase text-slate-600">
        Category
      </p>
    </div>

    <p className="mt-3 break-words text-sm font-black leading-5 capitalize text-slate-900">
      {category.replaceAll("_", " ")}
    </p>

    <p className="mt-2 text-xs leading-5 text-slate-500">
      Destination type
    </p>
  </div>

</div>


            </section>



            {/* LOCATION */}

            <section
              className="
                bg-white
                rounded-[28px]
                border
                border-slate-200
                shadow-sm
                p-7
              "
            >

              <div className="flex items-center gap-3 mb-5">

                <div
                  className="
                    w-11
                    h-11
                    rounded-xl
                    bg-teal-50
                    flex
                    items-center
                    justify-center
                  "
                >

                  <MapPin className="w-5 h-5 text-teal-700" />

                </div>

                <div>

                  <h2 className="text-xl font-black text-slate-900">
                    Location
                  </h2>

                  <p className="text-xs text-slate-500">
                    Place location from OpenStreetMap data
                  </p>

                </div>

              </div>


              <div
                className="
                  rounded-2xl
                  bg-slate-50
                  border
                  border-slate-200
                  p-5
                  flex
                  flex-col
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                  gap-4
                "
              >

                <div>

                  <p className="text-base font-black text-slate-900">
                    {formattedAddress.line1}
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    {formattedAddress.line2}
                  </p>

                </div>


                {currentPlace.latitude != null &&
 currentPlace.longitude != null &&
 currentPlace.latitude !== "" &&
 currentPlace.longitude !== "" ? (
  <a
    href={`https://www.openstreetmap.org/?mlat=${currentPlace.latitude}&mlon=${currentPlace.longitude}#map=17/${currentPlace.latitude}/${currentPlace.longitude}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-teal-300 hover:text-teal-700 transition-all"
  >
    <Map className="w-4 h-4" />
    View on Map
  </a>
) : (
  <span className="text-sm text-slate-500">
    Map coordinates are unavailable
  </span>
)}

              </div>

            </section>



            {/* PHOTOS PREVIEW */}

            <section
              className="
                bg-white
                rounded-[28px]
                border
                border-slate-200
                shadow-sm
                p-7
              "
            >

              <div className="flex items-center justify-between mb-5">

                <div className="flex items-center gap-3">

                  <div
                    className="
                      w-11
                      h-11
                      rounded-xl
                      bg-slate-100
                      flex
                      items-center
                      justify-center
                    "
                  >

                    <ImageIcon className="w-5 h-5 text-slate-700" />

                  </div>

                  <div>

                    <h2 className="text-xl font-black text-slate-900">
                      Photos
                    </h2>

                    <p className="text-xs text-slate-500">
                      Photos shared by SafeTrip travelers
                    </p>

                  </div>

                </div>

                <button
                  onClick={() => setSubTab('photos')}
                  className="
                    text-sm
                    font-bold
                    text-teal-700
                    hover:text-teal-800
                  "
                >
                  View All
                </button>

              </div>


              
{/* COMMUNITY PHOTOS PREVIEW */}
{communityPhotos.length > 0 ? (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    {communityPhotos.slice(0, 3).map((photo) => (
      <div
        key={photo.id}
        className="overflow-hidden rounded-2xl border border-slate-200"
      >
        <img
          src={photo.image_url || photo.image}
          alt={photo.caption || "Traveler photo"}
          loading="lazy"
          className="h-44 w-full bg-slate-100 object-cover"
        />
        <div className="p-3">
  <p className="text-sm text-slate-600">
    {photo.caption || "Shared by a traveler"}
  </p>

  {/* <button
    type="button"
    onClick={() => deletePlacePhoto(photo.id)}
    disabled={communityLoading}
    className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
  >
    Delete Photo
  </button> */}
</div>
      </div>
    ))}
  </div>
) : (
  <div className="min-h-[180px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center p-6">
    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4">
      <ImageIcon className="w-7 h-7 text-slate-400" />
    </div>

    <h3 className="text-base font-black text-slate-800">
      No community photos yet
    </h3>

    <p className="text-sm text-slate-500 mt-1 max-w-md">
      Photos uploaded by SafeTrip travelers will appear here.
    </p>
  </div>
)}


            </section>

          </div>



          {/* ====================================================
              RIGHT SIDEBAR
          ==================================================== */}

          <div className="space-y-6">


            {/* COMMUNITY REPORTS */}

            <section
              className="
                bg-white
                rounded-[28px]
                border
                border-slate-200
                shadow-sm
                p-6
              "
            >

              <div className="flex items-start gap-3 mb-6">

                <div
                  className="
                    w-12
                    h-12
                    rounded-2xl
                    bg-teal-600
                    text-white
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                  "
                >

                  <ShieldCheck className="w-6 h-6" />

                </div>

                <div>

                  <h2 className="text-xl font-black text-slate-900">
                    SafeTrip Community Reports
                  </h2>

                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Real experiences from travelers help create safer journeys.
                  </p>

                </div>

              </div>



              {/* Incident counters */}

              <div className="grid grid-cols-2 gap-3">


                <div
                  className="
                    rounded-2xl
                    bg-red-50
                    border
                    border-red-100
                    p-4
                  "
                >

                  <AlertTriangle className="w-6 h-6 text-red-500 mb-3" />

                  <p className="text-3xl font-black text-red-600">
                    {verifiedIncidents.length}
                  </p>

                  <p className="text-xs font-bold text-red-700 mt-1">
                    Verified Incidents
                  </p>

                </div>



                <div
                  className="
                    rounded-2xl
                    bg-amber-50
                    border
                    border-amber-100
                    p-4
                  "
                >

                  <Clock className="w-6 h-6 text-amber-500 mb-3" />

                  <p className="text-3xl font-black text-amber-600">
                    {pendingIncidents.length}
                  </p>

                  <p className="text-xs font-bold text-amber-700 mt-1">
                    Pending Reports
                  </p>

                </div>

              </div>



              {/* Report status */}

              <div
                className="
                  mt-4
                  rounded-2xl
                  bg-slate-50
                  border
                  border-slate-200
                  p-5
                "
              >

                {incidents.length === 0 ? (

                  <div className="text-center">

                    <CheckCircle2
                      className="
                        w-12
                        h-12
                        mx-auto
                        text-slate-300
                        mb-3
                      "
                    />

                    <h3 className="text-base font-black text-slate-800">
                      No community reports yet
                    </h3>

                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Be the first to share a safety experience for this place.
                      Your report can help future travelers.
                    </p>

                  </div>

                ) : (

                  <div>

                    <h3 className="text-sm font-black text-slate-900 mb-3">
                      Recent Reports
                    </h3>

                    <div className="space-y-3">

                      {incidents.slice(0, 3).map((incident) => (

                        <div
                          key={incident.id}
                          className="
                            p-3
                            rounded-xl
                            bg-white
                            border
                            border-slate-200
                          "
                        >

                          <div className="flex gap-2">

                            <AlertTriangle
                              className={`
                                w-4
                                h-4
                                mt-0.5
                                flex-shrink-0
                                ${
                                  incident.severity === 'High'
                                    ? 'text-red-600'
                                    : incident.severity === 'Medium'
                                    ? 'text-amber-600'
                                    : 'text-slate-500'
                                }
                              `}
                            />

                            <div>

                              <p className="text-xs font-bold text-slate-900">
                                {incident.title}
                              </p>

                              <p className="text-[11px] text-slate-500 mt-1">
                                {incident.incident_type}
                              </p>

                              <div className="flex gap-2 mt-2">

                                <span
                                  className="
                                    text-[9px]
                                    font-bold
                                    px-2
                                    py-1
                                    rounded-full
                                    bg-slate-100
                                    text-slate-600
                                  "
                                >
                                  {incident.status}
                                </span>

                                <span
                                  className="
                                    text-[9px]
                                    font-bold
                                    px-2
                                    py-1
                                    rounded-full
                                    bg-slate-100
                                    text-slate-600
                                  "
                                >
                                  {incident.severity}
                                </span>

                              </div>

                            </div>

                          </div>

                        </div>

                      ))}

                    </div>

                  </div>

                )}

              </div>

            </section>



            {/* CHECK ROUTES
                KEEPING THIS WORKING BUTTON
            */}

            <section
              className="
                rounded-[28px]
                overflow-hidden
                bg-gradient-to-r
                from-teal-700
                to-teal-500
                shadow-lg
              "
            >

              <div className="p-6 text-white">

                <div
                  className="
                    w-12
                    h-12
                    rounded-2xl
                    bg-white/15
                    flex
                    items-center
                    justify-center
                    mb-4
                  "
                >

                  <Navigation className="w-6 h-6" />

                </div>

                <h2 className="text-xl font-black">
                  Check Routes To This Place
                </h2>

                <p className="text-sm text-white/80 mt-2 leading-relaxed">
                  Find routes and compare available SafeTrip route information.
                </p>


                <button
                  onClick={handleRoute}
                  className="
                    mt-5
                    w-full
                    py-3.5
                    rounded-xl
                    bg-white
                    text-teal-700
                    font-black
                    text-sm
                    shadow-md
                    hover:bg-slate-50
                    transition-all
                    flex
                    items-center
                    justify-center
                    gap-2
                  "
                >

                  <Navigation className="w-4 h-4" />

                  Check Routes To This Place

                </button>

              </div>

            </section>



            {/* QUICK TIPS */}

            <section
              className="
                bg-white
                rounded-[28px]
                border
                border-slate-200
                shadow-sm
                p-6
              "
            >

              <div className="flex items-center gap-3 mb-5">

                <div
                  className="
                    w-11
                    h-11
                    rounded-xl
                    bg-amber-50
                    flex
                    items-center
                    justify-center
                  "
                >

                  <Info className="w-5 h-5 text-amber-600" />

                </div>

                <div>

                  <h2 className="text-lg font-black text-slate-900">
                    Visit Information
                  </h2>

                  <p className="text-xs text-slate-500">
                    Useful reminders for travelers
                  </p>

                </div>

              </div>


              <div className="space-y-4">

                <div className="flex items-start gap-3">

                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />

                  <p className="text-sm text-slate-600">
                    Check available place information before your visit.
                  </p>

                </div>


                <div className="flex items-start gap-3">

                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />

                  <p className="text-sm text-slate-600">
                    Review community safety reports when available.
                  </p>

                </div>


                <div className="flex items-start gap-3">

                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />

                  <p className="text-sm text-slate-600">
                    Use SafeTrip route information before starting your journey.
                  </p>

                </div>

              </div>

            </section>

          </div>

        </div>

      )}



      {/* ========================================================
          SAFETY TAB
      ======================================================== */}

      {activeTab === 'safety' && (
  <section className="mt-6">
    <div className="mb-6">
      <h2 className="text-2xl font-black text-slate-900">
        Safety & Incidents
      </h2>
      <p className="text-sm text-slate-500 mt-1">
        Community safety reports and traveler contributions for {currentPlace.name}
      </p>
    </div>

    {communityError && (
      <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
        {communityError}
      </p>
    )}

    {communitySuccess && (
      <p className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
        {communitySuccess}
      </p>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* LEFT: INCIDENT REPORTS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">
          Community Incident Reports
        </h3>

        {incidentLoading ? (
          <p className="text-sm text-slate-500">Loading incidents...</p>
        ) : incidents.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <h4 className="font-bold text-slate-800">
              No incidents reported yet
            </h4>
            <p className="mt-2 text-sm text-slate-500">
              There are currently no incident reports linked to this place.
              This does not guarantee that the place is completely safe.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <article
                key={incident.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-red-600" />

                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-slate-900">
                      {incident.title}
                    </h4>

                    <p className="mt-1 text-xs text-slate-500">
                      {incident.incident_type}
                    </p>

                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {incident.description}
                    </p>

                    {incident.evidence_photos?.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-sm font-bold text-slate-800">
                          Incident Evidence Photos
                        </p>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {incident.evidence_photos.map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.image_url || photo.image}
                              alt={photo.caption || "Incident evidence"}
                              loading="lazy"
                              className="h-28 w-full rounded-lg object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 font-bold text-slate-700">
                        {incident.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 font-bold text-slate-700">
                        {incident.severity}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 font-bold text-slate-700">
                        {incident.reported_ago}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: SHARE YOUR EXPERIENCE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black text-slate-900">
          Share Your Experience
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Help other travelers with real photos and information.
        </p>

        {/* SELECT CONTRIBUTION TYPE */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
  <button
    type="button"
    onClick={() => setShareType("place")}
    className={`rounded-lg p-3 text-sm font-medium ${
      shareType === "place"
        ? "bg-blue-600 text-white"
        : "bg-gray-100 text-gray-700"
    }`}
  >
    Tourist Place Photo
  </button>

  <button
    type="button"
    onClick={() => setShareType("report")}
    className={`rounded-lg p-3 text-sm font-medium ${
      shareType === "report"
        ? "bg-blue-600 text-white"
        : "bg-gray-100 text-gray-700"
    }`}
  >
    Report New Incident
  </button>

  <button
    type="button"
    onClick={() => setShareType("incident")}
    className={`rounded-lg p-3 text-sm font-medium ${
      shareType === "incident"
        ? "bg-blue-600 text-white"
        : "bg-gray-100 text-gray-700"
    }`}
  >
    Upload Incident Evidence
  </button>
</div>

        {/* PLACE PHOTO UPLOAD */}
        {shareType === "place" && (
          <form onSubmit={uploadPlacePhoto} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Select tourist place photo
              </label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(event) =>
                  setSelectedPhoto(event.target.files?.[0] || null)
                }
                className="block w-full text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Photo caption
              </label>
              <input
                type="text"
                value={photoCaption}
                onChange={(event) => setPhotoCaption(event.target.value)}
                maxLength={250}
                placeholder="Describe your photo"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={communityLoading}
              className="w-full rounded-xl bg-teal-600 px-5 py-3 font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {communityLoading ? "Uploading..." : "Upload Place Photo"}
            </button>
          </form>
        )}

        {/* INCIDENT EVIDENCE UPLOAD */}
        {/* NEW INCIDENT REPORT FORM */}
{shareType === "report" && (
  <form onSubmit={submitIncidentReport} className="space-y-4">

    <div>
      <h3 className="text-lg font-semibold">
        Report a Safety Incident
      </h3>

      <p className="text-sm text-gray-500">
        Reporting for: {place?.name}
      </p>

      <p className="text-sm text-gray-500">
        The selected tourist place and district will be attached automatically.
      </p>
    </div>

    {/* Incident Title */}
    <div>
      <label className="block text-sm font-medium mb-1">
        Incident Title
      </label>

      <input
        type="text"
        value={incidentTitle}
        onChange={(e) => setIncidentTitle(e.target.value)}
        placeholder="Example: Poor lighting near entrance"
        required
        className="w-full border rounded-lg p-3"
      />
    </div>

    {/* Incident Category */}
    <div>
      <label className="block text-sm font-medium mb-1">
        Incident Category
      </label>

      <select
        value={incidentType}
        onChange={(e) => setIncidentType(e.target.value)}
        required
        className="w-full border rounded-lg p-3"
      >
        <option value="">Select incident category</option>
        <option value="Harassment Report">Harassment Report</option>
        <option value="Suspicious Activity">Suspicious Activity</option>
        <option value="Poor Lighting">Poor Lighting</option>
        <option value="Isolated Stretch">Isolated Stretch</option>
        <option value="Road Hazard">Road Hazard</option>
        <option value="Theft / Pickpocketing">Theft / Pickpocketing</option>
        <option value="Physical Assault">Physical Assault</option>
        <option value="Verbal Abuse">Verbal Abuse</option>
        <option value="Stalking">Stalking</option>
        <option value="Unsafe or Isolated Area">Unsafe or Isolated Area</option>
        <option value="Road Accident">Road Accident</option>
        <option value="Emergency / Medical Help">Emergency / Medical Help</option>
        <option value="Other Safety Concern">Other Safety Concern</option>
      </select>
    </div>

    {/* Severity */}
    <div>
      <label className="block text-sm font-medium mb-1">
        Severity
      </label>

      <select
        value={incidentSeverity}
        onChange={(e) => setIncidentSeverity(e.target.value)}
        className="w-full border rounded-lg p-3"
      >
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
      </select>
    </div>

    {/* Description */}
    <div>
      <label className="block text-sm font-medium mb-1">
        Incident Description
      </label>

      <textarea
        value={incidentDescription}
        onChange={(e) => setIncidentDescription(e.target.value)}
        placeholder="Describe what happened and where..."
        rows={4}
        required
        className="w-full border rounded-lg p-3"
      />
    </div>

    {/* Submit */}
    <button
      type="submit"
      disabled={communityLoading}
      className="w-full bg-blue-600 text-white rounded-lg p-3 font-semibold disabled:opacity-50"
    >
      {communityLoading ? "Submitting..." : "Submit Incident Report"}
    </button>

  </form>
)}
        {shareType === "incident" && (
          <form onSubmit={uploadIncidentEvidence} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Select reported incident
              </label>

              <select
                value={selectedIncidentId}
                onChange={(event) => setSelectedIncidentId(event.target.value)}
                required
                disabled={incidents.length === 0}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm"
              >
                <option value="">Choose an incident</option>
                {incidents.map((incident) => (
                  <option key={incident.id} value={incident.id}>
                    {incident.title}
                  </option>
                ))}
              </select>

              {incidents.length === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  No incidents are available for this place yet.
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Select evidence photos
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                required
                onChange={(event) =>
                  setEvidenceFiles(Array.from(event.target.files || []))
                }
                className="block w-full text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                You can select multiple images.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Caption (optional)
              </label>
              <input
                type="text"
                value={evidenceCaption}
                onChange={(event) => setEvidenceCaption(event.target.value)}
                maxLength={250}
                placeholder="Describe the evidence"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={communityLoading || incidents.length === 0}
              className="w-full rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {communityLoading ? "Uploading..." : "Upload Incident Evidence"}
            </button>
          </form>
        )}
      </div>
    </div>

    {/* RECENT PLACE PHOTOS */}
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-black text-slate-900">
        Recent Community Photos
      </h3>

      {communityPhotos.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No tourist place photos have been shared yet.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {communityPhotos.slice(0, 8).map((photo) => (
            <img
              key={photo.id}
              src={photo.image_url || photo.image}
              alt={photo.caption || "Community photo"}
              loading="lazy"
              className="h-36 w-full rounded-xl border border-slate-200 object-cover"
            />
          ))}
        </div>
      )}
    </div>
  </section>
)}



      {/* ========================================================
          REVIEWS TAB
      ======================================================== */}

      
  {activeTab === 'reviews' && (
    <section className="mt-6 bg-white rounded-[28px] border border-slate-200 shadow-sm p-7">
      <div className="flex items-center gap-3 mb-6">
        <Star className="w-7 h-7 text-amber-500" />
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Traveler Reviews
          </h2>
          <p className="text-sm text-slate-500">
            Share your real experience with other travelers.
          </p>
        </div>
      </div>

      {communityError && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {communityError}
        </p>
      )}

      {communitySuccess && (
        <p className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
          {communitySuccess}
        </p>
      )}

      <form
        onSubmit={submitReview}
        className="mb-8 rounded-2xl border border-slate-200 p-5"
      >
        <label className="block text-sm font-bold mb-2">
          Your rating
        </label>

        <select
          value={reviewRating}
          onChange={(event) => setReviewRating(Number(event.target.value))}
          className="mb-4 w-full rounded-xl border border-slate-300 p-3"
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} star{value !== 1 ? "s" : ""}
            </option>
          ))}
        </select>

        <label className="block text-sm font-bold mb-2">
          Your review
        </label>

        <textarea
          value={reviewComment}
          onChange={(event) => setReviewComment(event.target.value)}
          required
          maxLength={5000}
          rows={4}
          placeholder="How was your visit?"
          className="mb-4 w-full rounded-xl border border-slate-300 p-3"
        />

        <button
          type="submit"
          disabled={communityLoading}
          className="rounded-xl bg-teal-600 px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {communityLoading ? "Submitting..." : "Submit Review"}
        </button>
      </form>

      <h3 className="mb-4 text-lg font-black text-slate-900">
        Reviews from travelers ({communityReviews.length})
      </h3>

      {communityReviews.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-bold text-slate-800">
            No community reviews yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Be the first to share your experience.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {communityReviews.map((review, index) => (
            <article
              key={review.id || index}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 font-black text-teal-700">
                  {(review.user_name || review.username || "T")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <p className="font-black text-slate-900">
                    {review.user_name || review.username || "Traveler"}
                  </p>

                  <div className="flex items-center gap-1">
                    {Array.from({
                      length: Number(review.rating || 0)
                    }).map((_, index) => (
                      <Star
                        key={index}
                        className="h-4 w-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
  {review.comment}
</p>

<button
  type="button"
  onClick={() => deleteReview(review.id)}
  disabled={communityLoading}
  className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
>
  Delete Review
</button>
            </article>
          ))}
        </div>
      )}
    </section>
  )}


      {/* ========================================================
          PHOTOS TAB
          REAL PHOTOS ONLY
          NO UNSPLASH
          NO FAKE SUNSET IMAGES
      ======================================================== */}

      
  {activeTab === 'photos' && (
    <section className="mt-6 bg-white rounded-[28px] border border-slate-200 shadow-sm p-7">
      <div className="flex items-center gap-3 mb-6">
        <ImageIcon className="h-7 w-7 text-teal-600" />
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Community Photos
          </h2>
          <p className="text-sm text-slate-500">
            Real photos shared by SafeTrip travelers.
          </p>
        </div>
      </div>

      {communityError && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {communityError}
        </p>
      )}

      {communitySuccess && (
        <p className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">
          {communitySuccess}
        </p>
      )}

      <form
        onSubmit={uploadPlacePhoto}
        className="mb-8 rounded-2xl border border-slate-200 p-5"
      >
        <label className="mb-2 block text-sm font-bold">
          Select photo
        </label>

        <input
          type="file"
          accept="image/*"
          required
          onChange={(event) =>
            setSelectedPhoto(event.target.files?.[0] || null)
          }
          className="mb-4 block w-full text-sm"
        />

        <label className="mb-2 block text-sm font-bold">
          Caption (optional)
        </label>

        <input
          type="text"
          value={photoCaption}
          onChange={(event) => setPhotoCaption(event.target.value)}
          maxLength={250}
          placeholder="Describe your photo"
          className="mb-4 w-full rounded-xl border border-slate-300 p-3"
        />

        <button
          type="submit"
          disabled={communityLoading}
          className="rounded-xl bg-teal-600 px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {communityLoading ? "Uploading..." : "Upload Photo"}
        </button>
      </form>

      {communityPhotos.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
          <ImageIcon className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-bold text-slate-800">
            No community photos yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Uploaded photos will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {communityPhotos.map((photo) => (
            <article
              key={photo.id}
              className="overflow-hidden rounded-2xl border border-slate-200"
            >
              <img
                src={photo.image_url || photo.image}
                alt={photo.caption || "Traveler photo"}
                loading="lazy"
                className="h-56 w-full bg-slate-100 object-cover"
              />

              <div className="p-4">
  <p className="text-sm font-bold text-slate-800">
    {photo.caption || "Shared by a traveler"}
  </p>
  <p className="mt-1 text-xs text-slate-500">
    {photo.username || "Traveler"}
  </p>

  <button
    type="button"
    onClick={() => deletePlacePhoto(photo.id)}
    disabled={communityLoading}
    className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
  >
    Delete Photo
  </button>
</div>
            </article>
          ))}
        </div>
      )}
    </section>
  )}


    </div>

  );
}