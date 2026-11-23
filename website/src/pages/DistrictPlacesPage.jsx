

import React, { useEffect, useState } from 'react';

import {

  Star,

  Heart,

  ShieldCheck,

  MapPin,

  ArrowLeft,

  Loader2,

  Image as ImageIcon,

  RefreshCw

} from 'lucide-react';



import { fetchPlaces } from '../services/api';



export default function DistrictPlacesPage({

  setActiveTab,

  setSelectedPlace,

  selectedDistrict = 'Mangaluru'

}) {

  const [selectedCategory, setSelectedCategory] = useState('All');

  const [places, setPlaces] = useState([]);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');

  const [favorites, setFavorites] = useState({});

  const [images, setImages] = useState({});

  const [failedImages, setFailedImages] = useState({});

  const [retryCount, setRetryCount] = useState(0);



  // Treat All as an empty district filter.

  // An empty district asks the API for places from every district.

  const isAllDistricts =

    !selectedDistrict ||

    selectedDistrict.trim().toLowerCase() === 'all';



  const districtLabel = isAllDistricts

    ? 'All Karnataka'

    : selectedDistrict;



  // --------------------------------------------------

  // LOAD PLACES

  // --------------------------------------------------



  useEffect(() => {

    let cancelled = false;



    async function loadPlaces() {

      setLoading(true);

      setErrorMessage('');

      setPlaces([]);

      setImages({});

      setFailedImages({});

      setSelectedCategory('All');



      try {

        const districtFilter = isAllDistricts

          ? ''

          : selectedDistrict;



        const data = await fetchPlaces(districtFilter, 'All');



        if (cancelled) return;



        // Support both normal arrays and paginated DRF responses.

        const results = Array.isArray(data)

          ? data

          : Array.isArray(data?.results)

            ? data.results

            : [];



        setPlaces(results);



        if (!results.length) {

          console.warn(

            `No tourist places returned for ${districtLabel}.`

          );

        }

      } catch (error) {

        if (cancelled) return;



        console.error('Failed to load places:', error);

        setPlaces([]);



        setErrorMessage(

          error?.name === 'AbortError'

            ? 'The places request timed out. Please try again.'

            : 'Unable to load destinations. Check that the Django backend is running.'

        );

      } finally {

        if (!cancelled) {

          setLoading(false);

        }

      }

    }



    loadPlaces();



    return () => {

      cancelled = true;

    };

  }, [selectedDistrict, retryCount, isAllDistricts, districtLabel]);



  // --------------------------------------------------

  // GET AN IMAGE ALREADY PROVIDED BY THE BACKEND

  // --------------------------------------------------



  function getExistingImage(place) {
    const directImage = place.image_url || place.image || place.photo_url;

    if (typeof directImage === 'string' && directImage.trim()) {
      return directImage.trim();
    }

    // Prefer a photo already uploaded by a user for this destination.
    const uploadedPhotos = Array.isArray(place.uploaded_photos)
      ? place.uploaded_photos
      : [];

    const uploadedPhoto = uploadedPhotos.find((photo) => {
      const url = photo?.image_url || photo?.image;
      return typeof url === 'string' && url.trim();
    });

    if (uploadedPhoto) {
      return (uploadedPhoto.image_url || uploadedPhoto.image).trim();
    }

    const commons = place.wikimedia_commons || place.wikimedia_image;
    if (typeof commons !== 'string') return '';

    if (/^https?:\/\//i.test(commons.trim())) return commons.trim();

    if (commons.startsWith('File:')) {
      return 'https://commons.wikimedia.org/wiki/Special:FilePath/' +
        encodeURIComponent(commons.substring(5));
    }

    return '';
  }

  // --------------------------------------------------

  // SEARCH FOR DESTINATION PHOTOS

  // --------------------------------------------------



  useEffect(() => {

    let cancelled = false;



    async function searchPlaceImages() {

      const placesToSearch = places.filter((place) => {
        const id = place.id || place.external_place_id;
        return id && !getExistingImage(place);
      });



      for (const place of placesToSearch) {

        if (cancelled) return;



        const id = place.id || place.external_place_id;



        try {

          const params = new URLSearchParams({

            action: 'query',

            generator: 'search',

            gsrsearch: `\"${place.name}\" ${place.district_name || selectedDistrict || 'Karnataka'} Karnataka`,

            gsrnamespace: '6',

            gsrlimit: '5',

            prop: 'imageinfo',

            iiprop: 'url',

            iiurlwidth: '800',

            format: 'json',

            origin: '*'

          });



          const controller = new AbortController();



          const timeoutId = setTimeout(

            () => controller.abort(),

            8000

          );



          let response;



          try {

            response = await fetch(

              `https://commons.wikimedia.org/w/api.php?${params}`,

              { signal: controller.signal }

            );

          } finally {

            clearTimeout(timeoutId);

          }



          if (!response.ok) {

            throw new Error(`Image search failed: ${response.status}`);

          }



          const result = await response.json();



          const pages = Object.values(

            result.query?.pages || {}

          );



          const nameWords = (place.name || '')

            .toLowerCase()

            .split(/[\s-]+/)

            .filter((word) => word.length >= 3);



          const matchingPage = pages.find((page) => {

            const title = (page.title || '').toLowerCase();

            const info = page.imageinfo?.[0];



            return (

              nameWords.length > 0 &&

              nameWords.some((word) => title.includes(word)) &&

              Boolean(info?.thumburl || info?.url)

            );

          });



          const info = matchingPage?.imageinfo?.[0];

          const imageUrl = info?.thumburl || info?.url;



          if (cancelled) return;



          if (imageUrl) {

            setImages((previous) => ({

              ...previous,

              [id]: imageUrl

            }));

          } else {

            setFailedImages((previous) => ({

              ...previous,

              [id]: true

            }));

          }

        } catch (error) {

          if (cancelled) return;



          console.warn(

            `Could not find a photo for ${place.name}:`,

            error

          );



          setFailedImages((previous) => ({

            ...previous,

            [id]: true

          }));

        }

      }

    }



    if (!loading && places.length > 0) {

      searchPlaceImages();

    }



    return () => {

      cancelled = true;

    };

  }, [places, loading]);



  // --------------------------------------------------

  // CATEGORIES AND FILTERS

  // --------------------------------------------------



  const categories = [

    'All',

    ...Array.from(

      new Set(

        places

          .map((place) => place.category)

          .filter(Boolean)

          .map((category) => category.toLowerCase())

      )

    )

  ];



  const filteredPlaces =

    selectedCategory === 'All'

      ? places

      : places.filter(

          (place) =>

            place.category?.toLowerCase() ===

            selectedCategory.toLowerCase()

        );



  // --------------------------------------------------

  // FAVOURITES

  // --------------------------------------------------



  function toggleFavorite(id) {

    setFavorites((previous) => ({

      ...previous,

      [id]: !previous[id]

    }));

  }



  // --------------------------------------------------

  // IMAGE HANDLING

  // --------------------------------------------------



  function handleImageError(id) {

    setFailedImages((previous) => ({

      ...previous,

      [id]: true

    }));

  }



  function getImageForPlace(place) {

    const id = place.id || place.external_place_id;



    if (failedImages[id]) {

      return '';

    }



    return getExistingImage(place) || images[id] || '';

  }



  // --------------------------------------------------

  // RETRY

  // --------------------------------------------------



  function retryLoading() {

    setRetryCount((count) => count + 1);

  }



  // --------------------------------------------------

  // OPEN PLACE DETAILS

  // --------------------------------------------------



  function openPlace(place) {

    setSelectedPlace(place);

    setActiveTab('details');

  }



  // --------------------------------------------------

  // PAGE

  // --------------------------------------------------



  return (

    <div className="space-y-6 pb-12">



      {/* HEADER */}



      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">



        <div className="flex items-center space-x-3">



          <button

            onClick={() => setActiveTab('home')}

            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900"

            aria-label="Go back"

          >

            <ArrowLeft className="w-5 h-5" />

          </button>



          <div>

            <h1 className="text-2xl font-black text-slate-900">

              Places to Visit in {districtLabel}

            </h1>



            <p className="text-sm text-slate-500 mt-1">

              Discover real tourist destinations across Karnataka

            </p>

          </div>



        </div>



        <span className="text-sm text-slate-500">

          {loading

            ? 'Loading places...'

            : `${filteredPlaces.length} places found`}

        </span>



      </div>



      {/* CATEGORY FILTERS */}



      {!loading && !errorMessage && places.length > 0 && (

        <div className="flex items-center gap-2 overflow-x-auto pb-2">



          {categories.map((category) => (

            <button

              key={category}

              onClick={() => setSelectedCategory(category)}

              className={`px-4 py-2 rounded-full text-xs font-bold flex-shrink-0 transition-all ${

                selectedCategory.toLowerCase() === category.toLowerCase()

                  ? 'bg-teal-600 text-white shadow-md'

                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'

              }`}

            >

              {category === 'All'

                ? 'All'

                : category.replace(/_/g, ' ')}

            </button>

          ))}



        </div>

      )}



      {/* LOADING */}



      {loading && (

        <div className="flex flex-col items-center justify-center py-20">

          <Loader2 className="w-9 h-9 text-teal-600 animate-spin" />



          <p className="mt-3 text-sm text-slate-500">

            Discovering places in {districtLabel}...

          </p>

        </div>

      )}



      {/* ERROR */}



      {!loading && errorMessage && (

        <div className="bg-white border border-amber-200 rounded-2xl p-8 text-center">



          <MapPin className="w-10 h-10 mx-auto text-amber-500" />



          <h3 className="mt-4 font-bold text-slate-800">

            Couldn't load destinations

          </h3>



          <p className="text-sm text-slate-500 mt-2">

            {errorMessage}

          </p>



          <button

            onClick={retryLoading}

            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700"

          >

            <RefreshCw className="w-4 h-4" />

            Try again

          </button>



        </div>

      )}



      {/* EMPTY RESULTS */}



      {!loading &&

        !errorMessage &&

        filteredPlaces.length === 0 && (



          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">



            <MapPin className="w-10 h-10 mx-auto text-slate-300" />



            <h3 className="mt-4 font-bold text-slate-800">

              No places found

            </h3>



            <p className="text-sm text-slate-500 mt-2">

              No matching destinations were returned for {districtLabel}.

            </p>



            <button

              onClick={retryLoading}

              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700"

            >

              <RefreshCw className="w-4 h-4" />

              Reload places

            </button>



          </div>

        )}



      {/* DESTINATION CARDS */}



      {!loading &&

        !errorMessage &&

        filteredPlaces.length > 0 && (



          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">



            {filteredPlaces.map((place) => {

              const id = place.id || place.external_place_id;

              const imageUrl = getImageForPlace(place);



              return (

                <article

                  key={id}

                  onClick={() => openPlace(place)}

                  className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col"

                >



                  {/* DESTINATION IMAGE */}



                  <div className="relative h-56 overflow-hidden bg-gradient-to-br from-teal-50 via-slate-100 to-cyan-100">



                    {imageUrl ? (

                      <img

                        src={imageUrl}

                        alt={place.name}

                        loading="lazy"

                        onError={() => handleImageError(id)}

                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"

                      />

                    ) : (

                      <div className="w-full h-full flex flex-col items-center justify-center text-teal-800">



                        {failedImages[id] ? (

                          <>

                            <ImageIcon className="w-12 h-12 opacity-50" />



                            <span className="mt-3 text-sm font-semibold">

                              Photo not available

                            </span>

                          </>

                        ) : (

                          <>

                            <Loader2 className="w-8 h-8 animate-spin" />



                            <span className="mt-3 text-sm font-semibold">

                              Finding destination photo...

                            </span>

                          </>

                        )}



                      </div>

                    )}



                    {/* FAVOURITE */}



                    <button

                      onClick={(event) => {

                        event.stopPropagation();

                        toggleFavorite(id);

                      }}

                      aria-label={

                        favorites[id]

                          ? 'Remove from favourites'

                          : 'Add to favourites'

                      }

                      className="absolute top-3 right-3 p-2.5 rounded-full bg-white/90 backdrop-blur text-slate-700 hover:text-rose-500 shadow-md transition-colors"

                    >

                      <Heart

                        className={`w-5 h-5 ${

                          favorites[id]

                            ? 'fill-rose-500 text-rose-500'

                            : ''

                        }`}

                      />

                    </button>



                    {/* CATEGORY */}



                    <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-teal-700 text-white font-bold text-[10px] uppercase shadow">

                      {(place.category || 'Attraction').replace(/_/g, ' ')}

                    </span>



                  </div>



                  {/* PLACE DETAILS */}



                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">



                    <div>

                      <h3 className="font-black text-slate-900 text-lg group-hover:text-teal-600 transition-colors">

                        {place.name}

                      </h3>



                      {isAllDistricts && (

                        <p className="text-xs font-semibold text-teal-700 mt-1">

                          {place.district_name ||

                            place.district?.name ||

                            'Karnataka'}

                        </p>

                      )}



                      <p className="text-sm text-slate-500 line-clamp-2 mt-2">

                        {place.description ||

                          'Tourist destination discovered from OpenStreetMap.'}

                      </p>



                      {place.address && (

                        <div className="flex items-start gap-2 mt-3 text-sm text-slate-500">

                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-teal-600" />



                          <span className="line-clamp-2">

                            {place.address}

                          </span>

                        </div>

                      )}

                    </div>



                    {/* RATINGS AND SAFETY */}



                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">



                      <div className="flex items-center gap-1 text-xs font-semibold">



                        {place.rating !== null &&

                        place.rating !== undefined ? (

                          <>

                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />



                            <span className="text-slate-700">

                              {place.rating}

                            </span>



                            {place.review_count !== undefined && (

                              <span className="text-slate-400 font-normal">

                                ({place.review_count})

                              </span>

                            )}

                          </>

                        ) : (

                          <span className="text-slate-400 font-normal">

                            No ratings yet

                          </span>

                        )}



                      </div>



                      <div className="flex items-center gap-1 text-xs font-semibold">



                        <ShieldCheck className="w-4 h-4 text-emerald-600" />



                        {place.safety_index !== null &&

                        place.safety_index !== undefined ? (

                          <span className="text-emerald-600">

                            {place.safety_index}

                          </span>

                        ) : (

                          <span className="text-slate-400">

                            Safety data pending

                          </span>

                        )}



                      </div>



                    </div>



                  </div>



                </article>

              );

            })}



          </div>

        )}



      {/* PHOTO SOURCE NOTE */}



      {!loading &&

        !errorMessage &&

        filteredPlaces.length > 0 && (



          <p className="text-xs text-slate-400 text-center">

            Place information: OpenStreetMap. Additional photos are

            searched on Wikimedia Commons when available.

          </p>

        )}



    </div>

  );

}
